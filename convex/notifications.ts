import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'

export const listForUser = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', sessionToken.trim()))
      .first()
    if (!session || session.expiresAt < Date.now()) return []

    const rows = await ctx.db
      .query('notifications')
      .withIndex('by_user_created', (q) => q.eq('userId', session.userId))
      .collect()
    rows.sort((a, b) => b.createdAt - a.createdAt)
    const slice = rows.slice(0, limit ?? 40)

    return slice.map((r) => ({
      _id: r._id,
      title: r.title,
      body: r.body,
      read: r.read,
      createdAt: r.createdAt,
      kind: r.kind,
    }))
  },
})

export const markRead = mutation({
  args: { sessionToken: v.string(), notificationId: v.id('notifications') },
  handler: async (ctx, { sessionToken, notificationId }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', sessionToken.trim()))
      .first()
    if (!session || session.expiresAt < Date.now()) return
    const n = await ctx.db.get(notificationId)
    if (!n || n.userId !== session.userId) return
    await ctx.db.patch(notificationId, { read: true })
  },
})

export const markAllRead = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', sessionToken.trim()))
      .first()
    if (!session || session.expiresAt < Date.now()) return
    const rows = await ctx.db
      .query('notifications')
      .withIndex('by_user_read', (q) => q.eq('userId', session.userId).eq('read', false))
      .collect()
    for (const r of rows) {
      await ctx.db.patch(r._id, { read: true })
    }
  },
})

export const createForUser = internalMutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    body: v.string(),
    kind: v.optional(v.string()),
  },
  handler: async (ctx, { userId, title, body, kind }) => {
    await ctx.db.insert('notifications', {
      userId,
      title,
      body,
      read: false,
      createdAt: Date.now(),
      kind: kind ?? 'general',
    })
  },
})
