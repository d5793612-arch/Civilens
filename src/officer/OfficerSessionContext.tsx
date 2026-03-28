import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'civilens_officer_token'

type OfficerCtx = {
  token: string | null
  setToken: (t: string | null) => void
  logout: () => void
}

const OfficerContext = createContext<OfficerCtx | null>(null)

export function OfficerSessionProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })

  const setToken = useCallback((t: string | null) => {
    setTokenState(t)
    try {
      if (t) sessionStorage.setItem(STORAGE_KEY, t)
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const logout = useCallback(() => setToken(null), [setToken])

  const value = useMemo(() => ({ token, setToken, logout }), [token, setToken, logout])

  return <OfficerContext.Provider value={value}>{children}</OfficerContext.Provider>
}

export function useOfficerSession() {
  const ctx = useContext(OfficerContext)
  if (!ctx) throw new Error('useOfficerSession must be used within OfficerSessionProvider')
  return ctx
}
