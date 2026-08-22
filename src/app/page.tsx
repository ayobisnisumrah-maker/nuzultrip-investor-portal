import { PublicPortal } from '@/features/portal/public-portal'
import { getPublishedHomePage, getPublishedNavigation } from '@/server/portal/public-queries'

export default async function Home() {
  const [portal, navigation] = await Promise.all([getPublishedHomePage(), getPublishedNavigation()])

  if (!portal) {
    return (
      <main
        id="main"
        className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16"
      >
        <p className="text-caption text-fg-subtle font-medium tracking-[0.16em] uppercase">
          Investor Relations
        </p>
        <h1 className="font-display text-display-lg text-fg mt-3">Nuzultrip Investor Portal</h1>
        <p className="text-body-lg text-fg-muted mt-4 max-w-2xl leading-8">
          Portal publik belum dipublikasikan. Silakan kembali setelah konten Investor Relations
          tersedia.
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
