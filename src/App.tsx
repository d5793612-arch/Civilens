import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@convex/_generated/api'
import { initialsFromName, loadSession, saveSession, type SessionUser } from './auth/session'
import { SignInModal, SignUpModal } from './components/AuthModals'
import { NewReportModal } from './components/NewReportModal'
import type { Complaint, Status, Severity } from './types/complaint'
import './App.css'

const DEPARTMENTS = [
  'Public Works',
  'Water Supply',
  'Sanitation',
  'Roads & Transport',
  'Electricity',
  'Urban Planning',
] as const

/** Sector colors — “Department load” chart */
const DEPT_BAR_COLORS: Record<string, string> = {
  'Public Works': '#002c53',
  'Water Supply': '#2c694e',
  'Electricity': '#7c5c3c',
  Sanitation: '#6b9e7d',
  'Urban Planning': '#b8bcc4',
  'Roads & Transport': '#2d5a87',
}

const TEAMS = [
  { name: 'Public Works Crew A', status: 'ON SITE' as const },
  { name: 'Water Response B', status: 'IDLE' as const },
  { name: 'Sanitation Unit 3', status: 'ON SITE' as const },
  { name: 'Electrical Rapid', status: 'IDLE' as const },
]

type NavKey = 'dashboard' | 'grievances' | 'analytics' | 'settings'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function statusChipClass(status: Complaint['status']): string {
  switch (status) {
    case 'Pending':
      return 'civic-chip civic-chip--attention'
    case 'In Progress':
      return 'civic-chip civic-chip--progress'
    case 'Resolved':
      return 'civic-chip civic-chip--resolution'
  }
}

function SeverityCell({ severity }: { severity: Complaint['severity'] }) {
  const dotClass =
    severity === 'Critical'
      ? 'sev-dot sev-dot--critical'
      : severity === 'High'
        ? 'sev-dot sev-dot--high'
        : 'sev-dot sev-dot--muted'

  return (
    <span className="sev-cell">
      <span className={dotClass} aria-hidden />
      <span className="sev-cell__label">{severity}</span>
    </span>
  )
}

function toUiComplaint(row: {
  id?: string
  issueType?: string
  department?: string
  status?: string
  severity?: string
}): Complaint {
  const statusSet: Record<string, Status> = {
    Pending: 'Pending',
    'In Progress': 'In Progress',
    Resolved: 'Resolved',
  }
  const sevSet: Record<string, Severity> = {
    Low: 'Low',
    Medium: 'Medium',
    High: 'High',
    Critical: 'Critical',
  }
  return {
    id: String(row.id ?? ''),
    issueType: String(row.issueType ?? '—'),
    department: String(row.department ?? '—'),
    status: statusSet[row.status ?? ''] ?? 'Pending',
    severity: sevSet[row.severity ?? ''] ?? 'Medium',
  }
}

