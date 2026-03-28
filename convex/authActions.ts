'use node'

import bcrypt from 'bcryptjs'
import { v } from 'convex/values'
import { action } from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'

export const register = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{ token: string; name: string; email: string }> => {
    const email = args.email.toLowerCase().trim()
    const taken = await ctx.runQuery(internal.auth.emailTakenInternal, { email })
    if (taken) throw new Error('Email already registered')
    if (args.password.length < 6) throw new Error('Password must be at least 6 characters')
    if (args.name.trim().length < 2) throw new Error('Enter your full name')

    const passwordHash = await bcrypt.hash(args.password, 10)
    const userId: Id<'users'> = await ctx.runMutation(internal.auth.createUser, {
      email,
      name: args.name.trim(),
      passwordHash,
    })
    const token: string = await ctx.runMutation(internal.auth.createSession, { userId })
    return { token, name: args.name.trim(), email }
  },
})

export const login = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<{ token: string; name: string; email: string }> => {
    const email = args.email.toLowerCase().trim()
    const user = await ctx.runQuery(internal.auth.getUserByEmail, { email })
    if (!user) throw new Error('Invalid email or password')
    const ok = await bcrypt.compare(args.password, user.passwordHash)
    if (!ok) throw new Error('Invalid email or password')
    const token: string = await ctx.runMutation(internal.auth.createSession, { userId: user._id })
    return { token, name: user.name, email: user.email }
  },
})
