/**
 * Theme resolution (docs/DESIGN-SYSTEM.md §10).
 *
 * Order of precedence: explicit user choice → CMS default → system preference.
 *
 * There is deliberately no blocking inline script. When the user has made an
 * explicit choice, the server renders `data-theme` on <html> from a cookie, so
 * the correct theme is present in the very first byte. When they have not, no
 * attribute is emitted and `prefers-color-scheme` in CSS decides. Either way
 * there is no flash, and no render-blocking script.
 */

export const THEME_COOKIE = 'ntp-theme'
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value)
}

/**
 * The value for the `data-theme` attribute, or `undefined` when the system
 * preference should decide.
 */
export function themeAttribute(preference: ThemePreference): 'light' | 'dark' | undefined {
  return preference === 'system' ? undefined : preference
}