function App() {
  const [session, setSession] = useState<SessionUser | null>(null)
  const [signInOpen, setSignInOpen] = useState(false)
  const [signUpOpen, setSignUpOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [navActive, setNavActive] = useState<NavKey>('dashboard')
  const scrollRootRef = useRef<HTMLDivElement>(null)

  const rows = useQuery(api.complaints.list, session ? { sessionToken: session.token } : 'skip')
  const me = useQuery(api.auth.me, session ? { sessionToken: session.token } : 'skip')
  const logoutMutation = useMutation(api.auth.logout)

  useEffect(() => {
    setSession(loadSession())
  }, [])

  useEffect(() => {
    if (!session) return
    if (me === undefined) return
    if (me === null) {
      saveSession(null)
      setSession(null)
    }
  }, [me, session])

  const commitSession = useCallback((user: SessionUser | null) => {
    saveSession(user)
    setSession(user)
  }, [])

  const doLogout = useCallback(async () => {
    if (session?.token) {
      try {
        await logoutMutation({ sessionToken: session.token })
      } catch {
        /* still clear client */
      }
    }
    saveSession(null)
    setSession(null)
  }, [logoutMutation, session?.token])

  const complaints = useMemo((): Complaint[] => {
    if (rows === undefined || rows === null || !Array.isArray(rows)) return []
    return rows.map(toUiComplaint)
  }, [rows])

  const displayName = session?.name ?? 'there'

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      if (deptFilter !== 'all' && c.department !== deptFilter) return false
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      return true
    })
  }, [complaints, deptFilter, statusFilter])

  const sortedRows = useMemo(
    () =>
      [...filtered].sort((a, b) => (b.id || '').localeCompare(a.id || '', undefined, { numeric: true })),
    [filtered],
  )

  const stats = useMemo(() => {
    const all = complaints
    return {
      total: all.length,
      resolved: all.filter((c) => c.status === 'Resolved').length,
      pending: all.filter((c) => c.status === 'Pending').length,
    }
  }, [complaints])

  const departmentLoad = useMemo(() => {
    const active = complaints.filter((c) => c.status !== 'Resolved')
    const map = new Map<string, number>()
    for (const c of active) {
      map.set(c.department, (map.get(c.department) ?? 0) + 1)
    }
    return DEPARTMENTS.map((d) => ({
      department: d,
      count: map.get(d) ?? 0,
      color: DEPT_BAR_COLORS[d] ?? '#002c53',
    })).filter((row) => row.count > 0)
  }, [complaints])

  const maxDept = Math.max(1, ...departmentLoad.map((d) => d.count))

  const scrollToSection = useCallback((key: NavKey, targetId: string) => {
    setNavActive(key)
    const root = scrollRootRef.current
    const el = document.getElementById(targetId)
    if (!el || !root) return
    const top = root.getBoundingClientRect().top
    const t = el.getBoundingClientRect().top
    const y = root.scrollTop + (t - top) - 8
    root.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
  }, [])

  return (
    <div className="cc-shell">
      <aside className="cc-sidebar" aria-label="Primary navigation">
        <div className="cc-sidebar__brand">
          <p className="cc-brand-tagline">Report · Route · Resolve</p>
          <p className="cc-wordmark cc-wordmark--civilens">CIVILENS</p>
        </div>
        <nav className="cc-nav" aria-label="Main">
          <button
            type="button"
            className={`cc-nav__link${navActive === 'dashboard' ? ' cc-nav__link--active' : ''}`}
            onClick={() => scrollToSection('dashboard', 'civilens-dashboard')}
          >
            <span className="cc-nav__icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
              </svg>
            </span>
            Dashboard
          </button>
          <button
            type="button"
            className={`cc-nav__link${navActive === 'grievances' ? ' cc-nav__link--active' : ''}`}
            onClick={() => scrollToSection('grievances', 'civilens-grievances')}
          >
            <span className="cc-nav__icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </span>
            Grievances
          </button>
          <button
            type="button"
            className={`cc-nav__link${navActive === 'analytics' ? ' cc-nav__link--active' : ''}`}
            onClick={() => scrollToSection('analytics', 'civilens-analytics')}
          >
            <span className="cc-nav__icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M4 19V5M4 19h16M4 19v-9M8 10V7m4 3V5m4 5v-4" />
              </svg>
            </span>
            Analytics
          </button>
          <button
            type="button"
            className={`cc-nav__link${navActive === 'settings' ? ' cc-nav__link--active' : ''}`}
            onClick={() => scrollToSection('settings', 'civilens-settings')}
          >
            <span className="cc-nav__icon" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </span>
            Settings
          </button>
          <div className="cc-sidebar__auth" role="group" aria-label="Account">
            {session ? (
              <button
                type="button"
                className="cc-nav__link cc-nav__link--action"
                onClick={() => void doLogout()}
              >
                <span className="cc-nav__icon" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                </span>
                Log out
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="cc-nav__link cc-nav__link--action"
                  onClick={() => setSignInOpen(true)}
                >
                  <span className="cc-nav__icon" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                    </svg>
                  </span>
                  Sign in
                </button>
                <button
                  type="button"
                  className="cc-nav__link cc-nav__link--action"
                  onClick={() => setSignUpOpen(true)}
                >
                  <span className="cc-nav__icon" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 8v6M21 17h-6" />
                    </svg>
                  </span>
                  Sign up
                </button>
              </>
            )}
          </div>
        </nav>
        <button
          type="button"
          className="cc-btn-pill cc-btn-pill--primary cc-sidebar__cta"
          onClick={() => {
            if (!session) {
              setSignInOpen(true)
              return
            }
            setReportModalOpen(true)
          }}
        >
          New report
        </button>
      </aside>

      <div className="cc-main">
        <header className="cc-topbar">
          <label className="cc-search">
            <span className="visually-hidden">Search</span>
            <span className="cc-search__icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input type="search" className="cc-search__input" placeholder="Search reports, IDs, streets…" />
          </label>
          <div className="cc-topbar__actions">
            <button type="button" className="cc-icon-btn" aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <button type="button" className="cc-icon-btn" aria-label="Help">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
              </svg>
            </button>
            {session ? (
              <div className="cc-user cc-user--compact">
                <span className="cc-user__avatar" aria-hidden>
                  {initialsFromName(session.name)}
                </span>
                <span className="cc-user__name">{session.name}</span>
                <button
                  type="button"
                  className="cc-btn-pill cc-btn-pill--ghost cc-btn-pill--sm"
                  onClick={() => void doLogout()}
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="cc-auth-inline">
                <button
                  type="button"
                  className="cc-btn-pill cc-btn-pill--ghost cc-btn-pill--sm"
                  onClick={() => setSignInOpen(true)}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className="cc-btn-pill cc-btn-pill--primary cc-btn-pill--sm"
                  onClick={() => setSignUpOpen(true)}
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="cc-scroll" ref={scrollRootRef}>
          <section
            id="civilens-dashboard"
            className="cc-hero civilens-scroll-target"
            aria-labelledby="hero-heading"
          >
            <h1 id="hero-heading" className="cc-hero__title">
              {greeting()}, {displayName}.
            </h1>
            <p className="cc-hero__lede">
              {!session ? (
                <>Sign in to file a grievance and see only your own reports on this dashboard.</>
              ) : stats.total === 0 ? (
                <>
                  You do not have any grievances yet. Use <strong>New report</strong> when you are signed in to
                  file one—it will show up here.
                </>
              ) : (
                <>
                  The city is waking up. You have{' '}
                  <strong>{stats.pending} pending grievances</strong> requiring attention today—prioritize water and
                  public works routes where crews are already deployed.
                </>
              )}
            </p>
          </section>

          <div id="civilens-analytics" className="civilens-scroll-target" aria-label="Analytics">
          <section className="cc-stats" aria-label="Summary statistics">
            <article className="cc-stat">
              <span className="cc-stat__icon cc-stat__icon--neutral" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
              </span>
              <p className="cc-stat__label">Total reports</p>
              <p className="cc-stat__value">{stats.total}</p>
            </article>
            <article className="cc-stat">
              <span className="cc-stat__icon cc-stat__icon--resolved" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="M22 4 12 14.01l-3-3" />
                </svg>
              </span>
              <p className="cc-stat__label">Resolved</p>
              <p className="cc-stat__value">{stats.resolved}</p>
            </article>
            <article className="cc-stat">
              <span className="cc-stat__icon cc-stat__icon--pending" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </span>
              <p className="cc-stat__label">Pending</p>
              <p className="cc-stat__value">{stats.pending}</p>
            </article>
          </section>

          <div className="cc-split">
            <section className="cc-card cc-card--lift" aria-labelledby="dept-heading">
              <p className="cc-slug cc-slug--on-card">Workload</p>
              <h2 id="dept-heading" className="cc-card__title">
                Department load
              </h2>
              <p className="cc-card__hint">Active grievances by sector (unresolved)</p>
              <ul className="cc-bars" role="list">
                {departmentLoad.map(({ department, count, color }) => (
                  <li key={department} className="cc-bars__row">
                    <span className="cc-bars__label">{department}</span>
                    <div className="cc-bars__track" aria-hidden>
                      <div
                        className="cc-bars__fill"
                        style={{
                          width: `${(count / maxDept) * 100}%`,
                          background: color,
                        }}
                      />
                    </div>
                    <span className="cc-bars__count">{count}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="civilens-grievances" className="cc-card cc-card--lift cc-card--wide civilens-scroll-target">
              <div className="cc-table-head">
                <div>
                  <p className="cc-slug cc-slug--on-card">Operations</p>
                  <h2 className="cc-card__title">Your grievances</h2>
                  <p className="cc-card__hint">
                    {!session
                      ? 'Sign in to load your reports.'
                      : `${sortedRows.length} of ${complaints.length} in view`}
                  </p>
                </div>
                {session && complaints.length > 0 && (
                  <div className="cc-filters">
                    <label className="cc-field">
                      <span className="cc-field__label">Department</span>
                      <select
                        className="cc-select"
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                      >
                        <option value="all">All</option>
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="cc-field">
                      <span className="cc-field__label">Status</span>
                      <select
                        className="cc-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="all">All</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>

              {!session ? (
                <p className="cc-empty">Sign in to see grievances you have filed.</p>
              ) : rows === undefined ? (
                <p className="cc-empty">Loading your grievances…</p>
              ) : complaints.length === 0 ? (
                <p className="cc-empty">You have not filed any grievances yet.</p>
              ) : (
                <>
                  <div className="cc-table-scroll">
                    <table className="cc-table">
                      <thead>
                        <tr>
                          <th scope="col">ID</th>
                          <th scope="col">Issue type</th>
                          <th scope="col">Department</th>
                          <th scope="col">Status</th>
                          <th scope="col">Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRows.map((row, i) => (
                          <tr
                            key={row.id}
                            className={i % 2 === 1 ? 'cc-table__stripe' : undefined}
                          >
                            <td>
                              <span className="cc-mono">{row.id}</span>
                            </td>
                            <td>{row.issueType}</td>
                            <td>{row.department}</td>
                            <td>
                              <span className={statusChipClass(row.status)}>{row.status}</span>
                            </td>
                            <td>
                              <SeverityCell severity={row.severity} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {sortedRows.length === 0 && complaints.length > 0 && (
                    <p className="cc-empty">No grievances match these filters.</p>
                  )}
                </>
              )}
            </section>
          </div>
          </div>

          <section id="civilens-settings" className="cc-bottom civilens-scroll-target" aria-labelledby="settings-heading">
            <div className="cc-card cc-card--lift cc-map-card">
              <p className="cc-slug cc-slug--on-card">Field view</p>
              <h2 id="settings-heading" className="cc-card__title">
                Geospatial distribution
              </h2>
              <p className="cc-card__hint">Open cases clustered near the riverfront utility corridor</p>
              <div className="cc-map" role="img" aria-label="Stylized city map with one highlighted location">
                <svg className="cc-map__svg" viewBox="0 0 400 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="400" height="220" rx="16" fill="var(--surface-container-high)" />
                  <path
                    opacity="0.35"
                    d="M40 180 L80 60 L140 100 L200 40 L260 90 L320 50 L360 120 L360 180 Z"
                    fill="var(--on-surface)"
                  />
                  <path
                    opacity="0.2"
                    d="M20 140 L100 160 L160 120 L240 150 L300 110 L380 130 L380 200 L20 200 Z"
                    fill="var(--primary)"
                  />
                  <g className="cc-map__pin">
                    <circle cx="210" cy="95" r="28" fill="var(--primary)" opacity="0.12" />
                    <circle cx="210" cy="95" r="8" fill="var(--primary)" />
                    <circle cx="210" cy="95" r="3" fill="var(--on-primary)" />
                  </g>
                </svg>
              </div>
            </div>

            <div className="cc-card cc-card--lift cc-teams">
              <p className="cc-slug cc-slug--on-card">Deploy</p>
              <h2 className="cc-card__title">Response teams</h2>
              <p className="cc-card__hint">Live status across municipal units</p>
              <ul className="cc-team-list">
                {TEAMS.map((t) => (
                  <li key={t.name} className="cc-team">
                    <span className="cc-team__icon" aria-hidden>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <path d="M9 22V12h6v10" />
                      </svg>
                    </span>
                    <div className="cc-team__body">
                      <span className="cc-team__name">{t.name}</span>
                      <span
                        className={
                          t.status === 'ON SITE' ? 'cc-team__badge cc-team__badge--live' : 'cc-team__badge'
                        }
                      >
                        {t.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" className="cc-btn-pill cc-btn-pill--ghost cc-teams__action">
                Manage deployments
              </button>
            </div>
          </section>
        </div>
      </div>

      <NewReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        sessionToken={session?.token}
      />
      <SignInModal
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSignedIn={(u) => commitSession(u)}
        onOpenSignUp={() => setSignUpOpen(true)}
      />
      <SignUpModal
        open={signUpOpen}
        onClose={() => setSignUpOpen(false)}
        onRegistered={(u) => commitSession(u)}
        onOpenSignIn={() => setSignInOpen(true)}
      />
    </div>
  )
}

export default App
