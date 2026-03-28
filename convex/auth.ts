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
