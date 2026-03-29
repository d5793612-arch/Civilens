'use node'

import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { v } from 'convex/values'
import { action } from './_generated/server'
import { internal } from './_generated/api'

function parseResendErrorBody(status: number, body: string): string {
  try {
    const j = JSON.parse(body) as { message?: unknown }
    if (typeof j.message === 'string' && j.message.trim()) return j.message.trim()
  } catch {
    /* not JSON */
  }
  const flat = body.replace(/\s+/g, ' ').trim()
  if (flat) return flat.slice(0, 280)
  return `HTTP ${status}`
}

function normalizeAppOrigin(raw: string): string {
  const t = raw.trim()
  if (!t) throw new Error('App URL is required for the reset link.')
  let urlStr = t
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = `https://${urlStr}`
  }
  const u = new URL(urlStr)
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Invalid app URL.')
  return u.origin
}

async function sendPasswordResetEmail(to: string, name: string, resetLink: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM?.trim() || 'onboarding@resend.dev'
  if (!key) {
    throw new Error(
      'Email is not configured. Set RESEND_API_KEY in Convex (Dashboard → Environment Variables).',
    )
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Reset your CIVILENS password',
      html: `<p>Hi ${escapeHtml(name || 'there')},</p>
<p>We received a request to reset your password. Use the link below (valid for 1 hour):</p>
<p><a href="${escapeHtml(resetLink)}" style="word-break:break-all">${escapeHtml(resetLink)}</a></p>
<p>If you did not ask for this, you can ignore this email.</p>`,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    const detail = parseResendErrorBody(res.status, text)
    console.error('Resend password reset error', res.status, text)
    throw new Error(`Could not send email (${res.status}): ${detail}`)
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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
    const userId = await ctx.runMutation(internal.auth.createUser, {
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

/** Always returns ok so callers do not learn whether an email is registered. */
export const requestPasswordReset = action({
  args: { email: v.string(), appOrigin: v.string() },
  handler: async (ctx, args): Promise<{ ok: true }> => {
    const email = args.email.toLowerCase().trim()
    if (!email.includes('@')) return { ok: true }

    const user = await ctx.runQuery(internal.auth.getUserByEmail, { email })
    if (!user) return { ok: true }

    const latest = await ctx.runQuery(internal.auth.getLatestPasswordResetForEmail, { email })
    if (latest && Date.now() - latest.createdAt < 60_000) {
      return { ok: true }
    }

    let origin: string
    try {
      origin = normalizeAppOrigin(args.appOrigin)
    } catch {
      throw new Error('Invalid app URL. Refresh the page and try again.')
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = Date.now() + 60 * 60 * 1000
    await ctx.runMutation(internal.auth.createPasswordResetToken, {
      email,
      token,
      expiresAt,
      createdAt: Date.now(),
    })

    const link = `${origin}/?reset=${encodeURIComponent(token)}`
    await sendPasswordResetEmail(user.email, user.name, link)
    return { ok: true }
  },
})

export const validatePasswordResetToken = action({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<{ valid: true } | { valid: false; reason: 'invalid' | 'expired' }> => {
    const t = token.trim()
    if (t.length < 32) return { valid: false, reason: 'invalid' }
    const row = await ctx.runQuery(internal.auth.getPasswordResetByToken, { token: t })
    if (!row) return { valid: false, reason: 'invalid' }
    if (row.expiresAt < Date.now()) return { valid: false, reason: 'expired' }
    return { valid: true }
  },
})

export const resetPasswordWithToken = action({
  args: { token: v.string(), newPassword: v.string() },
  handler: async (ctx, { token, newPassword }): Promise<{ ok: true }> => {
    if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.')
    const t = token.trim()
    const row = await ctx.runQuery(internal.auth.getPasswordResetByToken, { token: t })
    if (!row || row.expiresAt < Date.now()) {
      throw new Error('This reset link is invalid or has expired. Request a new password reset.')
    }
    const user = await ctx.runQuery(internal.auth.getUserByEmail, { email: row.email })
    if (!user) throw new Error('Account not found.')

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await ctx.runMutation(internal.auth.setUserPasswordHash, { userId: user._id, passwordHash })
    await ctx.runMutation(internal.auth.deleteAllSessionsForUser, { userId: user._id })
    await ctx.runMutation(internal.auth.deletePasswordResetsForEmail, { email: row.email })
    return { ok: true }
  },
})
