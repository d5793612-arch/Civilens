import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'

function dbToApiStatus(s: string): 'submitted' | 'in_progress' | 'resolved' {
  if (s === 'Resolved') return 'resolved'
  if (s === 'In Progress') return 'in_progress'
  return 'submitted'
}

function apiToDbStatus(s: string): string {
  const x = s.toLowerCase().trim().replace(/\s+/g, '_')
  if (x === 'resolved') return 'Resolved'
  if (x === 'in_progress') return 'In Progress'
  if (x === 'submitted' || x === 'pending') return 'Pending'
  throw new Error('Invalid status: use submitted, in_progress, or resolved')
}

function effectiveIssueCategory(r: {
  issueCategory?: string
  category?: string
  issueType: string
}): 'garbage' | 'pothole' | 'water_leak' | 'other' {
  const ic = r.issueCategory
  if (ic === 'garbage' || ic === 'pothole' || ic === 'water_leak' || ic === 'other') {
    return ic
  }
  const c = (r.category ?? '').toLowerCase()
  if (c === 'garbage') return 'garbage'
  if (c === 'pothole') return 'pothole'
  if (c === 'water' || c === 'water_leak') return 'water_leak'
  const t = r.issueType.toLowerCase()
  if (t.includes('pothole') || t.includes('road')) return 'pothole'
  if (t.includes('garbage') || t.includes('trash') || t.includes('waste')) return 'garbage'
  if (t.includes('water') || t.includes('leak')) return 'water_leak'
  return 'other'
}

async function requireOfficerSession(ctx: QueryCtx | MutationCtx, officerToken: string) {
  const s = await ctx.db
    .query('officerSessions')
    .withIndex('by_token', (q) => q.eq('token', officerToken.trim()))
    .first()
  if (!s || s.expiresAt < Date.now()) {
    throw new Error('Officer session expired or invalid')
  }
}

async function urlsForIds(ctx: QueryCtx, ids: Id<'_storage'>[] | undefined): Promise<string[]> {
  if (!ids?.length) return []
  const out: string[] = []
  for (const id of ids) {
    const u = await ctx.storage.getUrl(id)
    if (u) out.push(u)
  }
  return out
}

export const listAll = query({
  args: { officerToken: v.string() },
  handler: async (ctx, { officerToken }) => {
    try {
      await requireOfficerSession(ctx, officerToken)
    } catch {
      return null
    }

    const rows = await ctx.db.query('complaints').withIndex('by_created').collect()
    rows.sort((a, b) => b.createdAt - a.createdAt)

    const list = []
    for (const r of rows) {
      const thumb = r.imageStorageIds?.[0]
      const thumbUrl = thumb ? await ctx.storage.getUrl(thumb) : null
      list.push({
        id: r.complaintId,
        issueType: r.issueType,
        description: r.description ?? '',
        department: r.department,
        status: dbToApiStatus(r.status),
        issueCategory: effectiveIssueCategory(r),
        createdAt: r.createdAt,
        createdAtIso: new Date(r.createdAt).toISOString(),
        thumbnailUrl: thumbUrl,
      })
    }
    return list
  },
})

export const getByComplaintId = query({
  args: { officerToken: v.string(), complaintId: v.string() },
  handler: async (ctx, { officerToken, complaintId }) => {
    try {
      await requireOfficerSession(ctx, officerToken)
    } catch {
      return null
    }

    const r = await ctx.db
      .query('complaints')
      .withIndex('by_complaint_id', (q) => q.eq('complaintId', complaintId.trim()))
      .first()
    if (!r) return null

    const imageUrls = await urlsForIds(ctx, r.imageStorageIds)
    const proofUrls = await urlsForIds(ctx, r.resolutionProofStorageIds)

    return {
      id: r.complaintId,
      issueType: r.issueType,
      description: r.description ?? '',
      department: r.department,
      status: dbToApiStatus(r.status),
      issueCategory: effectiveIssueCategory(r),
      location: r.location ?? null,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      createdAt: r.createdAt,
      createdAtIso: new Date(r.createdAt).toISOString(),
      imageUrls,
      proofUrls,
      officerRemarks: r.officerRemarks ?? [],
      severity: r.severity,
    }
  },
})

