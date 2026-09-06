import Link from 'next/link'

import type { PublicPortalSection } from '@/server/portal/public-queries'

import styles from './public-portal-model.module.css'

type NavItem = {
  id: string
  location: 'header' | 'footer' | 'legal' | 'social'
  label: string
  href: string
  target: string
  position: number
  parent_id: string | null
}

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

function SectionHeader({
  number,
  eyebrow,
  title,
  description,
  center = false,
}: {
  number?: string
  eyebrow?: string | null
  title?: string | null
  description?: string | null
  center?: boolean
}) {
  if (!eyebrow && !title && !description) return null

  return (
    <div className={`${styles.sectionHead} ${center ? styles.center : ''}`}>
      {eyebrow ? (
        <span className={styles.eyebrow}>
          {number ? <span className={styles.num}>{number}</span> : null}
          {eyebrow}
        </span>
      ) : null}
      {title ? <h2>{title}</h2> : null}
      {description ? <p className={styles.lede}>{description}</p> : null}
    </div>
  )
}

function Hero({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const primaryLabel = text(c.primary_cta_label) ?? 'Pelajari Equity Offering'
  const primaryHref = text(c.primary_cta_href) ?? '#ringkasan'
  const secondaryLabel = text(c.secondary_cta_label) ?? 'Tentang Nuzultrip'
  const secondaryHref = text(c.secondary_cta_href) ?? '#tentang-nuzultrip'

  return (
    <section id={section.anchor_id ?? section.id} className={styles.hero}>
      <div className={styles.blob} aria-hidden="true" />
      <div className={`${styles.wrap} ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>{text(c.eyebrow) ?? 'Nuzultrip Equity Relations'}</span>
          <h1 className={styles.headline}>{text(c.title) ?? 'Membangun Nilai dan Kepemilikan Bersama Nuzultrip'}</h1>
          {text(c.description) ? <p className={styles.lede}>{text(c.description)}</p> : null}

          <div className={styles.heroTags} aria-label="Layanan utama Nuzultrip">
            <span>Umrah</span>
            <span>Halal Tour</span>
            <span>Land Arrangement (LA)</span>
            <span>Jaringan agen &amp; mitra</span>
          </div>

          <div className={styles.heroActions}>
            <Link className={styles.btnPrimary} href={primaryHref}>{primaryLabel}</Link>
            <Link className={styles.btnOutline} href={secondaryHref}>{secondaryLabel}</Link>
          </div>
          <p className={styles.heroFoot}>Informasi disusun terstruktur dan diperbarui melalui portal resmi Nuzultrip.</p>
        </div>

        <div className={styles.heroArt} aria-hidden="true">
          <svg className={styles.scene} viewBox="0 0 560 470">
            <defs>
              <linearGradient id="modelSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1B2C6B"/><stop offset="1" stopColor="#0E9C9C"/></linearGradient>
              <linearGradient id="modelDome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FDFBF6"/><stop offset="1" stopColor="#E8DFC9"/></linearGradient>
              <linearGradient id="modelCase" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F2A93B"/><stop offset="1" stopColor="#DF6951"/></linearGradient>
            </defs>
            <circle cx="300" cy="224" r="184" fill="url(#modelSky)"/>
            <circle cx="300" cy="224" r="184" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="1.5"/>
            <g transform="translate(390 106)"><path d="M22 0a22 22 0 100 44 26 26 0 110-44z" fill="#FFD98A"/></g>
            <rect x="196" y="194" width="20" height="130" rx="7" fill="url(#modelDome)"/>
            <path d="M206 166c9 10 13 17 13 23a13 13 0 01-26 0c0-6 4-13 13-23z" fill="#F2DFB6"/>
            <rect x="384" y="194" width="20" height="130" rx="7" fill="url(#modelDome)"/>
            <path d="M394 166c9 10 13 17 13 23a13 13 0 01-26 0c0-6 4-13 13-23z" fill="#F2DFB6"/>
            <path d="M232 248c0-44 30-70 68-92 38 22 68 48 68 92z" fill="url(#modelDome)"/>
            <rect x="222" y="248" width="156" height="80" rx="10" fill="#FDFBF6"/>
            <g fill="#1B2C6B" opacity=".82"><path d="M248 328v-34a13 13 0 0126 0v34z"/><path d="M287 328v-42a13 13 0 0126 0v42z"/><path d="M326 328v-34a13 13 0 0126 0v34z"/></g>
            <rect x="182" y="326" width="236" height="16" rx="8" fill="#EFE4CB"/>
            <rect x="166" y="342" width="268" height="12" rx="6" fill="#E3D5B6"/>
            <path d="M64 174c74-58 168-58 232-16" fill="none" stroke="#25BDB6" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="7 9"/>
            <path d="M300 154l-24 8 9 5-2 11 8-9 14 3z" fill="#25BDB6"/>
            <g transform="translate(150 334)"><rect y="16" width="96" height="68" rx="14" fill="url(#modelCase)"/><rect x="26" y="16" width="12" height="68" fill="#fff" opacity=".35"/><rect x="58" y="16" width="12" height="68" fill="#fff" opacity=".35"/><circle cx="20" cy="92" r="8" fill="#1B2C6B"/><circle cx="76" cy="92" r="8" fill="#1B2C6B"/></g>
            <g transform="translate(384 342)"><rect y="10" width="76" height="54" rx="9" fill="#1B2C6B"/><rect x="10" width="76" height="54" rx="9" fill="#25BDB6"/><rect x="24" y="14" width="48" height="5" rx="2.5" fill="#fff" opacity=".9"/><rect x="24" y="26" width="34" height="5" rx="2.5" fill="#fff" opacity=".65"/></g>
          </svg>
          <div className={`${styles.floatCard} ${styles.floatOne}`}><b>Perkembangan bisnis</b><span>Layanan, jaringan, dan sistem</span></div>
          <div className={`${styles.floatCard} ${styles.floatTwo}`}><b>Dokumen uji tuntas</b><span>Tersedia sesuai akses</span></div>
        </div>
      </div>
    </section>
  )
}

function Intro({ section }: { section: PublicPortalSection }) {
  const c = section.content
  return (
    <section id={section.anchor_id ?? section.id} className={`${styles.section} ${styles.tinted}`}>
      <div className={styles.wrap}>
        <SectionHeader eyebrow={text(c.eyebrow) ?? 'Tentang Nuzultrip'} title={text(c.title)} description={text(c.description)} center />
        <div className={styles.introPanel} aria-hidden="true" />
      </div>
    </section>
  )
}

function VisionMission({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const mission = Array.isArray(c.mission) ? c.mission.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())) : []
  return (
    <section id={section.anchor_id ?? section.id} className={styles.section}>
      <div className={styles.wrap}>
        <SectionHeader eyebrow={text(c.eyebrow) ?? 'Visi & Misi'} title={text(c.title)} />
        <div className={styles.vm}>
          <div className={styles.vision}><span className={styles.eyebrow}>{text(c.vision_label) ?? 'Visi'}</span><p>{text(c.vision)}</p></div>
          <div className={styles.mission}><span className={styles.eyebrow}>{text(c.mission_label) ?? 'Misi'}</span><ul>{mission.map((item, i) => <li key={`${section.id}-m-${i}`}><span>{i + 1}</span><p>{item}</p></li>)}</ul></div>
        </div>
      </div>
    </section>
  )
}

function Cards({ section, number }: { section: PublicPortalSection; number?: string }) {
  const c = section.content
  const items = list(c.items)
  return (
    <section id={section.anchor_id ?? section.id} className={`${styles.section} ${styles.tinted}`}>
      <div className={styles.wrap}>
        <SectionHeader number={number} eyebrow={text(c.eyebrow)} title={text(c.title)} description={text(c.description)} />
        <div className={styles.cards3}>
          {items.map((item, i) => (
            <article className={styles.eco} key={`${section.id}-${i}`}>
              <div className={`${styles.ecoTop} ${styles[`tone${(i % 6) + 1}` as keyof typeof styles] ?? ''}`}><span>{String(i + 1).padStart(2, '0')}</span></div>
              <div className={styles.ecoBody}><h3>{text(item.title) ?? text(item.label) ?? `Item ${i + 1}`}</h3><p>{text(item.description) ?? text(item.body) ?? text(item.value)}</p></div>
              <div className={styles.ecoFoot}><span />Informasi Nuzultrip</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Growth({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const milestones = list(c.milestones)
  return (
    <section id={section.anchor_id ?? section.id} className={styles.section}>
      <div className={styles.wrap}>
        <div className={styles.timelineGrid}>
          <div>
            <SectionHeader number="04" eyebrow={text(c.eyebrow)} title={text(c.title)} description={text(c.description)} />
            <div className={styles.steps}>{milestones.map((item, i) => <div className={styles.step} key={`${section.id}-${i}`}><span className={styles.stepSq}>{i + 1}</span><div><span className={styles.stepYr}>{text(item.year) ?? text(item.period) ?? `Tahap ${i + 1}`}</span><h3>{text(item.title) ?? text(item.label)}</h3><p>{text(item.description) ?? text(item.body)}</p></div></div>)}</div>
          </div>
          <div className={styles.focusStack}><div className={styles.focusCard}><div className={styles.focusBanner}>Nuzultrip</div><div className={styles.focusInner}><span>Prioritas pengembangan</span>{milestones.slice(0, 4).map((item, i) => <div className={styles.progress} key={`${section.id}-p-${i}`}><div><b>{text(item.title) ?? `Prioritas ${i + 1}`}</b><span>{25 + i * 18}%</span></div><i><em style={{ width: `${25 + i * 18}%` }} /></i></div>)}</div></div></div>
        </div>
      </div>
    </section>
  )
}

function Capital({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const uses = list(c.use_of_funds)
  const target = money(c.funding_target, text(c.funding_currency) ?? 'IDR')
  return (
    <section id={section.anchor_id ?? section.id} className={`${styles.section} ${styles.tinted}`}>
      <div className={styles.wrap}>
        <SectionHeader number="06" eyebrow={text(c.eyebrow)} title={text(c.title)} description={text(c.description)} />
        {target ? <div className={styles.fundingTarget}><span>{text(c.funding_label) ?? 'Target Pendanaan Ekuitas'}</span><strong>{target}</strong></div> : null}
        <div className={styles.capGrid}>{uses.map((item, i) => <article className={styles.cap} key={`${section.id}-${i}`}><span className={styles.capN}>{String(i + 1).padStart(2, '0')}</span><div><small>Prioritas {i + 1}</small><h3>{text(item.title) ?? `Penggunaan Dana ${i + 1}`}</h3><p>{text(item.description)}</p></div></article>)}</div>
      </div>
    </section>
  )
}

function Metrics({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const items = list(c.metrics)
  return (
    <section id={section.anchor_id ?? section.id} className={styles.section}>
      <div className={styles.wrap}>
        <SectionHeader eyebrow={text(c.eyebrow)} title={text(c.title)} description={text(c.description)} center />
        <div className={styles.metricGrid}>{items.map((item, i) => <article key={`${section.id}-${i}`}><span>{text(item.label) ?? text(item.title)}</span><strong>{text(item.value) ?? text(item.amount) ?? text(item.number) ?? '—'}</strong><p>{text(item.description) ?? text(item.subtitle)}</p></article>)}</div>
      </div>
    </section>
  )
}

function Documents({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const items = list(c.items)
  return (
    <section id={section.anchor_id ?? section.id} className={`${styles.section} ${styles.tinted}`}>
      <div className={styles.wrap}>
        <SectionHeader number="09" eyebrow={text(c.eyebrow)} title={text(c.title)} description={text(c.description)} />
        <div className={styles.docs}>{items.map((item, i) => { const href = text(item.href) ?? text(item.url); const node = <><span className={styles.docIcon}>↗</span><span><b>{text(item.title) ?? text(item.label) ?? `Dokumen ${i + 1}`}</b><small>{text(item.description) ?? 'Dokumen portal'}</small></span></>; return href ? <Link className={styles.doc} href={href} key={`${section.id}-${i}`}>{node}</Link> : <div className={styles.doc} key={`${section.id}-${i}`}>{node}</div> })}</div>
      </div>
    </section>
  )
}

function Contact({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const label = text(c.primary_cta_label) ?? 'Masuk ke Portal'
  const href = text(c.primary_cta_href) ?? '/masuk'
  return (
    <section id={section.anchor_id ?? section.id} className={styles.requestWrap}>
      <div className={`${styles.wrap} ${styles.request}`}>
        <div><span className={styles.eyebrow}>{text(c.eyebrow) ?? 'Equity Relations'}</span><h2>{text(c.title) ?? 'Akses Informasi Nuzultrip'}</h2><p>{text(c.description)}</p></div>
        <div className={styles.requestCard}><span>Akses portal</span><p>Masuk untuk melihat informasi dan dokumen sesuai hak akses akun Anda.</p><Link href={href}>{label}</Link></div>
      </div>
    </section>
  )
}

function Generic({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const body = text(c.content)
  const items = list(c.items).length ? list(c.items) : list(c.pillars)
  return (
    <section id={section.anchor_id ?? section.id} className={styles.section}>
      <div className={styles.wrap}><SectionHeader eyebrow={text(c.eyebrow)} title={text(c.title)} description={text(c.description)} />{body ? <div className={styles.rich}>{body}</div> : null}{items.length ? <div className={styles.gov}>{items.map((item, i) => <article key={`${section.id}-${i}`}><span>{String(i + 1).padStart(2, '0')}</span><h3>{text(item.title) ?? text(item.label)}</h3><p>{text(item.description) ?? text(item.body)}</p></article>)}</div> : null}</div>
    </section>
  )
}

function RenderSection({ section }: { section: PublicPortalSection }) {
  switch (section.section_kind) {
    case 'hero_3d': return <Hero section={section} />
    case 'intro': return <Intro section={section} />
    case 'vision_mission': return <VisionMission section={section} />
    case 'business_overview': return <Cards section={section} number="02" />
    case 'growth_story': return <Growth section={section} />
    case 'ecosystem': return <Cards section={section} number="05" />
    case 'investment_info': return <Capital section={section} />
    case 'financial_highlights':
    case 'stat_grid': return <Metrics section={section} />
    case 'documents': return <Documents section={section} />
    case 'contact_cta': return <Contact section={section} />
    default: return <Generic section={section} />
  }
}

export function PublicPortalModel({ page, sections, navigation }: { page: { title: string; seo: unknown }; sections: PublicPortalSection[]; navigation: NavItem[] }) {
  const header = navigation.filter((item) => item.location === 'header' && !item.parent_id).sort((a, b) => a.position - b.position)
  const footer = navigation.filter((item) => item.location === 'footer' && !item.parent_id).sort((a, b) => a.position - b.position)
  const social = navigation.filter((item) => item.location === 'social' && !item.parent_id).sort((a, b) => a.position - b.position)

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={`${styles.wrap} ${styles.navIn}`}>
          <Link className={styles.brand} href="/"><span>N</span>Nuzultrip</Link>
          <nav className={styles.navLinks} aria-label="Navigasi utama">{header.map((item) => <Link key={item.id} href={item.href}>{item.label}</Link>)}</nav>
          <Link className={styles.navCta} href="/masuk">Masuk</Link>
        </div>
      </header>

      <main>{sections.map((section) => <RenderSection key={section.id} section={section} />)}</main>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.footerGrid}>
            <div><b className={styles.footerBrand}>Nuzultrip</b><p>Hubungan Ekuitas Nuzultrip — informasi perusahaan, perkembangan, dan dokumen dalam satu portal.</p></div>
            <div><h4>Perusahaan</h4>{footer.slice(0, 4).map((item) => <Link key={item.id} href={item.href}>{item.label}</Link>)}</div>
            <div><h4>Informasi</h4>{footer.slice(4, 8).map((item) => <Link key={item.id} href={item.href}>{item.label}</Link>)}</div>
            <div><h4>Ikuti Nuzultrip</h4>{social.map((item) => <Link key={item.id} href={item.href}>{item.label}</Link>)}</div>
          </div>
          <div className={styles.legal}><span>© {new Date().getFullYear()} {page.title}</span><span>Nuzultrip Equity Relations</span></div>
        </div>
      </footer>
    </div>
  )
}
