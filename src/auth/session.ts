const SESSION_KEY = 'civic_concierge_session_v2'

export interface SessionUser {
  name: string
  email: string
  /** Convex session token (from authActions.login / register). */
  token: string
}

export function loadSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const u = JSON.parse(raw) as SessionUser
    if (!u?.name || !u?.email || !u?.token) return null
    return {
      name: u.name.trim(),
      email: u.email.trim().toLowerCase(),
      token: u.token,
    }
  } catch {
    return null
  }
}

export function saveSession(user: SessionUser | null) {
  if (!user) {
    localStorage.removeItem(SESSION_KEY)
    return
  }
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      name: user.name.trim(),
      email: user.email.trim().toLowerCase(),
      token: user.token,
    }),
  )
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
