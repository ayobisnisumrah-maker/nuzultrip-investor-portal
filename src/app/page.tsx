import type { Metadata } from 'next'

import { PublicPortalExact } from '@/features/portal/public-portal-exact'
import { PublicRealtimeSurface } from '@/features/realtime/public-realtime-surface'
import { getPublicBrandLogo } from '@/server/portal/public-branding'
import {
  getPublicDocuments,
  getPublishedHomePage,
  getPublishedNavigation,
} from '@/server/portal/public-queries'

const HOME_SECTION_KINDS = new Set([
  'hero_3d',
  'intro',
  'stat_grid',
  'financial_highlights',
  'investment_info',
  'business_overview',
  'ecosystem',
  'logo_wall',
  'rich_content',
])

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
    portal.page.seo &&
    typeof portal.page.seo === 'object' &&
    !Array.isArray(portal.page.seo)
      ? (portal.page.seo as Record<string, unknown>)
      : {}

  const title =
    typeof seo.title === 'string' && seo.title.trim()
      ? seo.title.trim()
      : portal.page.title

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
  const [portal, navigation, publicDocuments, brandLogoUrl] = await Promise.all([
    getPublishedHomePage(),
    getPublishedNavigation(),
    getPublicDocuments(),
    getPublicBrandLogo(),
  ])

  if (!portal) {
    return (
      <PublicRealtimeSurface>
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
            Halaman publik belum tersedia. Konten akan ditampilkan setelah diterbitkan melalui dasbor admin.
          </p>
        </main>
      </PublicRealtimeSurface>
    )
  }

  const homepageSections = portal.sections.filter((section) =>
    HOME_SECTION_KINDS.has(section.section_kind),
  )

  return (
    <PublicRealtimeSurface>
      <PublicPortalExact
        page={{
          title: 'Nuzultrip',
          seo: portal.page.seo,
        }}
        sections={homepageSections}
        navigation={navigation}
        publicDocuments={publicDocuments}
        brandLogoUrl={brandLogoUrl}
      />
    </PublicRealtimeSurface>
  )
}
