import type { ComponentProps, ReactNode } from 'react'
import Link from 'next/link'

import type { PublicPortalModel } from '@/features/portal/public-portal-model'
import type { PublicPortalDocument } from '@/server/portal/public-queries'

import styles from './public-portal-exact.module.css'

type BaseProps = ComponentProps<typeof PublicPortalModel>
type Section = BaseProps['sections'][number]
type NavItem = BaseProps['navigation'][number]

export type PublicPortalExactProps = BaseProps & {
  publicDocuments: PublicPortalDocument[]
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function records(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : []
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : []
}

function sectionByKind(sections: Section[], kind: string) {
  return sections.find((section) => section.section_kind === kind)
}

function usableHref(value: unknown): string | null {
  const href = text(value)
  return href && href !== '#' ? href : null
}

function CmsImage({ src, alt, className }: { src?: string; alt?: string; className?: string }) {
  if (!src) return null
  // Published portal media can be hosted by Supabase Storage or another approved HTTPS origin.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt ?? ''} className={className} />
}

function Arrow() {
  return <span aria-hidden="true">→</span>
}

function Header({ navigation, logoSrc }: { navigation: NavItem[]; logoSrc: string }) {
  const header = navigation
    .filter((item) => item.location === 'header' && !item.parent_id && usableHref(item.href))
    .sort((a, b) => a.position - b.position)

  return (
    <header className={styles.header}>
      <div className={styles.shell}>
        <Link href="/" className={styles.logoLink} aria-label="Nuzultrip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Nuzultrip" className={styles.logo} />
        </Link>
        <nav className={styles.nav} aria-label="Navigasi utama">
          {header.slice(0, 6).map((item) => (
            <Link key={item.id} href={item.href}>{item.label}</Link>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <Link href="/hubungi" className={styles.headerCta}>Ajukan Minat <Arrow /></Link>
          <span className={styles.lang} aria-label="Bahasa Indonesia">◎ ID</span>
        </div>
      </div>
    </header>
  )
}

function Hero({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const titleLines = text(c.title).split('|').map((item) => item.trim()).filter(Boolean).slice(0, 3)
  const tags = strings(c.tags)
  const image = text(c.image_url)
  const imageAlt = text(c.image_alt) || 'Nuzultrip Equity'
  const primaryLabel = text(c.primary_cta_label) || 'Ajukan Minat Equity'
  const primaryHref = usableHref(c.primary_cta_href) || '/hubungi'
  const secondaryLabel = text(c.secondary_cta_label) || 'Pelajari Lebih Lanjut'
  const secondaryHref = usableHref(c.secondary_cta_href) || '#tentang-nuzultrip'

  return (
    <section className={styles.hero} id={section.anchor_id ?? 'beranda'}>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>{text(c.eyebrow) || 'NUZULTRIP EQUITY'}</div>
          <h1>
            {titleLines.length
              ? titleLines.map((line) => <span key={line}>{line}</span>)
              : <><span>Membangun Nilai</span><span>dan Kepemilikan Bersama</span><span>Nuzultrip</span></>}
          </h1>
          {text(c.description) ? <p>{text(c.description)}</p> : null}
          <div className={styles.heroButtons}>
            <Link href={primaryHref} className={styles.lightButton}>{primaryLabel} <Arrow /></Link>
            <Link href={secondaryHref} className={styles.textButton}>{secondaryLabel} <Arrow /></Link>
          </div>
          {tags.length ? (
            <div className={styles.heroTags}>
              {tags.slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          ) : null}
        </div>
        {image ? (
          <div className={styles.heroMedia}>
            <CmsImage src={image} alt={imageAlt} className={styles.heroImage} />
            {text(c.image_caption) ? <div className={styles.heroMediaCaption}>{text(c.image_caption)}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function AboutAndStats({ intro, stats }: { intro?: Section; stats?: Section }) {
  if (!intro && !stats) return null
  const c = intro?.content ?? {}
  const metrics = records(stats?.content.metrics)
  return (
    <section className={styles.section} id={intro?.anchor_id ?? 'tentang-nuzultrip'}>
      <div className={styles.shell}>
        <div className={styles.aboutGrid}>
          <div className={styles.eyebrowDark}>{text(c.eyebrow) || 'TENTANG KAMI'}</div>
          <h2>{text(c.title) || 'Nuzultrip'}</h2>
          <div className={styles.aboutText}>
            {text(c.description) ? <p>{text(c.description)}</p> : null}
            <Link href="#bisnis" className={styles.inlineLink}>Lebih tentang kami <Arrow /></Link>
          </div>
        </div>
        {metrics.length ? (
          <div className={styles.statsGrid}>
            {metrics.slice(0, 4).map((metric, index) => (
              <article key={`${text(metric.label)}-${index}`}>
                <strong>{text(metric.value)}</strong>
                <span>{text(metric.label)}</span>
                {text(metric.description) ? <small>{text(metric.description)}</small> : null}
              </article>
            ))}
            <Link href="/hubungi" className={styles.statsCta}>
              <span className={styles.chartMark}>▥</span>
              <b>Bersama<br />Membangun<br />Dampak Lebih Besar</b>
              <span className={styles.smallCircle}>→</span>
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function Offering({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const rows = records(c.terms)
  return (
    <section className={styles.section} id={section.anchor_id ?? 'ringkasan'}>
      <div className={styles.shell}>
        <div className={styles.offerLayout}>
          <div className={styles.offerIntro}>
            <div className={styles.eyebrowDark}>{text(c.eyebrow) || 'PELUANG EQUITY'}</div>
            <h2>{text(c.title) || 'Kesempatan Bertumbuh Bersama'}</h2>
            {text(c.description) ? <p>{text(c.description)}</p> : null}
            <Link href="/hubungi" className={styles.inlineLink}>Lihat Detail Penawaran <Arrow /></Link>
          </div>
          {rows.length ? (
            <div className={styles.offerTable}>
              {rows.slice(0, 7).map((row, index) => (
                <div className={styles.offerRow} key={`${text(row.label)}-${index}`}>
                  <span>{text(row.label)}</span><strong>{text(row.value)}</strong>
                </div>
              ))}
            </div>
          ) : null}
          <aside className={styles.offerCard}>
            <h3>Investasi Hari Ini,<br />Untuk Masa Depan<br />yang Lebih Baik.</h3>
            <div className={styles.offerRule} />
            <Link href="/hubungi">Ajukan Minat Equity <Arrow /></Link>
            <div className={styles.offerPattern} aria-hidden="true">◢◢◢◢</div>
          </aside>
        </div>
      </div>
    </section>
  )
}

function CompanyStory({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const image = text(c.image_url)
  return (
    <section className={styles.section} id={section.anchor_id ?? 'bisnis'}>
      <div className={styles.shell}>
        <div className={styles.companyGrid}>
          <div>
            <div className={styles.eyebrowDark}>{text(c.eyebrow) || 'PERUSAHAAN'}</div>
            <h2>{text(c.title) || 'Nuzultrip'}</h2>
            {text(c.description) ? <p>{text(c.description)}</p> : null}
            <Link href="#informasi-investor" className={styles.inlineLink}>Kenali Nuzultrip <Arrow /></Link>
          </div>
          {image ? (
            <div className={styles.companyMedia}>
              <CmsImage src={image} alt={text(c.image_alt) || 'Nuzultrip'} />
              {text(c.image_caption) ? <h3>{text(c.image_caption)}</h3> : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function Services({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const items = records(c.items)
  if (!items.length && !text(c.title)) return null

  return (
    <section className={styles.section} id={section.anchor_id ?? 'ekosistem'}>
      <div className={styles.shell}>
        <div className={styles.serviceLayout}>
          <div>
            <div className={styles.eyebrowDark}>{text(c.eyebrow) || 'LAYANAN UTAMA'}</div>
            <h2>{text(c.title) || 'Ekosistem Layanan'}</h2>
          </div>
          {items.length ? (
            <div className={styles.serviceCards}>
              {items.slice(0, 4).map((item, index) => {
                const href = usableHref(item.href)
                return (
                  <article key={`${text(item.title)}-${index}`}>
                    <span className={styles.serviceIcon}>{['✈', '◇', '▢', '⌘'][index]}</span>
                    <h3>{text(item.title)}</h3>
                    {text(item.description) ? <p>{text(item.description)}</p> : null}
                    {href ? <Link href={href} className={styles.cardArrow} aria-label={`Buka ${text(item.title)}`}>→</Link> : null}
                  </article>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function Process({ offering }: { offering?: Section }) {
  if (!offering) return null
  const steps = records(offering.content.process_steps)
  if (!steps.length) return null
  return (
    <section className={styles.section} id="proses">
      <div className={styles.shell}>
        <div className={styles.processLayout}>
          <div>
            <div className={styles.eyebrowDark}>PROSES</div>
            <h2>Langkah Mudah<br />Menjadi Investor</h2>
          </div>
          <div className={styles.processSteps}>
            {steps.slice(0, 4).map((step, index) => (
              <article key={`${text(step.title)}-${index}`}>
                <span className={styles.stepNumber}>0{index + 1}</span>
                <h3>{text(step.title)}</h3>
                {text(step.description) ? <p>{text(step.description)}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Partners({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const logos = records(c.logos)
  if (!logos.length && !text(c.title)) return null

  return (
    <section className={styles.partnerSection} id={section.anchor_id ?? 'mitra'}>
      <div className={styles.shell}>
        <div className={styles.partnerLayout}>
          <div>
            <div className={styles.eyebrowDark}>{text(c.eyebrow) || 'MITRA'}</div>
            <h2>{text(c.title) || 'Mitra yang Tumbuh Bersama'}</h2>
          </div>
          {logos.length ? (
            <div className={styles.partnerLogos}>
              {logos.slice(0, 5).map((logo, index) => (
                <div key={`${text(logo.name)}-${index}`}>
                  {text(logo.image_url) ? <CmsImage src={text(logo.image_url)} alt={text(logo.name)} /> : <span>{text(logo.name)}</span>}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function InvestorInfo({ growth, funds, governance, risks, documents }: { growth?: Section; funds?: Section; governance?: Section; risks?: Section; documents?: Section }) {
  const blocks = [growth, funds, governance, risks, documents].filter(Boolean) as Section[]
  if (!blocks.length) return null

  return (
    <section className={styles.infoSection} id="informasi-investor">
      <div className={styles.shell}>
        <div className={styles.infoHeader}>
          <div className={styles.eyebrowDark}>INFORMASI INVESTOR</div>
          <h2>Informasi penting dalam satu tempat.</h2>
        </div>
        <div className={styles.infoGrid}>
          {blocks.map((section) => {
            const c = section.content
            const items = records(c.items).length
              ? records(c.items)
              : records(c.pillars).length
                ? records(c.pillars)
                : records(c.milestones)

            return (
              <article key={section.id}>
                {text(c.eyebrow) ? <small>{text(c.eyebrow)}</small> : null}
                <h3>{text(c.title)}</h3>
                {text(c.description) ? <p>{text(c.description)}</p> : null}
                {items.length ? (
                  <ul>
                    {items.slice(0, 6).map((item, index) => {
                      const label = text(item.title) || text(item.label)
                      const href = usableHref(item.href)
                      return <li key={`${section.id}-${index}`}>{href ? <Link href={href}>{label}</Link> : label}</li>
                    })}
                  </ul>
                ) : null}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Faq({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const items = records(c.items)
  if (!items.length) return null
  return (
    <section className={styles.section} id={section.anchor_id ?? 'faq'}>
      <div className={styles.shell}>
        <div className={styles.faqLayout}>
          <div>
            <div className={styles.eyebrowDark}>{text(c.eyebrow) || 'FAQ'}</div>
            <h2>{text(c.title) || 'Pertanyaan yang Sering Diajukan'}</h2>
          </div>
          <div>
            {items.map((item, index) => (
              <details key={`${text(item.question)}-${index}`}>
                <summary>{text(item.question) || text(item.title)}</summary>
                <p>{text(item.answer) || text(item.description)}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Articles({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const items = records(c.items)
  if (!items.length) return null
  const ctaHref = usableHref(c.cta_href)

  return (
    <section className={styles.articleSection} id={section.anchor_id ?? 'wawasan'}>
      <div className={styles.shell}>
        <div className={styles.articleLayout}>
          <div className={styles.articleIntro}>
            <div className={styles.eyebrowLight}>{text(c.eyebrow) || 'WAWASAN'}</div>
            <h2>{text(c.title) || 'Wawasan untuk Keputusan yang Lebih Baik'}</h2>
            {text(c.description) ? <p>{text(c.description)}</p> : null}
            {ctaHref ? <Link href={ctaHref}>{text(c.cta_label) || 'Lihat Selengkapnya'} <Arrow /></Link> : null}
          </div>
          <div className={styles.articleCards}>
            {items.slice(0, 2).map((item, index) => {
              const href = usableHref(item.href)
              const card: ReactNode = (
                <>
                  <CmsImage src={text(item.image_url)} alt={text(item.title)} />
                  <h3>{text(item.title)}</h3>
                  {text(item.date) ? <small>{text(item.date)}</small> : null}
                  {href ? <span aria-hidden="true">→</span> : null}
                </>
              )

              return href ? (
                <article key={`${text(item.title)}-${index}`}>
                  <Link href={href} aria-label={`Buka ${text(item.title)}`}>{card}</Link>
                </article>
              ) : (
                <article key={`${text(item.title)}-${index}`}>{card}</article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function ContactCta({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const href = usableHref(c.primary_cta_href) || '/hubungi'
  const label = text(c.primary_cta_label) || 'Hubungi Investor Relations'

  return (
    <section className="bg-[#0b7374] px-6 py-16 text-white sm:py-20" id={section.anchor_id ?? 'kontak-investor'}>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-[0.16em] uppercase text-white/70">{text(c.eyebrow) || 'INVESTOR RELATIONS'}</p>
          <h2 className="font-display mt-3 text-3xl font-semibold sm:text-5xl">{text(c.title) || 'Siap mempelajari Nuzultrip Equity lebih lanjut?'}</h2>
          {text(c.description) ? <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">{text(c.description)}</p> : null}
        </div>
        <Link href={href} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-[#0b7374]">
          {label} <Arrow />
        </Link>
      </div>
    </section>
  )
}

function Footer({ navigation, logoSrc, pageTitle }: { navigation: NavItem[]; logoSrc: string; pageTitle: string }) {
  const footer = navigation
    .filter((item) => item.location === 'footer' && !item.parent_id && usableHref(item.href))
    .sort((a, b) => a.position - b.position)
  const social = navigation
    .filter((item) => item.location === 'social' && !item.parent_id && usableHref(item.href))
    .sort((a, b) => a.position - b.position)

  return (
    <footer className={styles.footer} id="kontak">
      <div className={styles.shell}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="Nuzultrip" />
            <p>Melayani perjalanan Muslim Indonesia dengan hati, profesionalisme, dan teknologi.</p>
            {social.length ? (
              <div>{social.slice(0, 5).map((item) => <Link key={item.id} href={item.href} target={item.target}>{item.label}</Link>)}</div>
            ) : null}
          </div>
          {footer.length ? (
            <nav className={styles.footerNav}>{footer.slice(0, 8).map((item) => <Link key={item.id} href={item.href}>{item.label}</Link>)}</nav>
          ) : null}
          <div className={styles.newsletter}>
            <h4>Butuh informasi terbaru?</h4>
            <p>Hubungi tim Investor Relations untuk informasi, dokumen, atau pembaruan resmi Nuzultrip Equity.</p>
            <Link href="/hubungi">Hubungi Investor Relations <Arrow /></Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} {pageTitle}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}

export function PublicPortalExact({ page, sections, navigation, publicDocuments, brandLogoUrl }: PublicPortalExactProps) {
  const resolved = sections.map((section) => section.section_kind === 'documents' && publicDocuments.length ? {
    ...section,
    content: { ...section.content, items: publicDocuments.map((document) => ({ title: document.title, href: document.href })) },
  } : section)

  const hero = sectionByKind(resolved, 'hero_3d')
  const intro = sectionByKind(resolved, 'intro')
  const stats = sectionByKind(resolved, 'stat_grid') ?? sectionByKind(resolved, 'financial_highlights')
  const offering = sectionByKind(resolved, 'investment_info')
  const business = sectionByKind(resolved, 'business_overview')
  const ecosystem = sectionByKind(resolved, 'ecosystem')
  const growth = sectionByKind(resolved, 'growth_story')
  const funds = sectionByKind(resolved, 'strategic_direction')
  const governance = sectionByKind(resolved, 'investor_updates')
  const risks = sectionByKind(resolved, 'legal_notice')
  const documents = sectionByKind(resolved, 'documents')
  const logos = sectionByKind(resolved, 'logo_wall')
  const articles = sectionByKind(resolved, 'rich_content')
  const faq = sectionByKind(resolved, 'faq')
  const contactCta = sectionByKind(resolved, 'contact_cta')
  const logoSrc = brandLogoUrl || '/brand/nuzultrip-logo-portal.svg'

  return (
    <div className={styles.page}>
      <Header navigation={navigation} logoSrc={logoSrc} />
      <main id="main">
        <Hero section={hero} />
        <AboutAndStats intro={intro} stats={stats} />
        <Offering section={offering} />
        <CompanyStory section={business} />
        <Services section={ecosystem} />
        <Process offering={offering} />
        <Partners section={logos} />
        <InvestorInfo growth={growth} funds={funds} governance={governance} risks={risks} documents={documents} />
        <Faq section={faq} />
        <Articles section={articles} />
        <ContactCta section={contactCta} />
      </main>
      <Footer navigation={navigation} logoSrc={logoSrc} pageTitle={page.title} />
    </div>
  )
}
