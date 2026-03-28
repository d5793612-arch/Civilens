import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Complaint } from '../types/complaint'

export type SuggestionItem = {
  key: string
  primary: string
  secondary?: string
  fillQuery: string
}

const COMMON_ISSUES: SuggestionItem[] = [
  { key: 'ci-pothole', primary: 'Pothole / road damage', secondary: 'Common issue', fillQuery: 'pothole' },
  { key: 'ci-water', primary: 'Water leak', secondary: 'Common issue', fillQuery: 'water' },
  { key: 'ci-garbage', primary: 'Garbage / sanitation', secondary: 'Common issue', fillQuery: 'garbage' },
  { key: 'ci-street', primary: 'Street lights', secondary: 'Common issue', fillQuery: 'street' },
]

function buildStaticSuggestions(departments: readonly string[]): SuggestionItem[] {
  const deptItems: SuggestionItem[] = departments.map((d) => ({
    key: `dept-${d.replace(/\s+/g, '-')}`,
    primary: d,
    secondary: 'Department',
    fillQuery: d,
  }))
  const statusItems: SuggestionItem[] = [
    { key: 'st-pen', primary: 'Pending', secondary: 'Status', fillQuery: 'Pending' },
    { key: 'st-ip', primary: 'In Progress', secondary: 'Status', fillQuery: 'In Progress' },
    { key: 'st-res', primary: 'Resolved', secondary: 'Status', fillQuery: 'Resolved' },
  ]
  const sev: SuggestionItem[] = [
    { key: 'sv-crit', primary: 'Critical severity', secondary: 'Severity', fillQuery: 'Critical' },
    { key: 'sv-high', primary: 'High severity', secondary: 'Severity', fillQuery: 'High' },
  ]
  return [...deptItems, ...statusItems, ...sev, ...COMMON_ISSUES]
}

function complaintSuggestions(complaints: Complaint[]): SuggestionItem[] {
  const seen = new Set<string>()
  const out: SuggestionItem[] = []
  const sorted = [...complaints].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  for (const c of sorted) {
    if (!c.issueType?.trim() || c.issueType === '—') continue
    const k = `r-${c.id.replace(/\s/g, '')}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push({
      key: k,
      primary: c.issueType,
      secondary: c.id,
      fillQuery: c.issueType,
    })
    if (out.length >= 12) break
  }
  return out
}

function matchesQuery(item: SuggestionItem, q: string): boolean {
  if (!q) return true
  const n = q.toLowerCase()
  return (
    item.primary.toLowerCase().includes(n) ||
    item.secondary?.toLowerCase().includes(n) ||
    item.fillQuery.toLowerCase().includes(n)
  )
}

function dedupeSuggestions(items: SuggestionItem[], limit: number): SuggestionItem[] {
  const seen = new Set<string>()
  const out: SuggestionItem[] = []
  for (const it of items) {
    const k = it.fillQuery.toLowerCase().trim()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(it)
    if (out.length >= limit) break
  }
  return out
}

export interface ReportSearchProps {
  departments: readonly string[]
  complaints: Complaint[]
  signedIn: boolean
  query: string
  onQueryChange: (q: string) => void
  onJumpToGrievances: () => void
}

export function ReportSearch({
  departments,
  complaints,
  signedIn,
  query,
  onQueryChange,
  onJumpToGrievances,
}: ReportSearchProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  const staticPool = useMemo(() => buildStaticSuggestions(departments), [departments])
  const fromReports = useMemo(() => complaintSuggestions(complaints), [complaints])

  const suggestions = useMemo(() => {
    const q = query.trim()
    const pool: SuggestionItem[] = []
    if (signedIn && complaints.length > 0) {
      pool.push(...fromReports)
    }
    pool.push(...staticPool)
    const filtered = q ? pool.filter((s) => matchesQuery(s, q)) : pool
    return dedupeSuggestions(filtered, 10)
  }, [query, signedIn, complaints, fromReports, staticPool])

  useEffect(() => {
    setActiveIdx(0)
  }, [query, open])

  useEffect(() => {
    setActiveIdx((i) => Math.min(i, Math.max(0, suggestions.length - 1)))
  }, [suggestions.length])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const applySuggestion = useCallback(
    (item: SuggestionItem) => {
      onQueryChange(item.fillQuery)
      setOpen(false)
      onJumpToGrievances()
      inputRef.current?.focus()
    },
    [onQueryChange, onJumpToGrievances],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!signedIn) {
      if (e.key === 'Enter') onJumpToGrievances()
      return
    }
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter') onJumpToGrievances()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = suggestions[activeIdx]
      if (pick) applySuggestion(pick)
      else onJumpToGrievances()
    }
  }

  const showList = signedIn && suggestions.length > 0
  const showNoMatch = signedIn && query.trim().length > 0 && suggestions.length === 0

  return (
    <div className="cc-search-wrap" ref={wrapRef}>
      <div className="cc-search" role="search">
        <span className="visually-hidden">Search grievances</span>
        <span className="cc-search__icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          className="cc-search__input"
          placeholder={signedIn ? 'Search reports, IDs, streets, department…' : 'Sign in to search your reports'}
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          readOnly={!signedIn}
          aria-expanded={open}
          aria-controls="civilens-search-suggestions"
          aria-activedescendant={
            open && showList && suggestions[activeIdx] ? `civilens-sug-${activeIdx}` : undefined
          }
        />
        {signedIn && query ? (
          <button
            type="button"
            className="cc-search__clear"
            aria-label="Clear search"
            onClick={() => {
              onQueryChange('')
              setOpen(true)
              inputRef.current?.focus()
            }}
          >
            ×
          </button>
        ) : null}
      </div>
      {open && !signedIn && (
        <div className="cc-search-suggestions cc-search-suggestions--muted" id="civilens-search-suggestions">
          <p className="cc-search-suggestions__empty">Sign in to search and filter your grievances.</p>
        </div>
      )}
      {open && signedIn && (
        <div
          id="civilens-search-suggestions"
          className="cc-search-suggestions"
          role="listbox"
          aria-label="Search suggestions"
        >
          {showNoMatch ? (
            <p className="cc-search-suggestions__empty">
              No suggestions match. Your table still filters by this text—press Enter to jump there.
            </p>
          ) : showList ? (
            <>
              <ul className="cc-search-suggestions__list" role="presentation">
                {suggestions.map((s, idx) => (
                  <li key={s.key} role="presentation">
                    <button
                      type="button"
                      id={`civilens-sug-${idx}`}
                      role="option"
                      aria-selected={idx === activeIdx}
                      className={`cc-search-suggestions__item${idx === activeIdx ? ' cc-search-suggestions__item--active' : ''}`}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => applySuggestion(s)}
                    >
                      <span className="cc-search-suggestions__primary">{s.primary}</span>
                      {s.secondary ? (
                        <span className="cc-search-suggestions__secondary">{s.secondary}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="cc-search-suggestions__hint">↑↓ choose · Enter apply · Esc close</p>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
