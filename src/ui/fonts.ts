import { JetBrains_Mono, Newsreader, Plus_Jakarta_Sans } from 'next/font/google'

/**
 * Typefaces are self-hosted by `next/font` at build time. Nothing is fetched
 * from a font CDN at runtime — which is both a performance decision and a
 * requirement of the Content-Security-Policy (docs/SECURITY.md §7).
 *
 * See docs/DESIGN-SYSTEM.md §3 for the rationale behind each choice.
 */

/** Display — editorial gravitas. Reads as a considered publication. */
export const fontDisplay = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  preload: true,
})

/** UI and body — designed in Jakarta. A real, non-decorative identity signal. */
export const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  preload: true,
})

/** Numeric — tabular financial figures, reference codes, checksums. */
export const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: false,
})

export const fontVariables = [fontDisplay.variable, fontSans.variable, fontMono.variable].join(' ')
