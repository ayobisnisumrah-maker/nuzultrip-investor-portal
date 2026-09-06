import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'

import '@/styles/globals.css'
import '@/styles/public-portal-fixes.css'
import '@/styles/portal-public-overrides.css'

import { getClientEnv } from '@/lib/env'
import { fontVariables } from '@/ui/fonts'
import { ThemeProvider } from '@/ui/theme/theme-provider'
import { THEME_COOKIE, resolveInitialTheme, themeAttribute } from '@/ui/theme/theme'

const env = getClientEnv()

export const metadata: Metadata = {
  title: {
    default: 'Nuzultrip Equity Relations',
    template: '%s · Nuzultrip Equity Relations',
  },
  description:
    'Platform resmi Nuzultrip untuk informasi perusahaan, pengelolaan equity, kepemilikan, dan komunikasi pemangku kepentingan.',
  applicationName: 'Nuzultrip Equity Relations',
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  openGraph: {
    type: 'website',
    siteName: 'Nuzultrip Equity Relations',
    title: 'Nuzultrip Equity Relations',
    description:
      'Platform resmi untuk informasi perusahaan, pengelolaan equity, kepemilikan, dan komunikasi pemangku kepentingan.',
  },
  robots: {
    index: true,
    follow: true,
  },
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const initialTheme = resolveInitialTheme(cookieStore.get(THEME_COOKIE)?.value)

  return (
    <html lang="id" data-theme={themeAttribute(initialTheme)} suppressHydrationWarning>
      <body
        className={`${fontVariables} bg-background text-foreground min-h-dvh font-sans antialiased`}
      >
        <ThemeProvider initialPreference={initialTheme}>{children}</ThemeProvider>
      </body>
    </html>
  )
}
