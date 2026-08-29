import Link from 'next/link'

import type { PublicPortalSection } from '@/server/portal/public-queries'

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function list(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return []

  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === 'object',
  )
}

function SectionContent({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const eyebrow = text(content.eyebrow)
  const title = text(content.title)
  const description =
    text(content.description) ?? text(content.body)
  const ctaLabel =
    text(content.ctaLabel) ?? text(content.cta_label)
  const ctaHref =
    text(content.ctaHref) ?? text(content.cta_href)

  const items = list(
    content.items ?? content.stats ?? content.faqs,
  )

  return (
    <section
      id={section.anchor_id ?? section.id}
      className="border-border scroll-mt-24 border-t py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
              {eyebrow}
            </p>
          ) : null}

          {title ? (
            <h2 className="font-display text-fg mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              {title}
            </h2>
          ) : null}

          {description ? (
            <p className="text-fg-muted mt-5 text-base leading-8 sm:text-lg">
              {description}
            </p>
          ) : null}
        </div>

        {items.length > 0 ? (
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => {
              const itemTitle =
                text(item.title) ??
                text(item.label) ??
                `Item ${index + 1}`

              const itemBody =
                text(item.description) ??
                text(item.value) ??
                text(item.body)

              return (
                <article
                  key={`${section.id}-${index}`}
                  className="border-border bg-surface rounded-2xl border p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <h3 className="font-display text-fg text-lg font-semibold">
                    {itemTitle}
                  </h3>

                  {itemBody ? (
                    <p className="text-fg-muted mt-3 text-sm leading-7">
                      {itemBody}
                    </p>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : null}

        {ctaLabel && ctaHref ? (
          <div className="mt-10">
            <Link
              href={ctaHref}
              className="bg-primary text-primary-foreground inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-opacity hover:opacity-90"
            >
              {ctaLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function PublicPortal({
  page,
  sections,
  navigation,
}: {
  page: {
    title: string
    seo: unknown
  }
  sections: PublicPortalSection[]
  navigation: Array<{
    id: string
    label: string
    href: string
    target: string
    parent_id: string | null
  }>
}) {
  const primaryNavigation = navigation.filter(
    (item) => !item.parent_id,
  )

  const pageTitle = text(page.title)

  return (
    <div className="bg-background text-fg min-h-dvh">
      <header className="border-border/80 bg-background/90 sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-6 lg:px-8">
          <Link
            href="/"
            className="font-display text-fg flex items-center gap-2 text-xl font-bold tracking-tight"
          >
            <span className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-xl text-sm">
              N
            </span>
            <span>{pageTitle ?? 'Investor Portal'}</span>
          </Link>

          <nav
            aria-label="Navigasi utama"
            className="hidden items-center gap-7 lg:flex"
          >
            {primaryNavigation.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                target={item.target === '_blank' ? '_blank' : undefined}
                rel={item.target === '_blank' ? 'noreferrer' : undefined}
                className="text-fg-muted hover:text-fg text-sm font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/masuk"
              className="border-border text-fg hidden min-h-10 items-center rounded-xl border px-4 text-sm font-semibold transition-colors hover:bg-surface sm:inline-flex"
            >
              Masuk
            </Link>

            <Link
              href="/daftar-investor"
              className="bg-primary text-primary-foreground inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-sm transition-opacity hover:opacity-90 sm:px-5"
            >
              Jadi Investor
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {pageTitle ? (
          <section className="relative overflow-hidden border-b">
            <div className="pointer-events-none absolute inset-0">
              <div className="bg-primary/10 absolute -top-40 -right-40 h-96 w-96 rounded-full blur-3xl" />
              <div className="bg-primary/5 absolute -bottom-48 -left-32 h-96 w-96 rounded-full blur-3xl" />
            </div>

            <div className="relative mx-auto flex min-h-[calc(70dvh-72px)] max-w-7xl items-center px-6 py-20 lg:px-8 lg:py-24">
              <div className="max-w-4xl">
                <p className="text-primary text-xs font-bold tracking-[0.18em] uppercase">
                  {pageTitle}
                </p>

                <h1 className="font-display text-fg mt-5 text-5xl leading-[1.02] font-semibold tracking-[-0.035em] sm:text-6xl lg:text-7xl">
                  {pageTitle}
                </h1>
              </div>
            </div>
          </section>
        ) : null}

        {sections.length > 0 ? (
          sections.map((section) => (
            <SectionContent
              key={section.id}
              section={section}
            />
          ))
        ) : (
          <section className="border-border border-b py-24">
            <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
              <h2 className="font-display text-fg text-2xl font-semibold">
                Belum ada konten yang dipublikasikan.
              </h2>
              <p className="text-fg-muted mt-3 leading-7">
                Konten portal akan tampil setelah dipublikasikan melalui
                pengelolaan portal.
              </p>
            </div>
          </section>
        )}

        <section className="border-border border-t py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="border-border bg-surface rounded-[2rem] border p-8 sm:p-12 lg:p-16">
              <div className="max-w-3xl">
                <h2 className="font-display text-fg text-3xl font-semibold tracking-tight sm:text-4xl">
                  {pageTitle ?? 'Investor Portal'}
                </h2>

                <p className="text-fg-muted mt-5 max-w-2xl text-base leading-7 sm:text-lg">
                  Silakan gunakan navigasi portal untuk melihat informasi yang
                  telah dipublikasikan.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/daftar-investor"
                    className="bg-primary text-primary-foreground inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold transition-opacity hover:opacity-90"
                  >
                    Jadi Investor
                  </Link>

                  <Link
                    href="/masuk"
                    className="border-border text-fg inline-flex min-h-12 items-center justify-center rounded-xl border px-6 text-sm font-semibold transition-colors hover:bg-background"
                  >
                    Masuk ke Portal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-border border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <p className="font-display text-fg font-semibold">
              {pageTitle ?? 'Investor Portal'}
            </p>
            <p className="text-fg-muted mt-1 text-xs">
              Public Investor Portal
            </p>
          </div>

          <div className="text-fg-subtle flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <Link
              href="/"
              className="hover:text-fg transition-colors"
            >
              Beranda
            </Link>

            <Link
              href="/daftar-investor"
              className="hover:text-fg transition-colors"
            >
              Jadi Investor
            </Link>

            <Link
              href="/masuk"
              className="hover:text-fg transition-colors"
            >
              Masuk
            </Link>
          </div>

          <p className="text-fg-subtle text-xs">
            © {new Date().getFullYear()} {pageTitle ?? 'Investor Portal'}
          </p>
        </div>
      </footer>
    </div>
  )
}
