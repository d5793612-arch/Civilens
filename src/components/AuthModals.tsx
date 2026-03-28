import { useAction } from 'convex/react'
import { useEffect, useId, useState } from 'react'
import { api } from '@convex/_generated/api'
import type { SessionUser } from '../auth/session'

export interface SignInModalProps {
  open: boolean
  onClose: () => void
  onSignedIn: (user: SessionUser) => void
  onOpenSignUp: () => void
}

export function SignInModal({ open, onClose, onSignedIn, onOpenSignUp }: SignInModalProps) {
  const titleId = useId()
  const login = useAction(api.authActions.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmail('')
    setPassword('')
    setError(null)
    setBusy(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const r = await login({ email, password })
      onSignedIn({ name: r.name, email: r.email, token: r.token })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cc-modal-root" role="presentation">
      <button type="button" className="cc-modal-backdrop" aria-label="Close dialog" onClick={onClose} />
      <div className="cc-modal cc-modal--narrow" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="cc-modal__head">
          <div>
            <p className="cc-slug cc-slug--on-card">Account</p>
            <h2 id={titleId} className="cc-modal__title">
              Sign in
            </h2>
            <p className="cc-modal__sub">Convex-backed auth. Passwords are hashed on the server.</p>
          </div>
          <button type="button" className="cc-modal__close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form className="cc-modal__form" onSubmit={submit}>
          <label className="cc-form-field">
            <span className="cc-form-field__label">Email</span>
            <input
              className="cc-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="cc-form-field">
            <span className="cc-form-field__label">Password</span>
            <input
              className="cc-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="cc-modal__error">{error}</p>}
          <div className="cc-modal__actions">
            <button type="button" className="cc-btn-pill cc-btn-pill--ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="cc-btn-pill cc-btn-pill--primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
          <p className="cc-auth-switch">
            No account?{' '}
            <button
              type="button"
              className="cc-auth-switch__link"
              onClick={() => {
                onClose()
                onOpenSignUp()
              }}
            >
              Sign up
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}

export interface SignUpModalProps {
  open: boolean
  onClose: () => void
  onRegistered: (user: SessionUser) => void
  onOpenSignIn: () => void
}

export function SignUpModal({ open, onClose, onRegistered, onOpenSignIn }: SignUpModalProps) {
  const titleId = useId()
  const register = useAction(api.authActions.register)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setEmail('')
    setPassword('')
    setConfirm('')
    setError(null)
    setBusy(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const r = await register({ name, email, password })
      onRegistered({ name: r.name, email: r.email, token: r.token })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cc-modal-root" role="presentation">
      <button type="button" className="cc-modal-backdrop" aria-label="Close dialog" onClick={onClose} />
      <div className="cc-modal cc-modal--narrow" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="cc-modal__head">
          <div>
            <p className="cc-slug cc-slug--on-card">Account</p>
            <h2 id={titleId} className="cc-modal__title">
              Sign up
            </h2>
            <p className="cc-modal__sub">Creates a Convex user document and session token for this deployment.</p>
          </div>
          <button type="button" className="cc-modal__close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form className="cc-modal__form" onSubmit={submit}>
          <label className="cc-form-field">
            <span className="cc-form-field__label">Full name</span>
            <input
              className="cc-input"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </label>
          <label className="cc-form-field">
            <span className="cc-form-field__label">Email</span>
            <input
              className="cc-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="cc-form-field">
            <span className="cc-form-field__label">Password</span>
            <input
              className="cc-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <label className="cc-form-field">
            <span className="cc-form-field__label">Confirm password</span>
            <input
              className="cc-input"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
          </label>
          {error && <p className="cc-modal__error">{error}</p>}
          <div className="cc-modal__actions">
            <button type="button" className="cc-btn-pill cc-btn-pill--ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="cc-btn-pill cc-btn-pill--primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </div>
          <p className="cc-auth-switch">
            Already registered?{' '}
            <button
              type="button"
              className="cc-auth-switch__link"
              onClick={() => {
                onClose()
                onOpenSignIn()
              }}
            >
              Sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
