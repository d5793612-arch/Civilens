import { useCallback, useEffect, useState } from 'react'
import {
  applyThemeToDocument,
  getStoredTheme,
  nextTheme,
  setStoredTheme,
  type ThemeMode,
} from '../theme/theme'

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function NightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      <path d="M17.5 6.5l.5.5M16 4l.2.8M19 8l.8.2" strokeLinecap="round" strokeWidth="1.25" opacity="0.85" />
    </svg>
  )
}

const labels: Record<
  ThemeMode,
  { label: string; hint: string }
> = {
  light: { label: 'Light appearance', hint: 'Switch to dark mode' },
  dark: { label: 'Dark mode', hint: 'Switch to night mode' },
  night: { label: 'Night mode', hint: 'Switch to light mode' },
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme() ?? 'light')

  useEffect(() => {
    applyThemeToDocument(mode)
    setStoredTheme(mode)
  }, [mode])

  const cycle = useCallback(() => {
    setMode((m) => nextTheme(m))
  }, [])

  const { label, hint } = labels[mode]

  return (
    <button
      type="button"
      className={`cc-icon-btn cc-icon-btn--theme${className ? ` ${className}` : ''}`}
      aria-label={`${label}. ${hint}.`}
      title={hint}
      onClick={cycle}
    >
      {mode === 'light' ? <SunIcon /> : mode === 'dark' ? <MoonIcon /> : <NightIcon />}
    </button>
  )
}
