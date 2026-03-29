import { useAction } from 'convex/react'
import { useEffect, useId, useState } from 'react'
import { api } from '@convex/_generated/api'

export interface ForgotPasswordModalProps {
  open: boolean
  onClose: () => void
  onBackToSignIn: () => void
}

export function ForgotPasswordModal({ open, onClose, onBackToSignIn }: ForgotPasswordModalProps) {
  const titleId = useId()
  const requestReset = useAction(api.authActions.requestPasswordReset)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmail('')
    setError(null)
    setBusy(false)
    setSent(false)
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
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      await requestReset({ email, appOrigin: origin })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.')
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
              Forgot password
            </h2>
            <p className="cc-modal__sub">
              {sent
                ? 'If an account exists for that address, we sent a link to set a new password (check spam).'
                : 'Enter your email. We will send a secure link valid for one hour.'}
            </p>
          </div>
          <button type="button" className="cc-modal__close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {sent ? (
          <div className="cc-modal__form">
            <p className="cc-modal__note cc-modal__note--success">
              You can close this window and use the link from your email, or try another address below.
            </p>
            <div className="cc-modal__actions">
              <button type="button" className="cc-btn-pill cc-btn-pill--ghost" onClick={onBackToSignIn}>
                Back to sign in
              </button>
              <button
                type="button"
                className="cc-btn-pill cc-btn-pill--primary"
                onClick={() => {
                  setSent(false)
                  setEmail('')
                }}
              >
                Send again
              </button>
            </div>
          </div>
        ) : (
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
            {error && <p className="cc-modal__error">{error}</p>}
            <div className="cc-modal__actions">
              <button type="button" className="cc-btn-pill cc-btn-pill--ghost" onClick={onBackToSignIn} disabled={busy}>
                Back
              </button>
              <button
                type="submit"
                className={`cc-btn-pill cc-btn-pill--primary${busy ? ' cc-btn--busy' : ''}`}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <span className="cc-spinner" aria-hidden />
                    Sending…
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
