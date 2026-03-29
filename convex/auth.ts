import { v } from 'convex/values'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'

/** Used from Node actions; avoids importing `api` in authActions (TS circular inference). */
export const emailTakenInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const u = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email.toLowerCase().trim()))
      .first()
    return u !== null
  },
})

export const emailTaken = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const u = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email.toLowerCase().trim()))
      .first()
    return u !== null
  },
})

export const me = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, { sessionToken }) => {
    if (!sessionToken) return null
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', sessionToken))
      .first()
    if (!session || session.expiresAt < Date.now()) return null
    const user = await ctx.db.get(session.userId)
    if (!user) return null
    return { name: user.name, email: user.email }
  },
})

export const userIdForToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', token))
      .first()
    if (!session || session.expiresAt < Date.now()) return null
    return session.userId
  },
})

export const createUser = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('users', {
      email: args.email.toLowerCase().trim(),
      name: args.name.trim(),
      passwordHash: args.passwordHash,
    })
  },
})

export const createSession = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const token = crypto.randomUUID()
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000
    await ctx.db.insert('sessions', { userId, token, expiresAt })
    return token
  },
})

export const logout = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', sessionToken))
      .first()
    if (session) await ctx.db.delete(session._id)
  },
})

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email.toLowerCase().trim()))
      .first()
  },
})

export const getPasswordResetByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query('passwordResetTokens')
      .withIndex('by_token', (q) => q.eq('token', token))
      .first()
  },
})

export const getLatestPasswordResetForEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const e = email.toLowerCase().trim()
    const rows = await ctx.db
      .query('passwordResetTokens')
      .withIndex('by_email', (q) => q.eq('email', e))
      .collect()
    if (!rows.length) return null
    return rows.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b))
  },
})

export const createPasswordResetToken = internalMutation({
  args: {
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const e = args.email.toLowerCase().trim()
    const existing = await ctx.db
      .query('passwordResetTokens')
      .withIndex('by_email', (q) => q.eq('email', e))
      .collect()
    for (const r of existing) await ctx.db.delete(r._id)
    await ctx.db.insert('passwordResetTokens', {
      email: e,
      token: args.token,
      expiresAt: args.expiresAt,
      createdAt: args.createdAt,
    })
  },
})

export const deletePasswordResetsForEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const e = email.toLowerCase().trim()
    const rows = await ctx.db
      .query('passwordResetTokens')
      .withIndex('by_email', (q) => q.eq('email', e))
      .collect()
    for (const r of rows) await ctx.db.delete(r._id)
  },
})

export const setUserPasswordHash = internalMutation({
  args: { userId: v.id('users'), passwordHash: v.string() },
  handler: async (ctx, { userId, passwordHash }) => {
    await ctx.db.patch(userId, { passwordHash })
  },
})

export const deleteAllSessionsForUser = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const sessions = await ctx.db
      .query('sessions')
      .filter((q) => q.eq(q.field('userId'), userId))
      .collect()
    for (const s of sessions) await ctx.db.delete(s._id)
  },
})
