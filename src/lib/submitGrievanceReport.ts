import type { Severity } from '../types/complaint'

export interface GrievanceReportPayload {
  issueType: string
  description: string
  department: string
  severity: Severity
  /** Optional — useful for routing / maps / ML geocoding */
  location: string
  photos: File[]
}

/** Build multipart body for `fetch` — reuse for Python/Node proxies or vision pipelines. */
export function buildGrievanceFormData(payload: GrievanceReportPayload): FormData {
  const fd = new FormData()
  fd.set('issueType', payload.issueType)
  fd.set('description', payload.description)
  fd.set('department', payload.department)
  fd.set('severity', payload.severity)
  fd.set('location', payload.location)
  payload.photos.forEach((file) => {
    fd.append('photos', file, file.name)
  })
  return fd
}

export interface SubmitGrievanceOptions {
  /** Used when `VITE_API_BASE_URL` is unset (local demo). */
  fallbackGenerateId?: () => string
}

/**
 * POST grievance + images to your API, or simulate success in dev.
 * Set `VITE_API_BASE_URL` (e.g. `http://localhost:8080`) and implement `POST /grievances` returning JSON `{ "id": "CG-…" }`.
 */
export async function submitGrievanceReport(
  payload: GrievanceReportPayload,
  options?: SubmitGrievanceOptions,
): Promise<{ id: string }> {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')

  if (base) {
    const fd = buildGrievanceFormData(payload)
    const res = await fetch(`${base}/grievances`, {
      method: 'POST',
      body: fd,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Request failed (${res.status})`)
    }
    const data = (await res.json()) as { id?: string }
    if (!data?.id) throw new Error('Response missing id')
    return { id: data.id }
  }

  await new Promise((r) => setTimeout(r, 450))
  const id =
    options?.fallbackGenerateId?.() ??
    `CG-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
  return { id }
}
