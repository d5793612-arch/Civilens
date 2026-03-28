import { useMutation, useQuery } from 'convex/react'
import type { Id } from '@convex/_generated/dataModel'
import { type FormEvent, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '@convex/_generated/api'
import { useOfficerSession } from './OfficerSessionContext'

function formatType(t: string) {
  if (t === 'water_leak') return 'Water leak'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function formatStatus(s: string) {
  if (s === 'in_progress') return 'In progress'
  if (s === 'submitted') return 'Submitted'
  return 'Resolved'
}

export function OfficerDetail() {
  const { complaintId: rawId } = useParams()
  const complaintId = rawId ? decodeURIComponent(rawId) : ''
  const { token } = useOfficerSession()
  const fileRef = useRef<HTMLInputElement>(null)

  const detail = useQuery(
    api.officerComplaints.getByComplaintId,
    token && complaintId ? { officerToken: token, complaintId } : 'skip',
  )

  const updateStatus = useMutation(api.officerComplaints.updateComplaintStatus)
  const addRemark = useMutation(api.officerComplaints.addOfficerRemark)
  const addProof = useMutation(api.officerComplaints.addResolutionProof)
  const genUpload = useMutation(api.officerComplaints.generateOfficerUploadUrl)

  const [statusNote, setStatusNote] = useState('')
  const [remarkText, setRemarkText] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setStatus = async (status: 'submitted' | 'in_progress' | 'resolved') => {
    if (!token || !complaintId) return
    setError(null)
    setBusy(`status-${status}`)
    try {
      await updateStatus({
        officerToken: token,
        complaintId,
        status,
        remark: statusNote.trim() || undefined,
      })
      setStatusNote('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(null)
    }
  }

  const onRemark = async (e: FormEvent) => {
    e.preventDefault()
    if (!token || !complaintId || !remarkText.trim()) return
    setError(null)
    setBusy('remark')
    try {
      await addRemark({ officerToken: token, complaintId, text: remarkText.trim() })
      setRemarkText('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save remark')
    } finally {
      setBusy(null)
    }
  }

  const onProof = async (list: FileList | null) => {
    const f = list?.[0]
    if (!f || !token || !complaintId || !f.type.startsWith('image/')) return
    setError(null)
    setBusy('proof')
    try {
      const postUrl = await genUpload({ officerToken: token })
      const res = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': f.type || 'application/octet-stream' },
        body: f,
      })
      if (!res.ok) throw new Error(`Upload failed (${res.status})`)
      const json = (await res.json()) as { storageId?: string }
      if (!json.storageId) throw new Error('Missing storageId')
      await addProof({
        officerToken: token,
        complaintId,
        storageId: json.storageId as Id<'_storage'>,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Proof upload failed')
    } finally {
      setBusy(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (!complaintId) {
    return (
      <div className="od-panel">
        <p className="od-muted">Missing complaint id.</p>
        <Link to="/dashboard" className="od-link">
          Back to list
        </Link>
      </div>
    )
  }

  if (detail === undefined) {
    return (
      <div className="od-panel" aria-busy="true">
        <div className="od-skeleton-stack" aria-hidden>
          {[0, 1, 2].map((k) => (
            <div key={k} className="od-skeleton-line cc-skeleton-block" />
          ))}
        </div>
        <p className="od-muted od-loading-row">
          <span className="cc-spinner" aria-hidden />
          Loading…
        </p>
      </div>
    )
  }

  if (detail === null) {
    return (
      <div className="od-panel">
        <p className="od-muted">Complaint not found, or your officer session is invalid.</p>
        <Link to="/dashboard" className="od-link">
          Back to list
        </Link>
      </div>
    )
  }

  return (
    <div className="od-detail">
      <div className="od-detail__head">
        <Link to="/dashboard" className="od-back">
          ← All complaints
        </Link>
        <div className="od-detail__title-row">
          <h1 className="od-h1">{detail.id}</h1>
          <span className={`od-badge od-badge--${detail.status}`}>{formatStatus(detail.status)}</span>
        </div>
        <p className="od-lede">
          {detail.issueType} · <span className="od-muted">{formatType(detail.issueCategory)}</span> ·{' '}
          {detail.department}
        </p>
      </div>

      {error && <p className="od-error-banner">{error}</p>}

      <div className="od-detail__grid">
        <section className="od-panel">
          <h2 className="od-h2">Description</h2>
          <p className="od-body">{detail.description || '—'}</p>
          <h2 className="od-h2 od-h2--spaced">Location</h2>
          <p className="od-body">{detail.location || 'Not provided'}</p>
          {detail.lat != null && detail.lng != null && (
            <p className="od-muted od-mono">
              {detail.lat.toFixed(5)}, {detail.lng.toFixed(5)}
            </p>
          )}
          <p className="od-muted" style={{ marginTop: '1rem' }}>
            Filed {new Date(detail.createdAt).toLocaleString()} · Severity: {detail.severity}
          </p>
        </section>

        <section className="od-panel">
          <h2 className="od-h2">Reporter photos</h2>
          {detail.imageUrls.length === 0 ? (
            <p className="od-muted">No images attached.</p>
          ) : (
            <ul className="od-gallery">
              {detail.imageUrls.map((url: string) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="Complaint" className="od-gallery__img" />
                  </a>
                </li>
              ))}
            </ul>
          )}

          <h2 className="od-h2 od-h2--spaced">Resolution proof</h2>
          {detail.proofUrls.length === 0 ? (
            <p className="od-muted">No proof uploaded yet.</p>
          ) : (
            <ul className="od-gallery">
              {detail.proofUrls.map((url: string) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="Resolution proof" className="od-gallery__img" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="od-file"
            onChange={(e) => void onProof(e.target.files)}
          />
          <button
            type="button"
            className="od-btn od-btn--ghost od-btn--sm"
            disabled={busy === 'proof'}
            onClick={() => fileRef.current?.click()}
          >
            {busy === 'proof' ? 'Uploading…' : 'Upload proof image'}
          </button>
        </section>
      </div>

      <section className="od-panel od-panel--wide">
        <h2 className="od-h2">Update status</h2>
        <p className="od-muted od-detail__hint">
          Citizens see status updates immediately and receive in-app notifications. Optional note is included in the
          notification.
        </p>
        <label className="od-field">
          <span className="od-field__label">Optional note with status change</span>
          <textarea
            className="od-textarea"
            rows={2}
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            placeholder="e.g. Crew dispatched, expected completion Friday"
          />
        </label>
        <div className="od-actions">
          <button
            type="button"
            className="od-btn od-btn--secondary"
            disabled={!!busy}
            onClick={() => void setStatus('submitted')}
          >
            {busy === 'status-submitted' ? '…' : 'Mark submitted (pending)'}
          </button>
          <button
            type="button"
            className="od-btn od-btn--primary"
            disabled={!!busy}
            onClick={() => void setStatus('in_progress')}
          >
            {busy === 'status-in_progress' ? '…' : 'Mark in progress'}
          </button>
          <button
            type="button"
            className="od-btn od-btn--success"
            disabled={!!busy}
            onClick={() => void setStatus('resolved')}
          >
            {busy === 'status-resolved' ? '…' : 'Mark resolved'}
          </button>
        </div>
      </section>

      <section className="od-panel od-panel--wide">
        <h2 className="od-h2">Officer remarks</h2>
        <ul className="od-remarks">
          {detail.officerRemarks.length === 0 ? (
            <li className="od-muted">No remarks yet.</li>
          ) : (
            [...detail.officerRemarks]
              .sort((a, b) => b.at - a.at)
              .map((r, i) => (
                <li key={`${r.at}-${i}`}>
                  <time className="od-remark__time">{new Date(r.at).toLocaleString()}</time>
                  <p className="od-remark__text">{r.text}</p>
                </li>
              ))
          )}
        </ul>
        <form className="od-remark-form" onSubmit={(e) => void onRemark(e)}>
          <label className="od-field">
            <span className="od-field__label">Add remark (also notifies the citizen)</span>
            <input
              className="od-input"
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="e.g. Work started on site"
            />
          </label>
          <button type="submit" className="od-btn od-btn--ghost" disabled={busy === 'remark' || !remarkText.trim()}>
            {busy === 'remark' ? 'Saving…' : 'Add remark'}
          </button>
        </form>
      </section>
    </div>
  )
}