export const updateComplaintStatus = mutation({
  args: {
    officerToken: v.string(),
    complaintId: v.string(),
    status: v.string(),
    remark: v.optional(v.string()),
  },
  handler: async (ctx, { officerToken, complaintId, status, remark }) => {
    await requireOfficerSession(ctx, officerToken)

    const row = await ctx.db
      .query('complaints')
      .withIndex('by_complaint_id', (q) => q.eq('complaintId', complaintId.trim()))
      .first()
    if (!row) throw new Error('Complaint not found')

    const nextStatus = apiToDbStatus(status)
    const nextRemarks =
      remark?.trim()
        ? [...(row.officerRemarks ?? []), { at: Date.now(), text: remark.trim() }]
        : undefined

    if (nextRemarks) {
      await ctx.db.patch(row._id, { status: nextStatus, officerRemarks: nextRemarks })
    } else {
      await ctx.db.patch(row._id, { status: nextStatus })
    }

    if (row.userId) {
      const statusLabel =
        nextStatus === 'Resolved' ? 'resolved' : nextStatus === 'In Progress' ? 'in progress' : 'pending review'
      let body = `Your grievance ${complaintId} is now ${statusLabel}.`
      if (remark?.trim()) body += ` Note from field office: ${remark.trim()}`

      await ctx.db.insert('notifications', {
        userId: row.userId,
        title: `Update: ${complaintId}`,
        body,
        read: false,
        createdAt: Date.now(),
        kind: 'officer_status',
      })
    }

    return { ok: true as const, status: dbToApiStatus(nextStatus) }
  },
})

export const addOfficerRemark = mutation({
  args: { officerToken: v.string(), complaintId: v.string(), text: v.string() },
  handler: async (ctx, { officerToken, complaintId, text }) => {
    await requireOfficerSession(ctx, officerToken)

    const row = await ctx.db
      .query('complaints')
      .withIndex('by_complaint_id', (q) => q.eq('complaintId', complaintId.trim()))
      .first()
    if (!row) throw new Error('Complaint not found')

    const t = text.trim()
    if (!t) throw new Error('Remark cannot be empty')

    const prev = row.officerRemarks ?? []
    await ctx.db.patch(row._id, {
      officerRemarks: [...prev, { at: Date.now(), text: t }],
    })

    if (row.userId) {
      await ctx.db.insert('notifications', {
        userId: row.userId,
        title: `Note on ${complaintId}`,
        body: `An officer added a remark: ${t}`,
        read: false,
        createdAt: Date.now(),
        kind: 'officer_remark',
      })
    }

    return { ok: true as const }
  },
})

export const addResolutionProof = mutation({
  args: {
    officerToken: v.string(),
    complaintId: v.string(),
    storageId: v.id('_storage'),
  },
  handler: async (ctx, { officerToken, complaintId, storageId }) => {
    await requireOfficerSession(ctx, officerToken)

    const row = await ctx.db
      .query('complaints')
      .withIndex('by_complaint_id', (q) => q.eq('complaintId', complaintId.trim()))
      .first()
    if (!row) throw new Error('Complaint not found')

    const prev = row.resolutionProofStorageIds ?? []
    await ctx.db.patch(row._id, {
      resolutionProofStorageIds: [...prev, storageId],
    })

    if (row.userId) {
      await ctx.db.insert('notifications', {
        userId: row.userId,
        title: `Resolution proof: ${complaintId}`,
        body: 'An officer uploaded resolution documentation for your grievance.',
        read: false,
        createdAt: Date.now(),
        kind: 'officer_proof',
      })
    }

    return { ok: true as const }
  },
})

export const generateOfficerUploadUrl = mutation({
  args: { officerToken: v.string() },
  handler: async (ctx, { officerToken }) => {
    await requireOfficerSession(ctx, officerToken)
    return await ctx.storage.generateUploadUrl()
  },
})
