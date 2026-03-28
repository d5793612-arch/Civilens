'use node'

import Exa from 'exa-js'
import type { GenericActionCtx } from 'convex/server'
import { v } from 'convex/values'
import { action, internalAction } from './_generated/server'
import { internal } from './_generated/api'
import type { DataModel, Id } from './_generated/dataModel'
import {
  getGeminiApiKey,
  runBilingualGemini,
  runVisionGemini,
  type VisionJson,
} from './geminiAi'
import { categoryToIssueCategory, normalizeSeverity, routeFromCategory } from './routing'

type PipelineCtx = Pick<GenericActionCtx<DataModel>, 'runMutation' | 'runQuery'>

async function allocateComplaintId(ctx: PipelineCtx): Promise<string> {
  const year = new Date().getFullYear()
  for (let i = 0; i < 8; i++) {
    const n = Math.floor(1000 + Math.random() * 9000)
    const complaintId = `CG-${year}-${String(n).padStart(4, '0')}`
    const exists = await ctx.runQuery(internal.complaints.complaintIdExists, { complaintId })
    if (!exists) return complaintId
  }
  return `CG-${year}-${Date.now()}`
}

async function fetchBase64FromUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  return buf.toString('base64')
}

async function runExaContext(issue: string): Promise<string> {
  const key = process.env.EXA_API_KEY
  if (!key) return ''
  try {
    const exa = new Exa(key)
    const res = await exa.searchAndContents(`municipal civic complaint India ${issue}`, {
      numResults: 3,
      text: true,
    })
    return (res.results ?? [])
      .map((r) => (r.text ?? '').slice(0, 500))
      .join('\n---\n')
      .slice(0, 2500)
  } catch {
    return ''
  }
}

async function buildAndStore(params: {
  ctx: PipelineCtx
  userId?: Id<'users'>
  location: string
  lat?: number
  lng?: number
  duplicateOfComplaintId?: string
  duplicateSimilarityScore?: number
  manual: {
    issueType: string
    description: string
    department: string
    severity: string
  }
  imageBase64?: string
  imageMime?: string
  storageIds?: Id<'_storage'>[]
  source: string
}): Promise<{
  complaint_id: string
  status: string
  department: string
  duplicateOfComplaintId?: string
}> {
  const geminiKey = getGeminiApiKey()
  const mime = params.imageMime?.trim() || 'image/jpeg'
  let vision: VisionJson | null = null
  if (geminiKey && params.imageBase64) {
    try {
      vision = await runVisionGemini(geminiKey, params.imageBase64, mime)
    } catch {
      vision = null
    }
  }

  const issueText =
    params.manual.description.trim() ||
    vision?.issue ||
    params.manual.issueType ||
    'Civic grievance'

  const categoryRaw = vision?.category ?? params.manual.issueType
  const routed = routeFromCategory(categoryRaw)
  const severityNorm = normalizeSeverity(vision?.severity ?? params.manual.severity)

  const uiDept = params.manual.department?.trim() ? params.manual.department : routed.uiDepartment

  let en = params.manual.description.trim() || issueText
  let hi = ''
  if (geminiKey) {
    try {
      const exaContext = await runExaContext(issueText)
      const bilingual = await runBilingualGemini(geminiKey, {
        location: params.location,
        issue: issueText,
        severity: severityNorm,
        department: uiDept,
        routedDepartment: routed.department,
        exaContext,
      })
      en = bilingual.complaint_en
      hi = bilingual.complaint_hi
    } catch {
      en = params.manual.description.trim() || issueText
      hi = `शिकायत: ${issueText}. गंभीरता: ${severityNorm}. स्थान: ${params.location || 'अज्ञात'}.`
    }
  } else {
    hi = `शिकायत: ${issueText}. गंभीरता: ${severityNorm}. स्थान: ${params.location || 'अज्ञात'}. (AI हेतु GEMINI_API_KEY सेट करें)`
  }

  const complaintId = await allocateComplaintId(params.ctx)

  const structured = {
    issue: issueText,
    category: routed.category,
    department: routed.department,
    severity: severityNorm.toLowerCase(),
  }

  await params.ctx.runMutation(internal.complaints.insertComplaint, {
    complaintId,
    userId: params.userId,
    status: 'Pending',
    issueType: params.manual.issueType || issueText.slice(0, 80),
    department: uiDept,
    departmentRouted: routed.department,
    severity: severityNorm,
    description: params.manual.description || undefined,
    location: params.location || undefined,
    lat: params.lat,
    lng: params.lng,
    imageStorageIds: params.storageIds?.length ? params.storageIds : undefined,
    visionJson: vision ? { ...structured, vision } : structured,
    complaintTextEn: en,
    complaintTextHi: hi,
    category: routed.category,
    issueCategory: categoryToIssueCategory(routed.category),
    source: params.source,
    duplicateOfComplaintId: params.duplicateOfComplaintId,
    duplicateSimilarityScore: params.duplicateSimilarityScore,
  })

  if (params.userId) {
    let body = `Your grievance ${complaintId} was filed and routed to ${routed.department}.`
    if (params.duplicateOfComplaintId) {
      body += ` Possible duplicate of earlier report ${params.duplicateOfComplaintId} (similar text or nearby location).`
    }
    await params.ctx.runMutation(internal.notifications.createForUser, {
      userId: params.userId,
      title: `Report filed: ${complaintId}`,
      body,
      kind: params.duplicateOfComplaintId ? 'submitted_duplicate' : 'submitted',
    })
  }

  return {
    complaint_id: complaintId,
    status: 'filed',
    department: routed.department,
    duplicateOfComplaintId: params.duplicateOfComplaintId,
  }
}

