import { v } from 'convex/values'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'

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
    }))
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
    imageStorageIds: v.optional(v.array(v.id('_storage'))),
    visionJson: v.optional(v.any()),
    complaintTextEn: v.optional(v.string()),
    complaintTextHi: v.optional(v.string()),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now()
    return await ctx.db.insert('complaints', {
      ...args,
      createdAt,
    })
  },
})
