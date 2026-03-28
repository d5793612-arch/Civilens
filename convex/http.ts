import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'

const officerApiHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function bearer(request: Request): string | null {
  const a = request.headers.get('Authorization')
  if (!a?.toLowerCase().startsWith('bearer ')) return null
  const t = a.slice(7).trim()
  return t || null
}

function officerJson(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: officerApiHeaders })
}

function parseComplaintSubpath(url: string): { complaintId: string; proof: boolean } | { error: string } {
  const pathname = new URL(url).pathname
  const base = '/api/complaints'
  if (!pathname.startsWith(base)) return { error: 'bad_prefix' }
  let rest = pathname.slice(base.length)
  if (rest.startsWith('/')) rest = rest.slice(1)
  rest = rest.replace(/\/$/, '')
  if (!rest) return { error: 'empty' }
  const parts = rest.split('/').filter(Boolean)
  if (parts.length === 1) return { complaintId: parts[0], proof: false }
  if (parts.length === 2 && parts[1] === 'proof') return { complaintId: parts[0], proof: true }
  return { error: 'invalid_path' }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk)
    binary += String.fromCharCode(...sub)
  }
  return btoa(binary)
}

const http = httpRouter()

http.route({
  path: '/webhook/whatsapp',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const ct = request.headers.get('content-type') ?? ''
    let imageBase64: string | null = null
    let location = ''
    let mimeType = 'image/jpeg'

    if (ct.includes('multipart/form-data')) {
      const fd = await request.formData()
      location = String(fd.get('location') ?? fd.get('address') ?? '')
      const file = fd.get('image') ?? fd.get('Image') ?? fd.get('media')
      if (file instanceof File) {
        mimeType = file.type || 'image/jpeg'
        const buf = await file.arrayBuffer()
        imageBase64 = arrayBufferToBase64(buf)
      }
    } else if (ct.includes('application/json')) {
      const j = (await request.json().catch(() => null)) as Record<string, unknown> | null
      if (j?.image_base64) imageBase64 = String(j.image_base64)
      if (j?.location) location = String(j.location)
      if (j?.mime_type) mimeType = String(j.mime_type)
    } else {
      const text = await request.text().catch(() => '')
      if (text) {
        try {
          const j = JSON.parse(text) as Record<string, unknown>
          if (j.image_base64) imageBase64 = String(j.image_base64)
          if (j.location) location = String(j.location)
          if (j.mime_type) mimeType = String(j.mime_type)
        } catch {
          /* ignore */
        }
      }
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({
          error:
            "Missing image. Use multipart field 'image' or JSON { image_base64, location?, mime_type? }",
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const result = await ctx.runAction(internal.complaintsPipeline.processWhatsAppImage, {
      imageBase64,
      location,
      mimeType,
    })

    return new Response(
      JSON.stringify({
        complaint_id: result.complaint_id,
        status: result.status,
        department: result.department,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }),
})

http.route({
  path: '/api/complaints',
  method: 'OPTIONS',
  handler: httpAction(async () => new Response(null, { status: 204, headers: officerApiHeaders })),
})

http.route({
  path: '/api/complaints',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const token = bearer(request)
    if (!token) return officerJson({ error: 'Missing Authorization: Bearer <officer_token>' }, 401)
    const rows = await ctx.runQuery(api.officerComplaints.listAll, { officerToken: token })
    if (rows === null) return officerJson({ error: 'Invalid or expired officer session' }, 401)
    return officerJson(rows)
  }),
})

http.route({
  pathPrefix: '/api/complaints/',
  method: 'OPTIONS',
  handler: httpAction(async () => new Response(null, { status: 204, headers: officerApiHeaders })),
})

http.route({
  pathPrefix: '/api/complaints/',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const token = bearer(request)
    if (!token) return officerJson({ error: 'Missing Authorization: Bearer <officer_token>' }, 401)
    const parsed = parseComplaintSubpath(request.url)
    if ('error' in parsed) {
      if (parsed.error === 'invalid_path') {
        return officerJson({ error: 'Expected /api/complaints/:id or /api/complaints/:id/proof' }, 400)
      }
      return officerJson({ error: 'GET single complaint: /api/complaints/:complaintId' }, 400)
    }
    if (parsed.proof) {
      return officerJson({ error: 'GET single complaint: /api/complaints/:complaintId' }, 400)
    }
    const valid = await ctx.runQuery(internal.officerAuth.isOfficerTokenValid, { token })
    if (!valid) return officerJson({ error: 'Invalid or expired officer session' }, 401)
    const row = await ctx.runQuery(api.officerComplaints.getByComplaintId, {
      officerToken: token,
      complaintId: parsed.complaintId,
    })
    if (!row) return officerJson({ error: 'Complaint not found' }, 404)
    return officerJson(row)
  }),
})

http.route({
  pathPrefix: '/api/complaints/',
  method: 'PATCH',
  handler: httpAction(async (ctx, request) => {
    const token = bearer(request)
    if (!token) return officerJson({ error: 'Missing Authorization: Bearer <officer_token>' }, 401)
    const parsed = parseComplaintSubpath(request.url)
    if (!('complaintId' in parsed) || parsed.proof) {
      return officerJson({ error: 'PATCH /api/complaints/:complaintId with JSON body { status, remark? }' }, 400)
    }
    let body: { status?: string; remark?: string }
    try {
      body = (await request.json()) as { status?: string; remark?: string }
    } catch {
      return officerJson({ error: 'Invalid JSON body' }, 400)
    }
    if (!body.status?.trim()) return officerJson({ error: 'Body must include status: submitted | in_progress | resolved' }, 400)
    try {
      const result = await ctx.runMutation(api.officerComplaints.updateComplaintStatus, {
        officerToken: token,
        complaintId: parsed.complaintId,
        status: body.status.trim(),
        remark: body.remark?.trim() || undefined,
      })
      return officerJson(result)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Update failed'
      const low = msg.toLowerCase()
      if (low.includes('invalid') || low.includes('session') || low.includes('expired')) {
        return officerJson({ error: msg }, low.includes('session') || low.includes('expired') ? 401 : 400)
      }
      if (low.includes('not found')) return officerJson({ error: msg }, 404)
      return officerJson({ error: msg }, 400)
    }
  }),
})

http.route({
  pathPrefix: '/api/complaints/',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = bearer(request)
    if (!token) return officerJson({ error: 'Missing Authorization: Bearer <officer_token>' }, 401)
    const parsed = parseComplaintSubpath(request.url)
    if (!('complaintId' in parsed) || !parsed.proof) {
      return officerJson({ error: 'POST resolution proof: /api/complaints/:complaintId/proof with JSON { storageId }' }, 400)
    }
    let body: { storageId?: string }
    try {
      body = (await request.json()) as { storageId?: string }
    } catch {
      return officerJson({ error: 'Invalid JSON body' }, 400)
    }
    if (!body.storageId?.trim()) return officerJson({ error: 'Body must include storageId from Convex upload URL' }, 400)
    try {
      await ctx.runMutation(api.officerComplaints.addResolutionProof, {
        officerToken: token,
        complaintId: parsed.complaintId,
        storageId: body.storageId.trim() as Id<'_storage'>,
      })
      return officerJson({ ok: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed'
      const low = msg.toLowerCase()
      if (low.includes('session') || low.includes('expired') || low.includes('invalid')) {
        return officerJson({ error: msg }, 401)
      }
      if (low.includes('not found')) return officerJson({ error: msg }, 404)
      return officerJson({ error: msg }, 400)
    }
  }),
})

export default http
