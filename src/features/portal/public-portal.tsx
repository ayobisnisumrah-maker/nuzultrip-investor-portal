import Link from 'next/link'

import type { PublicPortalSection } from '@/server/portal/public-queries'

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function list(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object',
  )
}

function SectionContent({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const eyebrow = text(content.eyebrow)
  const title = text(content.title)
  const description = text(content.description) ?? text(content.body)
  const ctaLabel = text(content.ctaLabel) ?? text(content.cta_label)
  const ctaHref = text(content.ctaHref) ?? text(content.cta_href)
  const items = list(content.items ?? content.stats ?? content.faqs)

  return (
    <section
      id={section.anchor_id ?? section.id}
      className="border-border scroll-mt-24 border-t py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        {eyebrow ? (
          <p className="text-caption text-fg-subtle font-medium tracking-[0.16em] uppercase">
            {eyebrow}
          </p>
        ) : null}

        {title ? (
          <h2 className="font-display text-heading-xl text-fg sm:text-display-sm mt-2 max-w-3xl">
            {title}
          </h2>
        ) : null}

        {description ? (
          <p className="text-body-lg text-fg-muted mt-4 max-w-3xl leading-8 whitespace-pre-line">
            {description}
          </p>
        ) : null}

        {items.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => {
              const itemTitle = text(item.title) ?? text(item.label) ?? `Item ${index + 1}`
              const itemBody = text(item.description) ?? text(item.value) ?? text(item.body)
              return (
                <article
                  key={`${section.id}-${index}`}
                  className="border-border bg-surface rounded-2xl border p-6"
                >
                  <h3 className="font-display text-heading-md text-fg">{itemTitle}</h3>
                  {itemBody ? (
                    <p className="text-body-sm text-fg-muted mt-3 leading-6">{itemBody}</p>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : null}

        {ctaLabel && ctaHref ? (
          <div className="mt-8">
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
  page: { title: string; seo: unknown }
  sections: PublicPortalSection[]
  navigation: Array<{
    id: string
    label: string
    href: string
    target: string
    parent_id: string | null
  }>
}) {
  return (
    <div className="bg-background text-fg min-h-dvh">
      <header className="border-border/80 bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
          <Link href="/" className="font-display text-fg text-lg font-semibold">
            Nuzultrip
          </Link>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-6 md:flex">
            {navigation
              .filter((item) => !item.parent_id)
              .map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  target={item.target === '_blank' ? '_blank' : undefined}
                  rel={item.target === '_blank' ? 'noreferrer' : undefined}
                  className="text-fg-muted hover:text-fg text-sm transition-colors"
                >
                  {item.label}
                </Link>
              ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/masuk"
              className="border-border text-fg hidden rounded-xl border px-4 py-2 text-sm font-medium sm:inline-flex"
            >
              Masuk
            </Link>
            <Link
              href="/daftar-investor"
              className="bg-primary text-primary-foreground inline-flex rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Jadi Investor
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-border relative overflow-hidden border-b">
          <div className="mx-auto grid min-h-[72vh] max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.15fr_.85fr]">
            <div>
              <p className="text-caption text-fg-subtle font-medium tracking-[0.18em] uppercase">
                Investor Relations
              </p>
              <h1 className="font-display text-display-lg text-fg sm:text-display-xl mt-4 max-w-4xl leading-[1.05]">
                {page.title}
              </h1>
              <p className="text-body-lg text-fg-muted mt-6 max-w-2xl leading-8">
                Informasi perusahaan, peluang investasi, dan hubungan investor Nuzultrip dalam satu
                portal resmi.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/daftar-investor"
                  className="bg-primary text-primary-foreground inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold"
                >
                  Mulai Permintaan Investor
                </Link>
                <Link
                  href="/masuk"
                  className="border-border text-fg inline-flex min-h-11 items-center rounded-xl border px-5 text-sm font-semibold"
                >
                  Portal Investor
                </Link>
              </div>
            </div>

            <div className="border-border bg-surface relative aspect-square overflow-hidden rounded-[2rem] border p-6 shadow-sm">
              <div className="border-border absolute inset-6 rounded-[1.5rem] border" />
              <div className="border-primary/30 absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border" />
              <div className="border-primary/50 absolute top-1/2 left-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-2xl border" />
              <div className="text-caption text-fg-subtle absolute inset-x-10 bottom-10 text-center">
                Official Investor Relations
              </div>
            </div>
          </div>
        </section>

        {sections.map((section) => (
          <SectionContent key={section.id} section={section} />
        ))}

        <section className="border-border border-t py-16">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-caption text-fg-subtle font-medium tracking-[0.16em] uppercase">
                Investor Relations
              </p>
              <h2 className="font-display text-heading-xl text-fg mt-2">
                Ingin mengetahui peluang investasi?
              </h2>
              <p className="text-body-sm text-fg-muted mt-2">
                Sampaikan minat Anda dan tim kami akan menindaklanjuti melalui inbox investor
                relations.
              </p>
            </div>
            <Link
              href="/daftar-investor"
              className="bg-primary text-primary-foreground inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-5 text-sm font-semibold"
            >
              Ajukan Minat Investasi
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-border border-t py-8">
        <div className="text-caption text-fg-subtle mx-auto flex max-w-6xl flex-col gap-2 px-6 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Nuzultrip</span>
          <span>Investor Relations</span>
        </div>
      </footer>
    </div>
  )
}
