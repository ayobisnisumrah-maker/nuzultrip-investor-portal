import type { Metadata } from 'next'

import { PublicPortal } from '@/features/portal/public-portal'
import {
  getPublishedHomePage,
  getPublishedNavigation,
} from '@/server/portal/public-queries'

export async function generateMetadata(): Promise<Metadata> {
  const portal = await getPublishedHomePage()

  const title =
    portal?.page.title ||
    'Nuzultrip Investor Relations'

  return {
    title,
    description:
      'Investor Relations Nuzultrip — peluang investasi untuk mendukung pengembangan digital, penguatan operasional, dan pertumbuhan bisnis.',
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description:
        'Peluang investasi dan informasi hubungan investor Nuzultrip.',
      type: 'website',
    },
  }
}

export default async function Home() {
  const [portal, navigation] = await Promise.all([
    getPublishedHomePage(),
    getPublishedNavigation(),
  ])

  if (!portal) {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Investor Relations
        </p>

        <h1 className="font-display mt-3 text-4xl font-semibold text-fg">
          Nuzultrip Investor Relations
        </h1>

        <p className="mt-4 max-w-2xl text-lg leading-8 text-fg-muted">
          Portal publik Investor Relations Nuzultrip sedang
          dipersiapkan. Informasi investasi akan tersedia setelah
          halaman dipublikasikan oleh Admin.
        </p>

        <div className="mt-8">
          <a
            href="/daftar-investor"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            Ajukan Minat Investasi
          </a>
        </div>
      </main>
    )
  }

  return (
    <PublicPortal
      page={{
        title: portal.page.title,
        seo: portal.page.seo,
      }}
      sections={portal.sections}
      navigation={navigation}
    />
  )
}