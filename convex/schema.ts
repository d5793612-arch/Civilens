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
    imageStorageIds: v.optional(v.array(v.id('_storage'))),
    visionJson: v.optional(v.any()),
    complaintTextEn: v.optional(v.string()),
    complaintTextHi: v.optional(v.string()),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_complaint_id', ['complaintId'])
    .index('by_user', ['userId'])
    .index('by_created', ['createdAt']),
})
