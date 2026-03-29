import { useAction } from 'convex/react'
import { useEffect, useId, useState } from 'react'
import { api } from '@convex/_generated/api'

export interface ResetPasswordModalProps {
  open: boolean
  resetToken: string
  onClose: () => void
  /** After success: clear ?reset= from URL and optionally open sign-in */
  onSuccess: () => void
}

export function ResetPasswordModal({ open, resetToken, onClose, onSuccess }: ResetPasswordModalProps) {
  const titleId = useId()
  const validateToken = useAction(api.authActions.validatePasswordResetToken)
  const resetPassword = useAction(api.authActions.resetPasswordWithToken)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<'checking' | 'valid' | 'invalid' | 'expired'>('checking')

  useEffect(() => {
    if (!open || !resetToken.trim()) {
      setTokenStatus('checking')
      return
    }
    let cancelled = false
    setTokenStatus('checking')
    void (async () => {
      try {
        const r = await validateToken({ token: resetToken.trim() })
        if (cancelled) return
        if (r.valid) setTokenStatus('valid')
        else setTokenStatus(r.reason === 'expired' ? 'expired' : 'invalid')
      } catch {
        if (!cancelled) setTokenStatus('invalid')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, resetToken, validateToken])

  useEffect(() => {
    if (!open) return
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
      await resetPassword({ token: resetToken.trim(), newPassword: password })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.')
    } finally {
      setBusy(false)
    }
  }

  const invalidBody =
    tokenStatus === 'expired' ? (
      <div className="cc-modal__form">
        <p className="cc-modal__error">This link has expired. Request a new reset from the sign-in screen.</p>
        <div className="cc-modal__actions">
          <button type="button" className="cc-btn-pill cc-btn-pill--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    ) : (
      <div className="cc-modal__form">
        <p className="cc-modal__error">This reset link is invalid. Request a new one from sign in.</p>
        <div className="cc-modal__actions">
          <button type="button" className="cc-btn-pill cc-btn-pill--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    )

  return (
    <div className="cc-modal-root" role="presentation">
      <button type="button" className="cc-modal-backdrop" aria-label="Close dialog" onClick={onClose} />
      <div className="cc-modal cc-modal--narrow" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="cc-modal__head">
          <div>
            <p className="cc-slug cc-slug--on-card">Account</p>
            <h2 id={titleId} className="cc-modal__title">
              Set new password
            </h2>
            <p className="cc-modal__sub">Choose a new password for your account. All other sessions will be signed out.</p>
          </div>
          <button type="button" className="cc-modal__close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {tokenStatus === 'checking' ? (
          <div className="cc-modal__form cc-modal__form--centered">
            <p className="cc-modal__sub" style={{ margin: 0 }}>
              Checking your link…
            </p>
            <span className="cc-spinner" style={{ marginTop: '0.75rem' }} aria-hidden />
          </div>
        ) : tokenStatus === 'valid' ? (
          <form className="cc-modal__form" onSubmit={submit}>
            <label className="cc-form-field">
              <span className="cc-form-field__label">New password</span>
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
              <button
                type="submit"
                className={`cc-btn-pill cc-btn-pill--primary${busy ? ' cc-btn--busy' : ''}`}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <span className="cc-spinner" aria-hidden />
                    Saving…
                  </>
                ) : (
                  'Update password'
                )}
              </button>
            </div>
          </form>
        ) : (
          invalidBody
        )}
      </div>
    </div>
  )
}
