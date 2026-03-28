import { useAction, useMutation } from 'convex/react'
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import type { Severity } from '../types/complaint'

const DEPARTMENTS = [
  'Public Works',
  'Water Supply',
  'Sanitation',
  'Roads & Transport',
  'Electricity',
  'Urban Planning',
] as const

const SEVERITIES: Severity[] = ['Low', 'Medium', 'High', 'Critical']

const MAX_PHOTOS = 8
const MAX_MB_PER_FILE = 10

type Preview = { file: File; url: string }

export interface NewReportModalProps {
  open: boolean
  onClose: () => void
  sessionToken?: string
  /** Convex `complaints.list` refetches automatically; use this for side effects. */
  onSuccess?: () => void
}

export function NewReportModal({ open, onClose, sessionToken, onSuccess }: NewReportModalProps) {
  const titleId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const generateUploadUrl = useMutation(api.complaints.generateUploadUrl)
  const submitReport = useAction(api.complaintsPipeline.submitReport)

  const [issueType, setIssueType] = useState('')
  const [description, setDescription] = useState('')
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0])
  const [severity, setSeverity] = useState<Severity>('Medium')
  const [location, setLocation] = useState('')
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [geoLoading, setGeoLoading] = useState(false)
  const [previews, setPreviews] = useState<Preview[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setIssueType('')
    setDescription('')
    setDepartment(DEPARTMENTS[0])
    setSeverity('Medium')
    setLocation('')
    setLat(undefined)
    setLng(undefined)
    setGeoLoading(false)
    setPreviews((p) => {
      p.forEach((x) => URL.revokeObjectURL(x.url))
      return []
    })
    setError(null)
    setSubmitting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      reset()
    }
    wasOpenRef.current = open
  }, [open, reset])

  useEffect(() => {
    if (open) return
    setPreviews((p) => {
      p.forEach((x) => URL.revokeObjectURL(x.url))
      return []
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    const next: Preview[] = []
    for (let i = 0; i < list.length; i++) {
      const file = list[i]
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_MB_PER_FILE * 1024 * 1024) continue
      if (previews.length + next.length >= MAX_PHOTOS) break
      next.push({ file, url: URL.createObjectURL(file) })
    }
    if (next.length) setPreviews((p) => [...p, ...next])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
      },
    })
    if (!res.ok) return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
    const j = (await res.json()) as { display_name?: string }
    return j.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
  }

  const fillLocationFromDevice = () => {
    setError(null)
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.')
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLat(latitude)
        setLng(longitude)
        try {
          const label = await reverseGeocode(latitude, longitude)
          setLocation(label)
        } catch {
          setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
        } finally {
          setGeoLoading(false)
        }
      },
      (err) => {
        setGeoLoading(false)
        if (err.code === 1) {
          setError('Location permission denied. Enable it in the browser or enter an address manually.')
        } else {
          setError('Could not read your location. Try again or type the address.')
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60_000 },
    )
  }

  const removePreview = (url: string) => {
    setPreviews((p) => {
      const row = p.find((x) => x.url === url)
      if (row) URL.revokeObjectURL(row.url)
      return p.filter((x) => x.url !== url)
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const t = issueType.trim()
    const d = description.trim()
    const hasPhotos = previews.length > 0
    if (!t) {
      setError('Add a short title for the issue.')
      return
    }
    if (!d && !hasPhotos) {
      setError('Add a short description or attach at least one photo.')
      return
    }
    if (!sessionToken?.trim()) {
      setError('Your session expired. Sign in again, then submit.')
      return
    }

    const descriptionForApi = d || (hasPhotos ? 'Details in attached photograph(s).' : '')

    setSubmitting(true)
    try {
      const storageIds: Id<'_storage'>[] = []
      for (const p of previews) {
        const postUrl = await generateUploadUrl()
        const res = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': p.file.type || 'application/octet-stream' },
          body: p.file,
        })
        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          throw new Error(errText ? `Upload failed (${res.status}): ${errText.slice(0, 200)}` : `Upload failed (${res.status})`)
        }
        const json = (await res.json()) as { storageId?: string }
        const sid = json.storageId
        if (!sid) throw new Error('Upload response missing storageId')
        storageIds.push(sid as Id<'_storage'>)
      }

      const result = await submitReport({
        sessionToken,
        issueType: t,
        description: descriptionForApi,
        department,
        severity,
        location: location.trim(),
        lat,
        lng,
        storageIds: storageIds.length ? storageIds : undefined,
      })

      if (result.duplicateOfComplaintId) {
        window.alert(
          `Report filed. Our system flagged a possible duplicate of ${result.duplicateOfComplaintId} (similar details or nearby GPS). You can still track this new ID: ${result.id}.`,
        )
      }

      onSuccess?.()
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit report.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="cc-modal-root" role="presentation">
      <button
        type="button"
        className="cc-modal-backdrop"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="cc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="cc-modal__head">
          <div>
            <p className="cc-slug cc-slug--on-card">Intake</p>
            <h2 id={titleId} className="cc-modal__title">
              New grievance report
            </h2>
            <p className="cc-modal__sub">
              You must be signed in so the report is saved to your account. The first photo is analyzed with
              Google Gemini when <code className="cc-modal__code">GEMINI_API_KEY</code> is set on the Convex
              deployment. Exa optionally enriches the bilingual draft when{' '}
              <code className="cc-modal__code">EXA_API_KEY</code> is set.
            </p>
          </div>
          <button type="button" className="cc-modal__close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form className="cc-modal__form" onSubmit={handleSubmit}>
          <label className="cc-form-field">
            <span className="cc-form-field__label">Issue title</span>
            <input
              className="cc-input"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              placeholder="e.g. Open sewer grate on Oak Ave"
              maxLength={200}
              autoComplete="off"
            />
          </label>

          <label className="cc-form-field">
            <span className="cc-form-field__label">Problem / grievance details</span>
            <textarea
              className="cc-input cc-input--area"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened, when, and any safety or access notes for field teams…"
              rows={5}
              maxLength={8000}
            />
          </label>

          <div className="cc-form-row">
            <label className="cc-form-field">
              <span className="cc-form-field__label">Department</span>
              <select
                className="cc-select cc-select--full"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                {DEPARTMENTS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
            <label className="cc-form-field">
              <span className="cc-form-field__label">Severity</span>
              <select
                className="cc-select cc-select--full"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
              >
                {SEVERITIES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="cc-form-field">
            <span className="cc-form-field__label">Location / landmark (optional)</span>
            <div className="cc-location-row">
              <input
                className="cc-input cc-location-row__input"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value)
                  setLat(undefined)
                  setLng(undefined)
                }}
                placeholder="Address, ward, or map pin reference"
                maxLength={500}
                autoComplete="street-address"
              />
              <button
                type="button"
                className="cc-btn-pill cc-btn-pill--ghost cc-location-row__geo"
                onClick={fillLocationFromDevice}
                disabled={geoLoading || submitting}
              >
                {geoLoading ? 'Locating…' : 'Use my location'}
              </button>
            </div>
            <p className="cc-form-hint">
              Uses your browser location (you will be asked for permission). Address text comes from OpenStreetMap
              (Nominatim).
            </p>
          </div>

          <div className="cc-upload">
            <span className="cc-form-field__label">Photographs</span>
            <p className="cc-upload__hint">
              Up to {MAX_PHOTOS} images, {MAX_MB_PER_FILE} MB each — uploaded to Convex Storage, then processed by
              the pipeline action.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="cc-upload__native"
              id="cc-report-photos"
              onChange={(e) => addFiles(e.target.files)}
            />
            <label htmlFor="cc-report-photos" className="cc-upload__trigger">
              Choose photos
            </label>
            {previews.length > 0 && (
              <ul className="cc-upload__grid">
                {previews.map((p) => (
                  <li key={p.url} className="cc-upload__tile">
                    <img src={p.url} alt="" className="cc-upload__thumb" />
                    <button
                      type="button"
                      className="cc-upload__remove"
                      onClick={() => removePreview(p.url)}
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="cc-modal__error">{error}</p>}

          <div className="cc-modal__actions">
            <button type="button" className="cc-btn-pill cc-btn-pill--ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={`cc-btn-pill cc-btn-pill--primary${submitting ? ' cc-btn--busy' : ''}`}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="cc-spinner" aria-hidden />
                  Submitting…
                </>
              ) : (
                'Submit report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
