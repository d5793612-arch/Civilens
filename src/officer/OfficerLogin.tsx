import { useMutation } from 'convex/react'
import { type FormEvent, useState } from 'react'
import { api } from '@convex/_generated/api'
import { useOfficerSession } from './OfficerSessionContext'

export function OfficerLogin() {
  const { setToken } = useOfficerSession()
  const login = useMutation(api.officerAuth.officerLogin)
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { token } = await login({ employeeId: employeeId.trim(), password })
      setToken(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="od-login">
      <div className="od-login__card">
        <p className="od-login__slug">Restricted access</p>
        <h1 className="od-login__title">Officer dashboard</h1>
        <p className="od-login__lede">
          Government officers only. Valid employee IDs:{' '}
          <code className="od-login__code">GOV-111</code>, <code className="od-login__code">GOV-112</code>,{' '}
          <code className="od-login__code">GOV-113</code> (spacing ignored, case-insensitive). Shared password for all.
        </p>
        <form className="od-login__form" onSubmit={(e) => void onSubmit(e)}>
          <label className="od-field">
            <span className="od-field__label">Employee ID</span>
            <input
              className="od-input"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              autoComplete="username"
              placeholder="e.g. GOV-111"
            />
          </label>
          <label className="od-field">
            <span className="od-field__label">Password</span>
            <input
              className="od-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && <p className="od-login__error">{error}</p>}
          <button
            type="submit"
            className={`od-btn od-btn--primary${loading ? ' od-btn--busy' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="cc-spinner" aria-hidden />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
