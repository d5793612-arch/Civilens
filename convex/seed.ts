import { mutation } from './_generated/server'

/** One-time demo data when the complaints table is empty (run from Convex dashboard or client). */
export const seedIfEmpty = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('complaints').first()
    if (existing) return { seeded: false, reason: 'already_has_data' as const }

    const now = Date.now()
    const rows = [
      {
        complaintId: 'CG-2026-0142',
        status: 'In Progress',
        issueType: 'Pothole / road damage',
        department: 'Roads & Transport',
        departmentRouted: 'PWD',
        severity: 'High',
        description: 'Demo row',
        category: 'pothole',
        source: 'seed',
        createdAt: now,
      },
      {
        complaintId: 'CG-2026-0138',
        status: 'Pending',
        issueType: 'Street lighting',
        department: 'Electricity',
        departmentRouted: 'Municipal Corporation',
        severity: 'Medium',
        description: 'Demo row',
        category: 'other',
        source: 'seed',
        createdAt: now - 1,
      },
      {
        complaintId: 'CG-2026-0121',
        status: 'Resolved',
        issueType: 'Garbage collection',
        department: 'Sanitation',
        departmentRouted: 'Municipal Corporation',
        severity: 'Low',
        description: 'Demo row',
        category: 'garbage',
        source: 'seed',
        createdAt: now - 2,
      },
    ] as const

    for (const r of rows) {
      await ctx.db.insert('complaints', { ...r })
    }

    return { seeded: true, count: rows.length }
  },
})
