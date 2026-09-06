import type { Metadata } from 'next'

import { PublicPortalReference } from '@/features/portal/public-portal-reference'
import {
  getActivePortalTheme,
  getPublishedHomePage,
  getPublishedNavigation,
} from '@/server/portal/public-queries'

export async function generateMetadata(): Promise<Metadata> {
  const portal = await getPublishedHomePage()

  if (!portal) {
    return {
      title: 'Nuzultrip Equity Relations',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const seo =
    portal.page.seo && typeof portal.page.seo === 'object' && !Array.isArray(portal.page.seo)
      ? (portal.page.seo as Record<string, unknown>)
      : {}

  const title =
    typeof seo.title === 'string' && seo.title.trim() ? seo.title.trim() : portal.page.title

  const description =
    typeof seo.description === 'string' && seo.description.trim()
      ? seo.description.trim()
      : undefined

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      ...(description ? { description } : {}),
      type: 'website',
    },
  }
}

export default async function Home() {
  const [portal, navigation, theme] = await Promise.all([
    getPublishedHomePage(),
    getPublishedNavigation(),
    getActivePortalTheme(),
  ])

  if (!portal) {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16"
      >
        <p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">
          Nuzultrip Equity Relations
        </p>

        <h1 className="font-display text-fg mt-3 text-4xl font-semibold">
          Portal belum diterbitkan
        </h1>

        <p className="text-fg-muted mt-4 max-w-2xl text-lg leading-8">
          Halaman publik belum tersedia. Konten akan ditampilkan setelah diterbitkan melalui dasbor
          admin.
        </p>
      </main>
    )
  }

  return (
    <PublicPortalReference
      page={{
        title: 'Nuzultrip',
        seo: portal.page.seo,
      }}
      sections={portal.sections}
      navigation={navigation}
      logoUrl={theme?.logo_url}
    />
  )
}
