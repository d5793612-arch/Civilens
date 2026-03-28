import { v } from 'convex/values'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'

export const list = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    if (!sessionToken?.trim()) return []

    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', sessionToken.trim()))
      .first()
    if (!session || session.expiresAt < Date.now()) return []

    const rows = await ctx.db
      .query('complaints')
      .withIndex('by_user', (q) => q.eq('userId', session.userId))
      .collect()
    rows.sort((a, b) => b.createdAt - a.createdAt)
    return rows.map((r) => ({
      _id: r._id,
      id: r.complaintId,
      issueType: r.issueType,
      department: r.department,
      status: r.status,
      severity: r.severity,
      escalationLevel: r.escalationLevel ?? 0,
      duplicateOfComplaintId: r.duplicateOfComplaintId,
      createdAt: r.createdAt,
      description: r.description,
      location: r.location,
      issueCategory: r.issueCategory ?? null,
      hasResolutionProof: (r.resolutionProofStorageIds?.length ?? 0) > 0,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
    }))
  },
})

export const analyticsSummary = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', sessionToken.trim()))
      .first()
    if (!session || session.expiresAt < Date.now()) return null

    const uid = session.userId
    const rows = await ctx.db
      .query('complaints')
      .withIndex('by_user', (q) => q.eq('userId', uid))
      .collect()

    const bySeverity: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 }
    let duplicatesFlagged = 0
    let escalated = 0
    let pending = 0
    let resolved = 0
    let inProgress = 0

    const dayBuckets: Record<string, number> = {}
    const now = Date.now()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000)
      const key = d.toISOString().slice(0, 10)
      dayBuckets[key] = 0
    }

    for (const r of rows) {
      const sev = r.severity
      if (sev in bySeverity) bySeverity[sev as keyof typeof bySeverity]++
      else bySeverity.Medium++

      if (r.duplicateOfComplaintId) duplicatesFlagged++
      if ((r.escalationLevel ?? 0) > 0) escalated++

      if (r.status === 'Pending') pending++
      else if (r.status === 'Resolved') resolved++
      else if (r.status === 'In Progress') inProgress++

      const day = new Date(r.createdAt).toISOString().slice(0, 10)
      if (day in dayBuckets) dayBuckets[day]++
    }

    const last7Days = Object.entries(dayBuckets).map(([day, count]) => ({ day, count }))

    return {
      total: rows.length,
      pending,
      resolved,
      inProgress,
      bySeverity,
      duplicatesFlagged,
      escalated,
      last7Days,
    }
  },
})

export const escalateComplaint = mutation({
  args: { sessionToken: v.string(), complaintId: v.string() },
  handler: async (ctx, { sessionToken, complaintId }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', sessionToken.trim()))
      .first()
    if (!session || session.expiresAt < Date.now()) throw new Error('Not signed in')

    const uid = session.userId
    const row = await ctx.db
      .query('complaints')
      .withIndex('by_complaint_id', (q) => q.eq('complaintId', complaintId))
      .first()
    if (!row || row.userId !== uid) throw new Error('Complaint not found')

    const current = row.escalationLevel ?? 0
    if (current >= 2) throw new Error('Already at maximum escalation')

    const next = current + 1
    await ctx.db.patch(row._id, { escalationLevel: next })

    const label = next === 1 ? 'Escalated' : 'Priority escalation'
    await ctx.db.insert('notifications', {
      userId: uid as Id<'users'>,
      title: `${label}: ${complaintId}`,
      body:
        next === 1
          ? 'Your grievance was escalated to a higher queue for faster review.'
          : 'Your grievance was marked priority escalation. Teams have been notified.',
      read: false,
      createdAt: Date.now(),
      kind: 'escalation',
    })
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

export const complaintIdExists = internalQuery({
  args: { complaintId: v.string() },
  handler: async (ctx, { complaintId }) => {
    const row = await ctx.db
      .query('complaints')
      .withIndex('by_complaint_id', (q) => q.eq('complaintId', complaintId))
      .first()
    return row !== null
  },
})

export const insertComplaint = internalMutation({
  args: {
    complaintId: v.string(),
    userId: v.optional(v.id('users')),
    status: v.string(),
    issueType: v.string(),
    department: v.string(),
    departmentRouted: v.optional(v.string()),
    severity: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    imageStorageIds: v.optional(v.array(v.id('_storage'))),
    visionJson: v.optional(v.any()),
    complaintTextEn: v.optional(v.string()),
    complaintTextHi: v.optional(v.string()),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
    duplicateOfComplaintId: v.optional(v.string()),
    duplicateSimilarityScore: v.optional(v.number()),
    escalationLevel: v.optional(v.number()),
    issueCategory: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now()
    return await ctx.db.insert('complaints', {
      ...args,
      createdAt,
    })
  },
})
