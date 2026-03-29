import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(),
  }).index('by_email', ['email']),

  sessions: defineTable({
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.number(),
  }).index('by_token', ['token']),

  /** One-time links for forgot-password email (cleared after use). */
  passwordResetTokens: defineTable({
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_email', ['email']),

  complaints: defineTable({
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
    /** Points to an earlier report this one may duplicate (same user, similar text / nearby GPS). */
    duplicateOfComplaintId: v.optional(v.string()),
    duplicateSimilarityScore: v.optional(v.number()),
    /** 0 = normal, 1 = escalated, 2 = priority escalation */
    escalationLevel: v.optional(v.number()),
    /** Officer / API filter bucket: garbage | pothole | water_leak | other */
    issueCategory: v.optional(v.string()),
    officerRemarks: v.optional(
      v.array(
        v.object({
          at: v.number(),
          text: v.string(),
        }),
      ),
    ),
    resolutionProofStorageIds: v.optional(v.array(v.id('_storage'))),
    createdAt: v.number(),
  })
    .index('by_complaint_id', ['complaintId'])
    .index('by_user', ['userId'])
    .index('by_created', ['createdAt']),

  officerSessions: defineTable({
    token: v.string(),
    expiresAt: v.number(),
  }).index('by_token', ['token']),

  notifications: defineTable({
    userId: v.id('users'),
    title: v.string(),
    body: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
    kind: v.optional(v.string()),
  })
    .index('by_user_created', ['userId', 'createdAt'])
    .index('by_user_read', ['userId', 'read']),
})
