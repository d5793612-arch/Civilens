import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'

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

export default http
