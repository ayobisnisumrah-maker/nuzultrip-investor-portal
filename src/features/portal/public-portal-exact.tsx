import type { ComponentProps } from 'react'
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
    .filter((item) => item.location === 'header' && !item.parent_id)
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
          <span className={styles.lang}>◎ ID⌄</span>
        </div>
      </div>
    </header>
  )
}

function Hero({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const titleLines = text(c.title).split('|').map((item) => item.trim()).filter(Boolean)
  const tags = strings(c.tags)
  const image = text(c.image_url) || 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Kaaba-Masjid_al-Haram.JPG?width=1800'
  const imageAlt = text(c.image_alt) || 'Masjid al-Haram dan Kaabah'
  const primaryLabel = text(c.primary_cta_label) || 'Ajukan Minat Equity'
  const primaryHref = text(c.primary_cta_href) || '/hubungi'
  const secondaryLabel = text(c.secondary_cta_label) || 'Pelajari Lebih Lanjut'
  const secondaryHref = text(c.secondary_cta_href) || '#tentang-nuzultrip'

  return (
    <section className={styles.hero} id={section.anchor_id ?? 'beranda'}>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}>{text(c.eyebrow) || 'NUZULTRIP EQUITY'}</div>
          <h1>{titleLines.length ? titleLines.map((line) => <span key={line}>{line}</span>) : 'Membangun Nilai dan Kepemilikan Bersama Nuzultrip'}</h1>
          <p>{text(c.description)}</p>
          <div className={styles.heroButtons}>
            <Link href={primaryHref} className={styles.lightButton}>{primaryLabel} <Arrow /></Link>
            <Link href={secondaryHref} className={styles.textButton}>{secondaryLabel} <Arrow /></Link>
          </div>
          <div className={styles.heroTags}>
            {(tags.length ? tags : ['Perjalanan', 'Lebih Bermakna', 'Investasi', 'Lebih Berdampak', 'Umat', 'Lebih Dekat']).slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>
        <div className={styles.heroMedia}>
          <CmsImage src={image} alt={imageAlt} className={styles.heroImage} />
          <div className={styles.heroMediaCaption}>{text(c.image_caption) || 'Untuk Umat,\nUntuk Masa Depan.'}</div>
          <div className={styles.circleArrow}>↗</div>
        </div>
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
          <h2>{text(c.title) || 'Kami bekerja dengan teknologi untuk membentuk masa depan perjalanan ibadah.'}</h2>
          <div className={styles.aboutText}>
            <p>{text(c.description)}</p>
            <Link href="#bisnis" className={styles.inlineLink}>Lebih tentang kami <Arrow /></Link>
          </div>
        </div>
        <div className={styles.statsGrid}>
          {(metrics.length ? metrics : [
            { value: '70 Juta+', label: 'Muslim Indonesia', description: 'Potensi Pasar' },
            { value: '2024', label: 'Tahun Berdiri' },
            { value: '56', label: 'Produk & Layanan' },
            { value: '24', label: 'Tim Profesional' },
          ]).slice(0, 4).map((metric, index) => (
            <article key={`${text(metric.label)}-${index}`}>
              <strong>{text(metric.value)}</strong>
              <span>{text(metric.label)}</span>
              {text(metric.description) ? <small>{text(metric.description)}</small> : null}
            </article>
          ))}
          <article className={styles.statsCta}>
            <span className={styles.chartMark}>▥</span>
            <b>Bersama<br />Membangun<br />Dampak Lebih Besar</b>
            <span className={styles.smallCircle}>→</span>
          </article>
        </div>
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
            <p>{text(c.description)}</p>
            <Link href="/hubungi" className={styles.inlineLink}>Lihat Detail Penawaran <Arrow /></Link>
          </div>
          <div className={styles.offerTable}>
            {rows.slice(0, 7).map((row, index) => (
              <div className={styles.offerRow} key={`${text(row.label)}-${index}`}>
                <span>{text(row.label)}</span><strong>{text(row.value)}</strong>
              </div>
            ))}
          </div>
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
  const image = text(c.image_url) || 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=82'
  return (
    <section className={styles.section} id="perusahaan">
      <div className={styles.shell}>
        <div className={styles.companyGrid}>
          <div>
            <div className={styles.eyebrowDark}>PERUSAHAAN</div>
            <h2>{text(c.title) || 'Perjalanan Muslim yang Bertumbuh'}</h2>
            <p>{text(c.description)}</p>
            <Link href="#perkembangan" className={styles.inlineLink}>Kenali Nuzultrip <Arrow /></Link>
          </div>
          <div className={styles.companyMedia}>
            <CmsImage src={image} alt={text(c.image_alt) || 'Perjalanan Nuzultrip'} />
            <h3>Lebih dari<br />Sekadar Perjalanan.<br />Ini tentang Makna.</h3>
            <span className={styles.mediaArrow}>→</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Services({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const items = records(c.items)
  return (
    <section className={styles.section} id={section.anchor_id ?? 'ekosistem'}>
      <div className={styles.shell}>
        <div className={styles.serviceLayout}>
          <div>
            <div className={styles.eyebrowDark}>LAYANAN UTAMA</div>
            <h2>{text(c.title) || 'Ekosistem Layanan untuk Umat'}</h2>
          </div>
          <div className={styles.serviceCards}>
            {items.slice(0, 4).map((item, index) => (
              <article key={`${text(item.title)}-${index}`}>
                <span className={styles.serviceIcon}>{['✈', '◇', '▢', '⌘'][index]}</span>
                <h3>{text(item.title)}</h3>
                <p>{text(item.description)}</p>
                <span className={styles.cardArrow}>→</span>
              </article>
            ))}
          </div>
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
                <p>{text(step.description)}</p>
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
  return (
    <section className={styles.partnerSection} id={section.anchor_id ?? 'mitra'}>
      <div className={styles.shell}>
        <div className={styles.partnerLayout}>
          <div>
            <div className={styles.eyebrowDark}>{text(c.eyebrow) || 'DIPERCAYA OLEH'}</div>
            <h2>{text(c.title) || 'Mitra yang Tumbuh Bersama'}</h2>
          </div>
          <div className={styles.partnerLogos}>
            {(logos.length ? logos : [
              { name: 'Saudia' }, { name: 'Garuda Indonesia' }, { name: 'Turkish Airlines' }, { name: 'Accor' }, { name: 'Hilton' },
            ]).slice(0, 5).map((logo, index) => (
              <div key={`${text(logo.name)}-${index}`}>
                {text(logo.image_url) ? <CmsImage src={text(logo.image_url)} alt={text(logo.name)} /> : <span>{text(logo.name)}</span>}
              </div>
            ))}
            <span className={styles.partnerArrows}>← &nbsp; →</span>
          </div>
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
            const items = records(c.items).length ? records(c.items) : records(c.pillars).length ? records(c.pillars) : records(c.milestones)
            return (
              <article key={section.id}>
                <small>{text(c.eyebrow)}</small>
                <h3>{text(c.title)}</h3>
                <p>{text(c.description)}</p>
                {items.length ? <ul>{items.slice(0, 4).map((item, index) => <li key={`${section.id}-${index}`}>{text(item.title) || text(item.label)}</li>)}</ul> : null}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Articles({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const items = records(c.items)
  const fallback = [
    { title: 'Tren Perjalanan Umrah 2026: Peluang dan Tantangan', date: '12 Sep 2026', image_url: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Kaaba-Masjid_al-Haram.JPG?width=1200' },
    { title: 'Strategi Investasi di Tengah Pertumbuhan Ekonomi Global', date: '5 Sep 2026', image_url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=82' },
  ]
  const articles = items.length ? items : fallback
  return (
    <section className={styles.articleSection} id={section.anchor_id ?? 'artikel'}>
      <div className={styles.shell}>
        <div className={styles.articleLayout}>
          <div className={styles.articleIntro}>
            <div className={styles.eyebrowLight}>{text(c.eyebrow) || 'ARTIKEL & BERITA'}</div>
            <h2>{text(c.title) || 'Wawasan untuk Keputusan yang Lebih Baik'}</h2>
            <p>{text(c.description) || 'Ikuti perkembangan terbaru seputar industri perjalanan Muslim, insight investasi, dan kegiatan Nuzultrip.'}</p>
            <Link href="#">Lihat Semua Artikel <Arrow /></Link>
          </div>
          <div className={styles.articleCards}>
            {articles.slice(0, 2).map((item, index) => (
              <article key={`${text(item.title)}-${index}`}>
                <CmsImage src={text(item.image_url)} alt={text(item.title)} />
                <h3>{text(item.title)}</h3>
                <small>{text(item.date)}</small>
                <span>→</span>
              </article>
            ))}
          </div>
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
          <div><div className={styles.eyebrowDark}>{text(c.eyebrow) || 'FAQ'}</div><h2>{text(c.title) || 'Pertanyaan yang Sering Diajukan'}</h2></div>
          <div>{items.map((item, index) => <details key={`${text(item.question)}-${index}`}><summary>{text(item.question) || text(item.title)}</summary><p>{text(item.answer) || text(item.description)}</p></details>)}</div>
        </div>
      </div>
    </section>
  )
}

function Footer({ navigation, logoSrc, pageTitle }: { navigation: NavItem[]; logoSrc: string; pageTitle: string }) {
  const footer = navigation.filter((item) => item.location === 'footer' && !item.parent_id).sort((a, b) => a.position - b.position)
  const social = navigation.filter((item) => item.location === 'social' && !item.parent_id).sort((a, b) => a.position - b.position)
  return (
    <footer className={styles.footer} id="kontak">
      <div className={styles.shell}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="Nuzultrip" />
            <p>Melayani perjalanan Muslim Indonesia dengan hati, profesionalisme, dan teknologi.</p>
            <div>{social.slice(0, 3).map((item) => <Link key={item.id} href={item.href} target={item.target}>{item.label}</Link>)}</div>
          </div>
          <nav className={styles.footerNav}>{footer.slice(0, 6).map((item) => <Link key={item.id} href={item.href}>{item.label}</Link>)}</nav>
          <div className={styles.newsletter}>
            <h4>Dapatkan informasi terbaru</h4>
            <div><span>Masukkan email Anda</span><button type="button" aria-label="Berlangganan">→</button></div>
            <small>Dengan berlangganan, Anda menyetujui Kebijakan Privasi kami.</small>
          </div>
        </div>
        <div className={styles.footerBottom}><span>© {new Date().getFullYear()} {pageTitle}. All rights reserved.</span><span>Syarat & Ketentuan &nbsp;&nbsp; | &nbsp;&nbsp; Kebijakan Privasi</span></div>
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
      </main>
      <Footer navigation={navigation} logoSrc={logoSrc} pageTitle={page.title} />
    </div>
  )
}
