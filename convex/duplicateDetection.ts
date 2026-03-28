import { v } from 'convex/values'
import { internalQuery } from './_generated/server'

const WINDOW_MS = 14 * 24 * 60 * 60 * 1000

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

function jaccard(a: string, b: string): number {
  const A = new Set(tokenize(a))
  const B = new Set(tokenize(b))
  if (A.size === 0 && B.size === 0) return 1
  let inter = 0
  for (const x of A) {
    if (B.has(x)) inter++
  }
  const union = A.size + B.size - inter
  return union ? inter / union : 0
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toR = (d: number) => (d * Math.PI) / 180
  const dLat = toR(lat2 - lat1)
  const dLng = toR(lng2 - lng1)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)))
}

export const findDuplicateMatch = internalQuery({
  args: {
    userId: v.id('users'),
    issueType: v.string(),
    description: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - WINDOW_MS
    const rows = await ctx.db
      .query('complaints')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect()

    const combinedNew = `${args.issueType}\n${args.description}`
    let best: { complaintId: string; score: number } | null = null

    for (const r of rows) {
      if (r.createdAt < cutoff) continue
      const combinedOld = `${r.issueType}\n${r.description ?? ''}`
      let score = jaccard(combinedNew, combinedOld)
      const titleMatch =
        args.issueType.trim().toLowerCase() === r.issueType.trim().toLowerCase() ? 0.15 : 0
      score += titleMatch

      if (
        args.lat !== undefined &&
        args.lng !== undefined &&
        r.lat !== undefined &&
        r.lng !== undefined
      ) {
        const dist = haversineM(args.lat, args.lng, r.lat, r.lng)
        if (dist < 150) score += 0.35
        else if (dist < 400) score += 0.15
      }

      if (!best || score > best.score) {
        best = { complaintId: r.complaintId, score }
      }
    }

    if (!best) return null
    if (best.score < 0.42) return null
    return { complaintId: best.complaintId, score: Math.min(1, best.score) }
  },
})
