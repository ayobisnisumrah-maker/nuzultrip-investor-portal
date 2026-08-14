import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import '@/styles/globals.css'
import { fontVariables } from '@/ui/fonts'
import { ThemeProvider, resolveInitialTheme } from '@/ui/theme/theme-provider'
import { THEME_COOKIE, themeAttribute } from '@/ui/theme/theme'

export const metadata: Metadata = {
  title: {
    default: 'Nuzultrip Investor Relations',
    template: '%s · Nuzultrip Investor Relations',
  },
  description:
    'Platform hubungan investor Nuzultrip — informasi perusahaan, materi investor, pelaporan, dan komunikasi.',
  // The portal opts back in per-route once Phase 9 lands; private surfaces
  // never do.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f8f6' },
    { media: '(prefers-color-scheme: dark)', color: '#091714' },
  ],
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the theme cookie server-side means the correct theme is present in
  // the first byte of HTML — no flash, and no render-blocking inline script.
  const cookieStore = await cookies()
  const preference = resolveInitialTheme(cookieStore.get(THEME_COOKIE)?.value)
  const attribute = themeAttribute(preference)

  return (
    <html
      lang="id"
      {...(attribute ? { 'data-theme': attribute } : {})}
      className={fontVariables}
      suppressHydrationWarning
    >
      <body>
        <a
          href="#main"
          className="sr-only rounded-md bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-toast"
        >
          Lompat ke konten utama
        </a>
        <ThemeProvider initialPreference={preference}>{children}</ThemeProvider>
      </body>
    </html>
  )
}
