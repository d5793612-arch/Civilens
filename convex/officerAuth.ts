import { v } from 'convex/values'
import { internalQuery, mutation } from './_generated/server'

/** Normalize e.g. "GOV - 112" or "gov-112" → "GOV-112" */
function normalizeOfficerEmployeeId(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

const OFFICER_EMPLOYEE_IDS = new Set(['GOV-111', 'GOV-112', 'GOV-113'])
const OFFICER_SHARED_PASSWORD = 'harki@2004'

export const isOfficerTokenValid = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const s = await ctx.db
      .query('officerSessions')
      .withIndex('by_token', (q) => q.eq('token', token.trim()))
      .first()
    return !!(s && s.expiresAt > Date.now())
  },
})

export const officerLogin = mutation({
  args: { employeeId: v.string(), password: v.string() },
  handler: async (ctx, { employeeId, password }) => {
    const id = normalizeOfficerEmployeeId(employeeId)
    if (!OFFICER_EMPLOYEE_IDS.has(id) || password !== OFFICER_SHARED_PASSWORD) {
      throw new Error('Invalid employee ID or password')
    }
    const token =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '')
        : `${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`

    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
    await ctx.db.insert('officerSessions', { token, expiresAt })
    return { token, expiresAt }
  },
})

export const officerLogout = mutation({
  args: { officerToken: v.string() },
  handler: async (ctx, { officerToken }) => {
    const s = await ctx.db
      .query('officerSessions')
      .withIndex('by_token', (q) => q.eq('token', officerToken.trim()))
      .first()
    if (s) await ctx.db.delete(s._id)
  },
})
