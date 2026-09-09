import type { CSSProperties } from 'react'
import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'

import '@/styles/globals.css'
import '@/styles/public-portal-rounded.css'
import '@/styles/public-portal-hero-title.css'
import '@/styles/public-portal-functional.css'
import '@/styles/public-portal-header-override.css'
import '@/styles/global-typography.css'

import { getClientEnv } from '@/lib/env'
import { getPublicBrandLogo } from '@/server/portal/public-branding'
import { getPublicBrandName } from '@/server/settings/brand'
import { getTypographySettings, typographyCssVariables } from '@/server/settings/typography'
import { fontVariables } from '@/ui/fonts'
import { ThemeProvider } from '@/ui/theme/theme-provider'
import { THEME_COOKIE, resolveInitialTheme, themeAttribute } from '@/ui/theme/theme'

const env = getClientEnv()
const browserIcon = '/brand/nuzultrip-browser-icon.png'

export async function generateMetadata(): Promise<Metadata> {
  const [brandName, brandLogoUrl] = await Promise.all([
    getPublicBrandName(),
    getPublicBrandLogo(),
  ])

  return {
    title: {
      default: brandName,
      template: `%s · ${brandName}`,
    },
    description:
      'Platform resmi untuk informasi perusahaan, pengelolaan equity, kepemilikan, dan komunikasi pemangku kepentingan.',
    applicationName: brandName,
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    icons: {
      icon: browserIcon,
      shortcut: browserIcon,
      apple: browserIcon,
    },
    openGraph: {
      type: 'website',
      siteName: brandName,
      title: brandName,
      description:
        'Platform resmi untuk informasi perusahaan, pengelolaan equity, kepemilikan, dan komunikasi pemangku kepentingan.',
      ...(brandLogoUrl ? { images: [{ url: brandLogoUrl, alt: brandName }] } : {}),
    },
    robots: {
      index: true,
      follow: true,
    },
  }
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
  const [cookieStore, typographySettings] = await Promise.all([
    cookies(),
    getTypographySettings(),
  ])
  const initialTheme = resolveInitialTheme(cookieStore.get(THEME_COOKIE)?.value)
  const typographyStyle = typographyCssVariables(typographySettings) as CSSProperties

  return (
    <html
      lang="id"
      data-theme={themeAttribute(initialTheme)}
      style={typographyStyle}
      suppressHydrationWarning
    >
      <body
        className={`${fontVariables} bg-background text-foreground min-h-dvh font-sans antialiased`}
      >
        <ThemeProvider initialPreference={initialTheme}>{children}</ThemeProvider>
      </body>
    </html>
  )
}
