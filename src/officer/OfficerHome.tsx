import { useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@convex/_generated/api'
import { useOfficerSession } from './OfficerSessionContext'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
] as const

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'garbage', label: 'Garbage' },
  { value: 'pothole', label: 'Pothole' },
  { value: 'water_leak', label: 'Water leak' },
] as const

function formatType(t: string) {
  if (t === 'water_leak') return 'Water leak'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

function formatStatus(s: string) {
  if (s === 'in_progress') return 'In progress'
  if (s === 'submitted') return 'Submitted'
  return 'Resolved'
}

export function OfficerHome() {
  const { token, logout } = useOfficerSession()
  const list = useQuery(api.officerComplaints.listAll, token ? { officerToken: token } : 'skip')

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')

  useEffect(() => {
    if (list === null && token) {
      logout()
    }
  }, [list, token, logout])

  const filtered = useMemo(() => {
    if (!list || !Array.isArray(list)) return []
    let rows = [...list]
    if (statusFilter !== 'all') {
      rows = rows.filter((r) => r.status === statusFilter)
    }
    if (typeFilter !== 'all') {
      rows = rows.filter((r) => r.issueCategory === typeFilter)
    }
    rows.sort((a, b) =>
      sort === 'newest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
    )
    return rows
  }, [list, statusFilter, typeFilter, sort])

  if (list === undefined) {
    return (
      <div className="od-panel" aria-busy="true">
        <div className="od-skeleton-stack" aria-hidden>
          {[0, 1, 2, 3, 4].map((k) => (
            <div key={k} className="od-skeleton-line cc-skeleton-block" />
          ))}
        </div>
        <p className="od-muted od-loading-row">
          <span className="cc-spinner" aria-hidden />
          Loading complaints…
        </p>
      </div>
    )
  }

  if (list === null) {
    return (
      <div className="od-panel">
        <p className="od-muted">Session expired. Sign in again.</p>
      </div>
    )
  }

  return (
    <div className="od-home">
      <div className="od-home__head">
        <div>
          <h1 className="od-h1">All complaints</h1>
          <p className="od-lede">{filtered.length} in view · {list.length} total</p>
        </div>
        <div className="od-filters">
          <label className="od-filter">
            <span className="od-filter__label">Status</span>
            <select
              className="od-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="od-filter">
            <span className="od-filter__label">Type</span>
            <select className="od-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="od-filter">
            <span className="od-filter__label">Sort</span>
            <select className="od-select" value={sort} onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="od-panel od-panel--empty">
          <p>No complaints match these filters.</p>
        </div>
      ) : (
        <ul className="od-card-list">
          {filtered.map((row) => (
            <li key={row.id}>
              <Link to={`/dashboard/${encodeURIComponent(row.id)}`} className="od-card">
                <div className="od-card__top">
                  <span className="od-card__id">{row.id}</span>
                  <span className={`od-badge od-badge--${row.status}`}>{formatStatus(row.status)}</span>
                </div>
                <p className="od-card__type">
                  {row.issueType}
                  <span className="od-card__cat">{formatType(row.issueCategory)}</span>
                </p>
                <p className="od-card__desc">{row.description || '—'}</p>
                <div className="od-card__meta">
                  <span>{row.department}</span>
                  <time dateTime={row.createdAtIso}>{new Date(row.createdAt).toLocaleString()}</time>
                </div>
                {row.thumbnailUrl && (
                  <img src={row.thumbnailUrl} alt="" className="od-card__thumb" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
