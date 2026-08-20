import { PublicPortal } from '@/features/portal/public-portal'
import {
  getPublishedHomePage,
  getPublishedNavigation,
} from '@/server/portal/public-queries'

export default async function Home() {
  const [portal, navigation] = await Promise.all([
    getPublishedHomePage(),
    getPublishedNavigation(),
  ])

  if (!portal) {
    return (
      <main id="main" className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
        <p className="text-caption font-medium uppercase tracking-[0.16em] text-fg-subtle">
          Investor Relations
        </p>
        <h1 className="mt-3 font-display text-display-lg text-fg">Nuzultrip Investor Portal</h1>
        <p className="mt-4 max-w-2xl text-body-lg leading-8 text-fg-muted">
          Portal publik belum dipublikasikan. Silakan kembali setelah konten Investor Relations tersedia.
        </p>
      </main>
    )
  }

  return (
    <PublicPortal
      page={{ title: portal.page.title, seo: portal.page.seo }}
      sections={portal.sections}
      navigation={navigation}
    />
  )
}
