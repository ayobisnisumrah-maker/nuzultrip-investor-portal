import type { ComponentProps } from 'react'
import Link from 'next/link'

import type { PublicPortalModel } from '@/features/portal/public-portal-model'
import type { PublicPortalDocument } from '@/server/portal/public-queries'

import styles from './public-portal-exact.module.css'
import { V2CompanyGallery } from './v2-company-gallery'

type BaseProps = ComponentProps<typeof PublicPortalModel>
type Section = BaseProps['sections'][number]
type NavItem = BaseProps['navigation'][number]

export type PublicPortalExactProps = BaseProps & {
  publicDocuments: PublicPortalDocument[]
}

const V2_COMPANY_IMAGES = [
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1200&auto=format&fit=crop',
]
const V2_COMPANY_METRICS: Record<string, unknown>[] = [
  { value: '10+ Tahun', label: 'Pengalaman tim di bidang umroh' },
  { value: '4 Negara', label: 'Jaringan vendor layanan terpercaya' },
  { value: '1000+', label: 'Total jamaah telah diberangkatkan' },
  { value: 'Rp.11 M+', label: 'Omzet kumulatif periode 2024–2026' },
  { value: 'Amanah', label: 'Terverifikasi PPIU Kemenag' },
]
const V2_NETWORK_CARDS: Record<string, unknown>[] = [
  { name: 'Agen Nuzultrip', description: 'Mendukung setiap agen terstruktur dan efisien dengan teknologi penjualan cerdas.', icon: '◎' },
  { name: 'Mitra Travel', description: 'Jalinan kemitraan untuk layanan umrah lebih optimal dengan standarisasi bersama.', icon: '◇' },
  { name: 'Vendor Layanan', description: 'Partner layanan terpercaya untuk kebutuhan ibadah mulai maskapai, hotel, hingga handling.', icon: '□' },
]
const V2_INVESTOR_CARDS: Record<string, unknown>[] = [
  { title: 'Strategi Pertumbuhan', description: 'Pertumbuhan melalui penguatan layanan, sistem dan jaringan.', image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop' },
  { title: 'Manajemen Risiko', description: 'Risiko utama dan pendekatan mitigasi dalam kepemilikan equity.', image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200&auto=format&fit=crop' },
  { title: 'Penggunaan Modal', description: 'Alokasi modal pada empat prioritas strategis pengembangan Nuzultrip.', image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1200&auto=format&fit=crop' },
  { title: 'Dokumen dan Informasi', description: 'Akses dokumen dan informasi penting secara terstruktur.', image_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=1200&auto=format&fit=crop' },
  { title: 'Keunggulan Kompetitif', description: 'Nilai strategis yang mendukung pertumbuhan dan kepemilikan equity.', image_url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1200&auto=format&fit=crop' },
  { title: 'Mekanisme Hasil & Pelaporan', description: 'Distribusi hasil dengan pelaporan berkala dan transparan.', image_url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=1200&auto=format&fit=crop' },
]

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

function CmsIcon({ item, fallback }: { item: Record<string, unknown>; fallback: string }) {
  const iconUrl = text(item.icon_url)
  if (iconUrl) {
    // CMS icon media can be hosted by Supabase Storage or another approved HTTPS origin.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={iconUrl}
        alt=""
        aria-hidden="true"
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    )
  }

  return <>{text(item.icon) || fallback}</>
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
          <Link href="/masuk" className={styles.headerCta}>Masuk</Link>
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
  const image = text(c.image_url) || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1200&auto=format&fit=crop'
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

function AboutAndStats({ intro, stats, business }: { intro?: Section; stats?: Section; business?: Section }) {
  if (!intro && !stats) return null
  const c = intro?.content ?? {}
  const metrics = records(stats?.content.metrics)
  const businessHref = business ? `#${business.anchor_id ?? 'bisnis'}` : null
  return (
    <section className={styles.section} id={intro?.anchor_id ?? 'tentang-nuzultrip'}>
      <div className={styles.shell}>
        <div className={styles.aboutGrid}>
          <div className={styles.eyebrowDark}>{text(c.eyebrow) || 'TENTANG KAMI'}</div>
          <h2>{text(c.title) || 'Nuzultrip'}</h2>
          <div className={styles.aboutText}>
            {text(c.description) ? <p>{text(c.description)}</p> : null}
            {businessHref ? <Link href={businessHref} className={styles.inlineLink}>Lebih tentang kami <Arrow /></Link> : null}
          </div>
        </div>
        {metrics.length ? (
          <div className={styles.statsGrid}>
            {metrics.slice(0, 5).map((metric, index) => (
              <article key={`${text(metric.label)}-${index}`}>
                <strong>{text(metric.value)}</strong>
                <span>{text(metric.label)}</span>
                {text(metric.description) ? <small>{text(metric.description)}</small> : null}
              </article>
            ))}
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
            <Link href={usableHref(c.detail_cta_href)||'/hubungi'} className={styles.inlineLink}>{text(c.detail_cta_label)||'Lebih Detail Penawaran'} <Arrow /></Link>
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
          <aside className={styles.offerCard} style={text(c.card_image_url)?{backgroundImage:`linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.72)),url(${text(c.card_image_url)})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>
            <h3>{text(c.card_title)||<>Investasi Hari Ini,<br />Untuk Masa Depan<br />yang Lebih Baik.</>}</h3>
            <div className={styles.offerRule} />
            <Link href={usableHref(c.card_cta_href)||'/hubungi'}>{text(c.card_cta_label)||'Ajukan Minat Equity'} <Arrow /></Link>
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
  const images = records(c.images)
  const metrics = records(c.metrics).length ? records(c.metrics) : V2_COMPANY_METRICS
  const primaryImage = text(c.image_url)
  const galleryImages = [
    ...(primaryImage ? [{ src: primaryImage, alt: text(c.image_alt) || 'Nuzultrip' }] : []),
    ...images.map((image, index) => ({
      src: text(image.image_url) || text(image.url),
      alt: text(image.alt) || text(image.title) || `Galeri perjalanan Nuzultrip #${index + 1}`,
    })),
    ...(primaryImage || images.length ? [] : V2_COMPANY_IMAGES).map((src, index) => ({ src, alt: `Galeri Nuzultrip #${index + 1}` })),
  ].filter((image, index, all) => image.src && all.findIndex((candidate) => candidate.src === image.src) === index)
  const galleryMetrics = metrics.map((metric) => ({
    value: text(metric.value),
    label: text(metric.label),
  })).filter((metric) => metric.value || metric.label)

  return (
    <section className={styles.section} id={section.anchor_id ?? 'bisnis'}>
      <div className={styles.shell}><div className={styles.companyGrid}>
        <div className={styles.companyIntro}><div><div className={styles.eyebrowDark}>{text(c.eyebrow) || 'PERUSAHAAN'}</div><h2>{text(c.title) || 'Nuzultrip'}</h2>{text(c.description) ? <p>{text(c.description)}</p> : null}</div><Link href={usableHref(c.cta_href)||'#informasi-investor'} className={styles.inlineLink}>{text(c.cta_label)||'Lebih Detail Penawaran'} <Arrow /></Link></div>
        <V2CompanyGallery images={galleryImages} metrics={galleryMetrics} />
      </div></div>
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
                const fallbackIcon = ['✈', '◇', '▢', '⌘'][index] || '•'
                return (
                  <article key={`${text(item.title)}-${index}`}>
                    <span className={styles.serviceIcon}>
                      <CmsIcon item={item} fallback={fallbackIcon} />
                    </span>
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
  const c = offering.content
  const steps = records(c.process_steps)
  if (!steps.length) return null
  return <section className={styles.processSection} id="proses"><div className={styles.shell}>
    <div className={styles.processHeader}><div className={styles.eyebrowLight}>{text(c.process_eyebrow)||'ALUR & TAHAPAN INVESTASI'}</div><h2>{text(c.process_title)||'Langkah Mudah Menjadi Bagian dari Kami'}</h2>{text(c.process_description)?<p>{text(c.process_description)}</p>:null}</div>
    <div className={styles.processSteps}>{steps.slice(0,4).map((step,index)=><article key={index}><div className={styles.processTop}><span className={styles.stepNumber}>0{index+1}</span><i /></div><h3>{text(step.title)}</h3>{text(step.description)?<p>{text(step.description)}</p>:null}<div className={styles.processMeta}>{text(step.duration)?<span>{text(step.duration)}</span>:null}{text(step.output)?<b>{text(step.output)}</b>:null}</div></article>)}</div>
    {usableHref(c.process_cta_href)?<div className={styles.processCta}><Link href={text(c.process_cta_href)}>{text(c.process_cta_label)||'Pelajari Selengkapnya'} <Arrow /></Link></div>:null}
  </div></section>
}

function Roadmap({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const items = records(c.milestones).length ? records(c.milestones) : records(c.items)
  if (!items.length && !text(c.title)) return null
  return (
    <section className={styles.roadmapSection} id={section.anchor_id ?? 'roadmap'}>
      <div className={styles.shell}>
        <div className={styles.roadmapHeader}>
          <div><div className={styles.eyebrowDark}>{text(c.eyebrow) || 'ROADMAP PERUSAHAAN'}</div><h2>{text(c.title) || 'Peta Jalan Pertumbuhan Nuzultrip'}</h2>{text(c.description) ? <p>{text(c.description)}</p> : null}</div>
          <span>{items.length ? '01 / 0' + items.length : 'ROADMAP'}</span>
        </div>
        {items.length ? <div className={styles.roadmapTrack}>{items.slice(0, 6).map((item, index) => {
          const period = text(item.period) || text(item.date) || text(item.year)
          const title = text(item.title) || text(item.label)
          const description = text(item.description) || text(item.summary)
          const status = text(item.status_label) || text(item.status)
          return <article key={'roadmap-' + index}><div className={styles.roadmapMeta}><b>FASE 0{index + 1}</b>{status ? <span>{status}</span> : null}</div>{period ? <small>{period}</small> : null}<h3>{title}</h3>{description ? <p>{description}</p> : null}</article>
        })}</div> : null}
      </div>
    </section>
  )
}

function Partners({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const items = records(c.items).length ? records(c.items) : records(c.logos)
  const image = text(c.image_url)
  if (!items.length && !text(c.title)) return null
  return <section className={styles.partnerSection} id={section.anchor_id ?? 'jaringan'}><div className={styles.shell}><div className={styles.networkLayout}>
    <div className={styles.networkIntro}><div><div className={styles.eyebrowDark}>{text(c.eyebrow)||'JARINGAN & MITRA'}</div><h2>{text(c.title)||'Terhubung untuk Bertumbuh Bersama'}</h2>{text(c.description)?<p>{text(c.description)}</p>:null}</div>{usableHref(c.cta_href)?<Link className={styles.inlineLink} href={text(c.cta_href)}>{text(c.cta_label)||'Pelajari Selengkapnya'} <Arrow /></Link>:null}</div>
    <div className={styles.networkCards}>{items.slice(0,3).map((item,index)=><article key={index}><span className={styles.networkIcon}><CmsIcon item={item} fallback={['◎','◇','▣'][index]||'•'} /></span><div><h3>{text(item.title)||text(item.name)}</h3>{text(item.description)?<p>{text(item.description)}</p>:null}</div></article>)}</div>
    <div className={styles.networkMedia}>{image?<CmsImage src={image} alt={text(c.image_alt)||'Jaringan Nuzultrip'}/>:null}<div><h3>{text(c.image_caption)||text(c.highlight)||text(c.highlight_title)||'Satu Ekosistem, Banyak Peluang'}</h3></div></div>
  </div></div></section>
}

function InvestorInfo({ growth, funds, governance, risks, documents }: { growth?: Section; funds?: Section; governance?: Section; risks?: Section; documents?: Section }) {
  const cmsInvestorItems = growth?.section_kind === 'investor_updates' ? records(growth.content.items) : []
  const investorItems = cmsInvestorItems.length >= 6 ? cmsInvestorItems : V2_INVESTOR_CARDS
  const blocks = [growth, funds, governance, risks, documents].filter(Boolean) as Section[]
  if (!blocks.length && !investorItems.length) return null
  const heroImage = investorItems.map((item)=>text(item.image_url)).find(Boolean) || text(V2_INVESTOR_CARDS[0].image_url)
  return <section className={styles.infoSection} id="informasi-investor"><div className={styles.shell}>
    <div className={styles.infoHeader}><div className={styles.eyebrowDark}>INFORMASI INVESTOR</div><h2>Informasi penting dalam satu tempat</h2></div>
    <div className={styles.infoLayout}><div className={styles.infoMedia}>{heroImage ? <CmsImage src={heroImage} alt="Informasi Investor Nuzultrip" /> : null}</div><div className={styles.infoGrid}>
      {investorItems.slice(0,6).map((item,index)=><article key={`${text(item.title)}-${index}`}><div><h3>{text(item.title)}</h3>{text(item.description)?<p>{text(item.description)}</p>:null}</div><span className={styles.infoMore}>Selengkapnya <Arrow /></span></article>)}
    </div></div>
  </div></section>
}


function Articles({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const items = records(c.items)
  if (!items.length) return null
  const ctaHref = usableHref(c.cta_href)
  return <section className={styles.articleSection} id={section.anchor_id ?? 'artikel'}><div className={styles.shell}><div className={styles.articleLayout}>
    <div className={styles.articleIntro}><div><div className={styles.eyebrowDark}>{text(c.eyebrow)||'ARTIKEL & BERITA'}</div><h2>{text(c.title)||'Wawasan untuk Keputusan yang Lebih Baik'}</h2>{text(c.description)?<p>{text(c.description)}</p>:null}</div>{ctaHref?<Link href={ctaHref}>{text(c.cta_label)||'Lebih Artikel Lainnya'} <Arrow /></Link>:null}</div>
    <div className={styles.articleCards}>{items.slice(0,2).map((item,index)=>{const href=usableHref(item.href);const body=<><div className={styles.articleImage}><CmsImage src={text(item.image_url)} alt={text(item.title)}/><span>{text(item.type)||'Artikel'}</span></div><div className={styles.articleBody}><small>{text(item.date)}</small><h3>{text(item.title)}</h3>{text(item.description)?<p>{text(item.description)}</p>:null}<b>Baca Selengkapnya <Arrow /></b></div></>;return <article key={index}>{href?<Link href={href}>{body}</Link>:body}</article>})}</div>
  </div></div></section>
}

function ContactCta({ section, documents }: { section?: Section; documents: PublicPortalDocument[] }) {
  if (!section) return null
  const c=section.content
  const primaryHref=usableHref(c.primary_cta_href)||'/hubungi'
  const secondaryHref=usableHref(c.secondary_cta_href)||documents[0]?.href||null
  return <section className={styles.contactSection} id={section.anchor_id ?? 'kontak'}><div className={styles.shell}><div className={styles.quickLayout}>
    <div className={styles.quickIntro}><div className={styles.eyebrowLight}>{text(c.eyebrow)||'QUICK ACTION'}</div><h2>{text(c.title)||'Kenali. Pelajari. Tentukan Langkah Anda.'}</h2>{text(c.description)?<p>{text(c.description)}</p>:null}</div>
    <div className={styles.quickCards}><Link href={primaryHref}><span>Investor Relations</span><h3>{text(c.primary_cta_label)||'Hubungi Tim'}</h3><p>{text(c.primary_cta_description)||text(c.contact_value)}</p><Arrow /></Link>{secondaryHref?<Link href={secondaryHref}><span>Dokumen Resmi</span><h3>{text(c.secondary_cta_label)||'Unduh Pitchdeck'}</h3><p>{text(c.secondary_cta_description)||'Pelajari ringkasan informasi Nuzultrip Equity'}</p><Arrow /></Link>:null}</div>
    <div className={styles.quickMedia}>{(text(c.image_url)||'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1200&auto=format&fit=crop')?<CmsImage src={text(c.image_url)||'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1200&auto=format&fit=crop'} alt={text(c.image_alt)||'Nuzultrip Equity'}/>:null}<div><small>{text(c.image_eyebrow)||'LANGKAH AWAL KEMITRAAN'}</small><h3>{text(c.image_title)||'Siap Mengenal Nuzultrip Lebih Jauh?'}</h3>{text(c.image_description)?<p>{text(c.image_description)}</p>:null}<Link href={primaryHref}>{text(c.primary_cta_label)||'Ajukan Minat Equity'} <Arrow /></Link></div></div>
  </div></div></section>
}

function Footer({ navigation, logoSrc, pageTitle }: { navigation: NavItem[]; logoSrc: string; pageTitle: string }) {
  const footer = navigation
    .filter((item) => item.location === 'footer' && !item.parent_id)
    .sort((a, b) => a.position - b.position)
  const footerChildren = navigation
    .filter((item) => item.location === 'footer' && Boolean(item.parent_id))
    .sort((a, b) => a.position - b.position)

  const footerHref = (item: NavItem) => {
    const href = usableHref(item.href)
    if (href) return href
    const normalized = item.label.trim().toLocaleLowerCase('id-ID')
    const anchors: Record<string, string> = {
      'tentang nuzultrip': '#tentang',
      'model bisnis': '#model-bisnis',
      'ekosistem bisnis': '#ekosistem',
      'perkembangan': '#perkembangan',
      'ringkasan penawaran': '#penawaran',
      'penggunaan dana': '#penggunaan-dana',
      'tata kelola': '#tata-kelola',
      'faktor risiko': '#faktor-risiko',
    }
    return anchors[normalized] ?? null
  }
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
          {footer.length ? <div className={styles.footerColumns}>{footer.slice(0,2).map((group)=><nav key={group.id}><h4>{group.label}</h4>{(footerChildren.filter((item)=>item.parent_id===group.id).length ? footerChildren.filter((item)=>item.parent_id===group.id) : [group]).slice(0,8).map((item)=>{const href=footerHref(item);return href?<Link key={item.id} href={href}>{item.label}</Link>:<span key={item.id}>{item.label}</span>})}</nav>)}</div> : null}
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
  const growth = sectionByKind(resolved, 'investor_updates') ?? sectionByKind(resolved, 'growth_story')
  const funds = sectionByKind(resolved, 'strategic_direction')
  const roadmap = sectionByKind(resolved, 'milestones') ?? growth
  const governance = sectionByKind(resolved, 'investor_updates')
  const risks = sectionByKind(resolved, 'legal_notice')
  const documents = sectionByKind(resolved, 'documents')
  const logos = sectionByKind(resolved, 'logo_wall')
  const articles = sectionByKind(resolved, 'rich_content')
  const contactCta = sectionByKind(resolved, 'contact_cta')
  const logoSrc = brandLogoUrl || '/brand/nuzultrip-logo-portal.svg'

  return (
    <div className={styles.page}>
      <Header navigation={navigation} logoSrc={logoSrc} />
      <main id="main">
        <Hero section={hero} />
        <AboutAndStats intro={intro} stats={stats} business={business} />
        <Offering section={offering} />
        <CompanyStory section={business} />
        <Services section={ecosystem} />
        <Process offering={offering} />
        <Roadmap section={roadmap} />
        <Partners section={logos} />
        <InvestorInfo growth={growth} funds={funds} governance={governance} risks={risks} documents={documents} />
        <ContactCta section={contactCta} documents={publicDocuments} />
        <Articles section={articles} />
      </main>
      <Footer navigation={navigation} logoSrc={logoSrc} pageTitle={page.title} />
    </div>
  )
}
