'use client'

import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, type ThemePreference, themeAttribute } from './theme'

type ThemeContextValue = {
  /** What the user chose. `system` means "follow the OS". */
  preference: ThemePreference
  /** What is actually being displayed right now. */
  resolved: 'light' | 'dark'
  setPreference: (next: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
  children,
  initialPreference,
}: {
  children: React.ReactNode
  /** Read from the theme cookie on the server so the first paint is correct. */
  initialPreference: ThemePreference
}) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference)
  const [system, setSystem] = useState<'light' | 'dark'>('light')

  // Track the OS preference so `resolved` is accurate while in `system` mode.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setSystem(query.matches ? 'dark' : 'light')
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)

    const attribute = themeAttribute(next)
    if (attribute) {
      document.documentElement.dataset['theme'] = attribute
    } else {
      delete document.documentElement.dataset['theme']
    }

    // A display preference, not a security credential: a readable cookie is
    // correct here, and lets the server render the right theme on first paint.
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved: preference === 'system' ? system : preference,
      setPreference,
    }),
    [preference, system, setPreference],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext)
  if (!context) throw new Error('useTheme must be used within <ThemeProvider>.')
  return context
}