export const submitReport = action({
  args: {
    sessionToken: v.optional(v.string()),
    issueType: v.string(),
    description: v.string(),
    department: v.string(),
    severity: v.string(),
    location: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    storageIds: v.optional(v.array(v.id('_storage'))),
  },
  handler: async (ctx, args) => {
    let userId: Id<'users'> | undefined
    if (args.sessionToken) {
      const uid = await ctx.runQuery(internal.auth.userIdForToken, { token: args.sessionToken })
      if (uid) userId = uid
    }

    let duplicateOfComplaintId: string | undefined
    let duplicateSimilarityScore: number | undefined
    if (userId) {
      const dup = await ctx.runQuery(internal.duplicateDetection.findDuplicateMatch, {
        userId,
        issueType: args.issueType,
        description: args.description,
        lat: args.lat,
        lng: args.lng,
      })
      if (dup) {
        duplicateOfComplaintId = dup.complaintId
        duplicateSimilarityScore = dup.score
      }
    }

    let imageBase64: string | undefined
    const first = args.storageIds?.[0]
    if (first) {
      const url = await ctx.runQuery(internal.storageHelpers.urlForStorage, { storageId: first })
      if (url) imageBase64 = await fetchBase64FromUrl(url)
    }

    const result = await buildAndStore({
      ctx,
      userId,
      location: args.location,
      lat: args.lat,
      lng: args.lng,
      duplicateOfComplaintId,
      duplicateSimilarityScore,
      manual: {
        issueType: args.issueType,
        description: args.description,
        department: args.department,
        severity: args.severity,
      },
      imageBase64,
      storageIds: args.storageIds,
      source: 'web_form',
    })

    return {
      id: result.complaint_id,
      status: result.status,
      department: result.department,
      duplicateOfComplaintId: result.duplicateOfComplaintId,
    }
  },
})

export const processWhatsAppImage = internalAction({
  args: {
    imageBase64: v.string(),
    location: v.optional(v.string()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await buildAndStore({
      ctx,
      location: args.location ?? '',
      manual: {
        issueType: 'Field report (image)',
        description: '',
        department: '',
        severity: 'medium',
      },
      imageBase64: args.imageBase64,
      imageMime: args.mimeType,
      source: 'whatsapp_webhook',
    })
    return {
      complaint_id: result.complaint_id,
      status: result.status,
      department: result.department,
    }
  },
})

export const simulateWhatsAppWebhook = action({
  args: {
    imageBase64: v.string(),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await buildAndStore({
      ctx,
      location: args.location ?? '',
      manual: {
        issueType: 'Field report (image)',
        description: '',
        department: '',
        severity: 'medium',
      },
      imageBase64: args.imageBase64,
      imageMime: 'image/jpeg',
      source: 'whatsapp_simulate',
    })
  },
})
