import { useMutation } from 'convex/react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { api } from '@convex/_generated/api'
import { OfficerLogin } from './OfficerLogin'
import { useOfficerSession } from './OfficerSessionContext'
import './officer.css'

export function OfficerLayout() {
  const { token, setToken } = useOfficerSession()
  const navigate = useNavigate()
  const officerLogout = useMutation(api.officerAuth.officerLogout)

  const handleLogout = async () => {
    if (token) {
      try {
        await officerLogout({ officerToken: token })
      } catch {
        /* still clear client */
      }
    }
    setToken(null)
    navigate('/dashboard', { replace: true })
  }

  if (!token) {
    return <OfficerLogin />
  }

  return (
    <div className="od-shell">
      <header className="od-header">
        <div className="od-header__brand">
          <Link to="/dashboard" className="od-header__title">
            CIVILENS Officer
          </Link>
          <span className="od-header__sub">Complaint management</span>
        </div>
        <nav className="od-header__nav">
          <Link to="/" className="od-header__link">
            Citizen portal
          </Link>
          <button type="button" className="od-btn od-btn--ghost od-btn--sm" onClick={() => void handleLogout()}>
            Sign out
          </button>
        </nav>
      </header>
      <main className="od-main">
        <Outlet />
      </main>
    </div>
  )
}
