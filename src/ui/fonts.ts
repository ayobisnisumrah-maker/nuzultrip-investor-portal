import { Figtree } from 'next/font/google'

/**
 * Figtree is the single type family for the whole product surface: public
 * portal, authentication, investor portal, admin dashboard, financial data,
 * and operational UI. `next/font` self-hosts the generated assets at build
 * time, so no font CDN is contacted at runtime.
 *
 * The three exports intentionally preserve the existing design-system
 * contracts (`display`, `sans`, and `mono`) while resolving all of them to
 * Figtree. This lets the product change typography globally without forcing
 * feature-level refactors.
 */

export const fontDisplay = Figtree({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  preload: true,
})

export const fontSans = Figtree({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  preload: true,
})

export const fontMono = Figtree({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: true,
})

export const fontVariables = [fontDisplay.variable, fontSans.variable, fontMono.variable].join(' ')
