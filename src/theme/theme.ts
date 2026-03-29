export type ThemeMode = 'light' | 'dark' | 'night'

const STORAGE_KEY = 'civilens-theme'

export const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'night']

export function getStoredTheme(): ThemeMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'night') return v
  } catch {
    /* private mode */
  }
  return null
}

export function setStoredTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}

export function applyThemeToDocument(mode: ThemeMode): void {
  if (mode === 'light') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }
}

export function nextTheme(mode: ThemeMode): ThemeMode {
  const i = THEME_CYCLE.indexOf(mode)
  return THEME_CYCLE[(i + 1) % THEME_CYCLE.length]
}
