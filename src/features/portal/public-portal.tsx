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

function money(value: unknown, currency = 'IDR'): string | null {
  const raw = text(value)
  if (!raw) return null

  const numeric = Number(raw.replace(/[^\d.-]/g, ''))
  if (!Number.isFinite(numeric)) return raw

  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(numeric)
  } catch {
    return raw
  }
}

function SectionShell({
  section,
  children,
  eyebrow,
  title,
  description,
}: {
  section: PublicPortalSection
  children: React.ReactNode
  eyebrow?: string | null
  title?: string | null
  description?: string | null
}) {
  return (
    <section
      id={section.anchor_id ?? section.id}
      className="border-border scroll-mt-24 border-t py-20 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {(eyebrow || title || description) && (
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
              <p className="text-fg-muted mt-5 text-base leading-8 sm:text-lg">{description}</p>
            ) : null}
          </div>
        )}

        {children}
      </div>
    </section>
  )
}

function IntroSection({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const title = text(content.title)
  const description = text(content.description)

  return (
    <SectionShell
      section={section}
      eyebrow={text(content.eyebrow)}
      title={title}
      description={description}
    >
      {description ? (
        <div className="mt-10 max-w-4xl">
          <div className="border-primary/20 bg-primary/5 rounded-3xl border p-7 sm:p-10">
            <p className="text-fg text-lg leading-8 sm:text-xl sm:leading-9">{description}</p>
          </div>
        </div>
      ) : null}
    </SectionShell>
  )
}

function VisionMissionSection({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const title = text(content.title)
  const vision = text(content.vision)
  const mission = Array.isArray(content.mission)
    ? content.mission.filter(
        (item): item is string => typeof item === 'string' && Boolean(item.trim()),
      )
    : []

  return (
    <SectionShell section={section} eyebrow={text(content.eyebrow)} title={title}>
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <article className="border-border bg-surface rounded-3xl border p-7 shadow-sm sm:p-9">
          <p className="text-primary text-xs font-bold tracking-[0.16em] uppercase">
            {text(content.vision_label)}
          </p>

          <p className="text-fg mt-5 text-xl leading-9 font-medium">{vision}</p>
        </article>

        <article className="border-border bg-surface rounded-3xl border p-7 shadow-sm sm:p-9">
          <p className="text-primary text-xs font-bold tracking-[0.16em] uppercase">
            {text(content.mission_label)}
          </p>

          {mission.length > 0 ? (
            <ol className="mt-5 space-y-4">
              {mission.map((item, index) => (
                <li key={`${section.id}-mission-${index}`} className="flex gap-4">
                  <span className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                    {index + 1}
                  </span>

                  <span className="text-fg-muted pt-1 text-sm leading-7">{item}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </article>
      </div>
    </SectionShell>
  )
}

function CardItemsSection({
  section,
  eyebrow,
}: {
  section: PublicPortalSection
  eyebrow?: string
}) {
  const content = section.content
  const title = text(content.title)
  const description = text(content.description)
  const items = list(content.items)

  return (
    <SectionShell section={section} eyebrow={eyebrow} title={title} description={description}>
      {items.length > 0 ? (
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const itemTitle = text(item.title) ?? text(item.label) ?? `Item ${index + 1}`

            const itemBody = text(item.description) ?? text(item.body) ?? text(item.value)

            return (
              <article
                key={`${section.id}-${index}`}
                className="border-border bg-surface rounded-2xl border p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold">
                  {String(index + 1).padStart(2, '0')}
                </div>

                <h3 className="font-display text-fg mt-6 text-lg font-semibold">{itemTitle}</h3>

                {itemBody ? (
                  <p className="text-fg-muted mt-3 text-sm leading-7">{itemBody}</p>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <EmptySectionMessage />
      )}
    </SectionShell>
  )
}

function GrowthSection({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const title = text(content.title)
  const description = text(content.description)
  const milestones = list(content.milestones)

  return (
    <SectionShell
      section={section}
      eyebrow={text(content.eyebrow)}
      title={title}
      description={description}
    >
      {milestones.length > 0 ? (
        <div className="relative mt-12">
          <div className="bg-border absolute top-0 left-[15px] hidden h-full w-px md:block" />

          <div className="space-y-7">
            {milestones.map((item, index) => {
              const year = text(item.year) ?? text(item.date) ?? text(item.period)

              const itemTitle = text(item.title) ?? text(item.label) ?? `Milestone ${index + 1}`

              const body = text(item.description) ?? text(item.body)

              return (
                <article key={`${section.id}-growth-${index}`} className="relative md:pl-12">
                  <span className="bg-primary ring-background absolute top-1 left-0 hidden h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-8 md:flex">
                    {index + 1}
                  </span>

                  <div className="border-border bg-surface rounded-2xl border p-6 shadow-sm">
                    {year ? (
                      <p className="text-primary text-xs font-bold tracking-[0.14em] uppercase">
                        {year}
                      </p>
                    ) : null}

                    <h3 className="font-display text-fg mt-2 text-lg font-semibold">{itemTitle}</h3>

                    {body ? <p className="text-fg-muted mt-3 text-sm leading-7">{body}</p> : null}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      ) : (
        <EmptySectionMessage />
      )}
    </SectionShell>
  )
}

function InvestmentSection({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const title = text(content.title)
  const description = text(content.description)
  const target = money(content.funding_target, text(content.funding_currency) ?? 'IDR')
  const useOfFunds = list(content.use_of_funds)

  return (
    <SectionShell
      section={section}
      eyebrow={text(content.eyebrow)}
      title={title}
      description={description}
    >
      <div className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="bg-primary text-primary-foreground rounded-3xl p-8 shadow-lg sm:p-10">
          <p className="text-xs font-bold tracking-[0.16em] uppercase opacity-80">
            {text(content.funding_label)}
          </p>

          <p className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            {target ?? text(content.funding_target) ?? '—'}
          </p>

          {description ? <p className="mt-5 text-sm leading-7 opacity-85">{description}</p> : null}
        </div>

        <div>
          <p className="text-fg text-sm font-semibold">Penggunaan Dana</p>

          {useOfFunds.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {useOfFunds.map((item, index) => (
                <article
                  key={`${section.id}-fund-${index}`}
                  className="border-border bg-surface rounded-2xl border p-5"
                >
                  <p className="text-primary text-xs font-bold">
                    {String(index + 1).padStart(2, '0')}
                  </p>

                  <h3 className="text-fg mt-3 text-sm font-semibold">
                    {text(item.title) ?? `Prioritas ${index + 1}`}
                  </h3>

                  {text(item.description) ? (
                    <p className="text-fg-muted mt-2 text-sm leading-6">{text(item.description)}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptySectionMessage />
          )}
        </div>
      </div>
    </SectionShell>
  )
}

function MetricsSection({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const title = text(content.title)
  const description = text(content.description)
  const metrics = list(content.metrics)

  return (
    <SectionShell
      section={section}
      eyebrow={text(content.eyebrow)}
      title={title}
      description={description}
    >
      {metrics.length > 0 ? (
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => {
            const label = text(metric.label) ?? text(metric.title) ?? `Metric ${index + 1}`

            const value = text(metric.value) ?? text(metric.amount) ?? text(metric.number) ?? '—'

            const detail = text(metric.description) ?? text(metric.subtitle)

            return (
              <article
                key={`${section.id}-metric-${index}`}
                className="border-border bg-surface rounded-2xl border p-6 shadow-sm"
              >
                <p className="text-fg-muted text-xs font-medium uppercase">{label}</p>

                <p className="font-display text-primary mt-3 text-3xl font-bold tracking-tight">
                  {value}
                </p>

                {detail ? <p className="text-fg-muted mt-2 text-xs leading-6">{detail}</p> : null}
              </article>
            )
          })}
        </div>
      ) : (
        <EmptySectionMessage />
      )}
    </SectionShell>
  )
}

function MilestonesSection({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const title = text(content.title)
  const items = list(content.items)

  return (
    <SectionShell section={section} eyebrow={text(content.eyebrow)} title={title}>
      {items.length > 0 ? (
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            const year = text(item.year) ?? text(item.date) ?? text(item.period)

            return (
              <article
                key={`${section.id}-milestone-${index}`}
                className="border-border bg-surface rounded-2xl border p-6"
              >
                <p className="text-primary text-sm font-bold">
                  {year ?? String(index + 1).padStart(2, '0')}
                </p>

                <h3 className="text-fg mt-4 text-base font-semibold">
                  {text(item.title) ?? text(item.label) ?? 'Pencapaian'}
                </h3>

                {text(item.description) ? (
                  <p className="text-fg-muted mt-3 text-sm leading-7">{text(item.description)}</p>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <EmptySectionMessage />
      )}
    </SectionShell>
  )
}

function StrategicDirectionSection({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const title = text(content.title)
  const description = text(content.description)
  const pillars = list(content.pillars)

  return (
    <SectionShell
      section={section}
      eyebrow={text(content.eyebrow)}
      title={title}
      description={description}
    >
      {pillars.length > 0 ? (
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {pillars.map((pillar, index) => (
            <article
              key={`${section.id}-pillar-${index}`}
              className="border-border bg-surface rounded-3xl border p-7"
            >
              <span className="text-primary text-xs font-bold">0{index + 1}</span>

              <h3 className="font-display text-fg mt-5 text-xl font-semibold">
                {text(pillar.title) ?? `Pilar Strategis ${index + 1}`}
              </h3>

              {text(pillar.description) ? (
                <p className="text-fg-muted mt-3 text-sm leading-7">{text(pillar.description)}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptySectionMessage />
      )}
    </SectionShell>
  )
}

function DocumentsSection({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const title = text(content.title)
  const description = text(content.description)
  const items = list(content.items)

  return (
    <SectionShell
      section={section}
      eyebrow={text(content.eyebrow)}
      title={title}
      description={description}
    >
      {items.length > 0 ? (
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {items.map((item, index) => {
            const label = text(item.title) ?? text(item.label) ?? `Dokumen ${index + 1}`

            const href = text(item.href) ?? text(item.url)

            return (
              <div
                key={`${section.id}-document-${index}`}
                className="border-border bg-surface flex items-center justify-between gap-5 rounded-2xl border p-5"
              >
                <div>
                  <p className="text-fg text-sm font-semibold">{label}</p>

                  {text(item.description) ? (
                    <p className="text-fg-muted mt-1 text-xs leading-6">{text(item.description)}</p>
                  ) : null}
                </div>

                {href ? (
                  <Link
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noreferrer' : undefined}
                    className="border-border text-fg hover:bg-background shrink-0 rounded-xl border px-4 py-2 text-xs font-semibold"
                  >
                    Lihat
                  </Link>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <EmptySectionMessage />
      )}
    </SectionShell>
  )
}

function ContactCtaSection({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const title = text(content.title)
  const description = text(content.description)
  const label = text(content.primary_cta_label)
  const href = text(content.primary_cta_href)

  return (
    <section id={section.anchor_id ?? section.id} className="border-border border-t py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="bg-primary text-primary-foreground overflow-hidden rounded-[2rem] p-8 sm:p-12 lg:p-16">
          <div className="max-w-3xl">
            <p className="text-xs font-bold tracking-[0.16em] uppercase opacity-80">
              {text(content.eyebrow)}
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>

            {description ? (
              <p className="mt-5 text-base leading-8 opacity-90 sm:text-lg">{description}</p>
            ) : null}

            {label && href ? (
              <Link
                href={href}
                className="text-fg mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold transition-opacity hover:opacity-90"
              >
                {label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function LegalSection({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const title = text(content.title)
  const body = text(content.content)

  return (
    <SectionShell section={section} eyebrow={text(content.eyebrow)} title={title}>
      <div className="border-border bg-muted/20 mt-10 rounded-2xl border p-6 sm:p-8">
        <p className="text-fg-muted text-sm leading-7 whitespace-pre-line">{body}</p>
      </div>
    </SectionShell>
  )
}

function RichContentSection({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const title = text(content.title)
  const body = text(content.content)

  return (
    <SectionShell section={section} eyebrow={text(content.eyebrow)} title={title}>
      <div className="prose prose-neutral dark:prose-invert mt-10 max-w-4xl">
        <p className="text-fg-muted text-base leading-8 whitespace-pre-line">{body}</p>
      </div>
    </SectionShell>
  )
}

function LogoWallSection({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const title = text(content.title)
  const logos = list(content.logos)

  return (
    <SectionShell section={section} eyebrow={text(content.eyebrow)} title={title}>
      {logos.length > 0 ? (
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {logos.map((logo, index) => {
            const label =
              text(logo.name) ?? text(logo.title) ?? text(logo.label) ?? `Partner ${index + 1}`

            const href = text(logo.href) ?? text(logo.url)

            const contentNode = (
              <div className="border-border bg-surface flex min-h-28 items-center justify-center rounded-2xl border p-5 text-center">
                {text(logo.image_url) || text(logo.image) ? (
                  <img
                    src={text(logo.image_url) ?? text(logo.image) ?? ''}
                    alt={label}
                    className="max-h-14 max-w-full object-contain"
                  />
                ) : (
                  <span className="text-fg text-sm font-semibold">{label}</span>
                )}
              </div>
            )

            return href ? (
              <Link
                key={`${section.id}-logo-${index}`}
                href={href}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noreferrer' : undefined}
              >
                {contentNode}
              </Link>
            ) : (
              <div key={`${section.id}-logo-${index}`}>{contentNode}</div>
            )
          })}
        </div>
      ) : (
        <EmptySectionMessage />
      )}
    </SectionShell>
  )
}

function FaqSection({ section }: { section: PublicPortalSection }) {
  const content = section.content
  const title = text(content.title)
  const items = list(content.items)

  return (
    <SectionShell section={section} eyebrow={text(content.eyebrow)} title={title}>
      {items.length > 0 ? (
        <div className="mt-12 max-w-4xl space-y-3">
          {items.map((item, index) => {
            const question =
              text(item.question) ??
              text(item.title) ??
              text(item.label) ??
              `Pertanyaan ${index + 1}`

            const answer = text(item.answer) ?? text(item.description) ?? text(item.body)

            return (
              <details
                key={`${section.id}-faq-${index}`}
                className="border-border bg-surface group rounded-2xl border p-5"
              >
                <summary className="text-fg cursor-pointer list-none pr-8 text-sm font-semibold">
                  {question}
                </summary>

                {answer ? <p className="text-fg-muted mt-4 text-sm leading-7">{answer}</p> : null}
              </details>
            )
          })}
        </div>
      ) : (
        <EmptySectionMessage />
      )}
    </SectionShell>
  )
}

function EmptySectionMessage() {
  return null
}

function SectionContent({ section }: { section: PublicPortalSection }) {
  switch (section.section_kind) {
    case 'hero_3d':
      return null

    case 'intro':
      return <IntroSection section={section} />

    case 'vision_mission':
      return <VisionMissionSection section={section} />

    case 'business_overview':
      return <CardItemsSection section={section} />

    case 'growth_story':
      return <GrowthSection section={section} />

    case 'ecosystem':
      return <CardItemsSection section={section} />

    case 'investment_info':
      return <InvestmentSection section={section} />

    case 'milestones':
      return <MilestonesSection section={section} />

    case 'strategic_direction':
      return <StrategicDirectionSection section={section} />

    case 'financial_highlights':
      return <MetricsSection section={section} />

    case 'investor_updates':
      return <CardItemsSection section={section} />

    case 'documents':
      return <DocumentsSection section={section} />

    case 'contact_cta':
      return <ContactCtaSection section={section} />

    case 'legal_notice':
      return <LegalSection section={section} />

    case 'rich_content':
      return <RichContentSection section={section} />

    case 'stat_grid':
      return <MetricsSection section={section} />

    case 'logo_wall':
      return <LogoWallSection section={section} />

    case 'faq':
      return <FaqSection section={section} />

    default:
      return null
  }
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
    location: 'header' | 'footer' | 'legal' | 'social'
    label: string
    href: string
    target: string
    position: number
    parent_id: string | null
  }>
}) {
  const headerNavigation = navigation.filter((item) => item.location === 'header')
  const footerNavigation = navigation.filter((item) => item.location === 'footer')
  const legalNavigation = navigation.filter((item) => item.location === 'legal')
  const socialNavigation = navigation.filter((item) => item.location === 'social')

  const primaryNavigation = headerNavigation
    .filter((item) => !item.parent_id)
    .sort((a, b) => a.position - b.position)

  const navigationChildren = new Map<string, typeof headerNavigation>()

  for (const item of headerNavigation) {
    if (!item.parent_id) continue

    const children = navigationChildren.get(item.parent_id) ?? []
    children.push(item)
    navigationChildren.set(item.parent_id, children)
  }

  for (const children of navigationChildren.values()) {
    children.sort((a, b) => a.position - b.position)
  }

  const pageTitle = text(page.title)

  const heroSection = sections.find((section) => section.section_kind === 'hero_3d')

  const regularSections = sections.filter(
    (section) => section.section_kind !== 'hero_3d' && section.section_kind !== 'contact_cta',
  )

  const heroContent = heroSection?.content ?? {}
  const heroEyebrow = text(heroContent.eyebrow)
  const heroTitle = text(heroContent.title)
  const heroDescription = text(heroContent.description)
  const primaryCtaLabel = text(heroContent.primary_cta_label)
  const primaryCtaHref = text(heroContent.primary_cta_href)
  const secondaryCtaLabel = text(heroContent.secondary_cta_label)
  const secondaryCtaHref = text(heroContent.secondary_cta_href)

  const contactCtaSection = sections.find((section) => section.section_kind === 'contact_cta')

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

            {pageTitle ? <span>{pageTitle}</span> : null}
          </Link>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-7 lg:flex">
            {primaryNavigation.map((item) => {
              const children = navigationChildren.get(item.id) ?? []

              if (children.length === 0) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    target={item.target === '_blank' ? '_blank' : undefined}
                    rel={item.target === '_blank' ? 'noreferrer' : undefined}
                    className="text-fg-muted hover:text-fg text-sm font-medium transition-colors"
                  >
                    {item.label}
                  </Link>
                )
              }

              return (
                <details key={item.id} className="group relative">
                  <summary className="text-fg-muted hover:text-fg flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium transition-colors [&::-webkit-details-marker]:hidden">
                    <span>{item.label}</span>

                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform duration-200 group-open:rotate-180"
                    >
                      <path
                        d="m5.5 7.5 4.5 4.5 4.5-4.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </summary>

                  <div className="border-border bg-background absolute top-full left-1/2 z-50 mt-3 w-56 -translate-x-1/2 overflow-hidden rounded-xl border p-1.5 shadow-xl">
                    <div className="absolute -top-3 left-0 h-3 w-full" />

                    {children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.href}
                        target={child.target === '_blank' ? '_blank' : undefined}
                        rel={child.target === '_blank' ? 'noreferrer' : undefined}
                        className="text-fg-muted hover:bg-surface hover:text-fg block rounded-lg px-3 py-2.5 text-sm transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </details>
              )
            })}
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/masuk"
              className="border-border text-fg hover:bg-surface hidden min-h-10 items-center rounded-xl border px-4 text-sm font-semibold transition-colors sm:inline-flex"
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
        {heroSection ? (
          <section className="relative overflow-hidden border-b">
            <div className="pointer-events-none absolute inset-0">
              <div className="bg-primary/10 absolute -top-40 -right-40 h-[32rem] w-[32rem] rounded-full blur-3xl" />
              <div className="bg-primary/5 absolute -bottom-48 -left-32 h-[28rem] w-[28rem] rounded-full blur-3xl" />
            </div>

            <div className="relative mx-auto flex min-h-[calc(78dvh-72px)] max-w-7xl items-center px-6 py-20 lg:px-8 lg:py-24">
              <div className="max-w-5xl">
                {heroEyebrow ? (
                  <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">
                    {heroEyebrow}
                  </p>
                ) : null}

                {heroTitle ? (
                  <h1 className="font-display text-fg mt-5 max-w-5xl text-5xl leading-[1.02] font-semibold tracking-[-0.04em] sm:text-6xl lg:text-8xl">
                    {heroTitle}
                  </h1>
                ) : null}

                {heroDescription ? (
                  <p className="text-fg-muted mt-7 max-w-3xl text-base leading-8 sm:text-xl sm:leading-9">
                    {heroDescription}
                  </p>
                ) : null}

                {(primaryCtaLabel && primaryCtaHref) || (secondaryCtaLabel && secondaryCtaHref) ? (
                  <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                    {primaryCtaLabel && primaryCtaHref ? (
                      <Link
                        href={primaryCtaHref}
                        className="bg-primary text-primary-foreground inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold transition-opacity hover:opacity-90"
                      >
                        {primaryCtaLabel}
                      </Link>
                    ) : null}

                    {secondaryCtaLabel && secondaryCtaHref ? (
                      <Link
                        href={secondaryCtaHref}
                        className="border-border text-fg hover:bg-surface inline-flex min-h-12 items-center justify-center rounded-xl border px-6 text-sm font-semibold transition-colors"
                      >
                        {secondaryCtaLabel}
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {regularSections.map((section) => (
          <SectionContent key={section.id} section={section} />
        ))}

        {contactCtaSection ? <SectionContent section={contactCtaSection} /> : null}
      </main>

      <footer className="border-border border-t">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {pageTitle ? (
              <div>
                <p className="font-display text-fg font-semibold">{pageTitle}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-4 sm:items-end">
              {footerNavigation.length > 0 ? (
                <nav
                  aria-label="Navigasi footer"
                  className="text-fg-subtle flex flex-wrap gap-x-5 gap-y-2 text-xs"
                >
                  {footerNavigation
                    .filter((item) => !item.parent_id)
                    .map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        target={item.target === '_blank' ? '_blank' : undefined}
                        rel={item.target === '_blank' ? 'noreferrer' : undefined}
                        className="hover:text-fg transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                </nav>
              ) : null}

              {legalNavigation.length > 0 ? (
                <nav
                  aria-label="Navigasi legal"
                  className="text-fg-subtle flex flex-wrap gap-x-5 gap-y-2 text-xs"
                >
                  {legalNavigation
                    .filter((item) => !item.parent_id)
                    .map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        target={item.target === '_blank' ? '_blank' : undefined}
                        rel={item.target === '_blank' ? 'noreferrer' : undefined}
                        className="hover:text-fg transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                </nav>
              ) : null}

              {socialNavigation.length > 0 ? (
                <nav
                  aria-label="Media sosial"
                  className="text-fg-subtle flex flex-wrap gap-x-4 gap-y-2 text-xs"
                >
                  {socialNavigation
                    .filter((item) => !item.parent_id)
                    .map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        target={item.target === '_blank' ? '_blank' : undefined}
                        rel={item.target === '_blank' ? 'noreferrer' : undefined}
                        className="hover:text-fg transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                </nav>
              ) : null}
            </div>
          </div>

          <div className="border-border mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-fg-subtle text-xs">
              © {new Date().getFullYear()} {pageTitle}
            </p>

            <p className="text-fg-subtle text-xs">Investor Relations Portal</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
