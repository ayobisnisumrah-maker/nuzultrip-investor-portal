import type { ComponentProps } from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, Compass, Globe2, Luggage } from 'lucide-react'

import type { PublicPortalModel } from '@/features/portal/public-portal-model'
import type { PublicPortalDocument } from '@/server/portal/public-queries'

import styles from './public-portal-exact.module.css'
import { V2CompanyGallery } from './v2-company-gallery'
import { V2RoadmapSlider } from './v2-roadmap-slider'
import { V2InvestorInfo } from './v2-investor-info'
import { V2MobileHeader } from './v2-mobile-header'
import { V2HeaderShell } from './v2-header-shell'
import { V2Hero } from './v2-hero'
import { V2Process } from './v2-process'

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

function Header({ navigation, heroSection }: { navigation: NavItem[]; logoSrc: string; heroSection?: Section }) {
  const header = navigation
    .filter((item) => item.location === 'header' && !item.parent_id && usableHref(item.href))
    .sort((a, b) => a.position - b.position)
  const heroContent = heroSection?.content ?? {}
  const primaryAction = {
    label: text(heroContent.primary_cta_label) || 'Ajukan Minat Equity',
    href: usableHref(heroContent.primary_cta_href) || '/hubungi',
  }

  return (
    <V2HeaderShell>
      <div className="w-full mx-auto px-5 sm:px-8 md:px-12 lg:px-16 max-w-[1320px]">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group focus-visible:outline-none" aria-label="Nuzultrip Equity Beranda">
            <div className="flex items-center">
              <span className="text-[22px] sm:text-[24px] font-extrabold tracking-tight text-white transition-opacity group-hover:opacity-80">Nuzultrip</span>
              <span className="ml-1.5 inline-block text-[10px] font-bold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded bg-white/10 text-[#d1d5db] border border-white/15">Equity</span>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-7 xl:gap-9" aria-label="Navigasi Utama">
            {header.slice(0, 7).map((item) => (
              <Link key={item.id} href={item.href} className="text-[14px] xl:text-[15px] font-medium text-[#9ca3af] hover:text-white transition-colors relative py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">{item.label}</Link>
            ))}
          </nav>
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/masuk" className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white text-[14px] font-semibold transition-all duration-200 active:scale-98 shadow-sm group backdrop-blur-sm">
              <span>Masuk</span><Arrow />
            </Link>
          </div>
          <V2MobileHeader
            items={header.slice(0, 7).map(({ id, label, href }) => ({ id, label, href }))}
            logoSrc="/brand/nuzultrip-logo-portal.svg"
            primaryAction={primaryAction}
            loginAction={{ label: 'Masuk Portal Investor', href: '/masuk' }}
          />
        </div>
      </div>
    </V2HeaderShell>
  )
}
function Hero({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const rawTitleLines = text(c.title).split('|').map((item) => item.trim()).filter(Boolean)
  const titleLines = rawTitleLines.length > 2 ? [rawTitleLines.slice(0, -1).join(' '), rawTitleLines.at(-1) ?? ''] : rawTitleLines
  return <V2Hero
    id={section.anchor_id ?? 'beranda'}
    eyebrow={text(c.eyebrow) || 'NUZULTRIP EQUITY • EKOSISTEM PERJALANAN MUSLIM'}
    titleLines={titleLines.length ? titleLines : ['Berkembang Dalam Ekosistem Muslim', 'Yang Terintegrasi']}
    description={text(c.description) || 'Nuzultrip membangun ekosistem perjalanan Muslim melalui integrasi layanan, jaringan, dan teknologi untuk pertumbuhan investasi jangka panjang.'}
    primary={{ label: text(c.primary_cta_label) || 'Ajukan Minat Equity', href: usableHref(c.primary_cta_href) || '/hubungi' }}
    secondary={{ label: text(c.secondary_cta_label) || 'Unduh Pitchdeck 2025', href: usableHref(c.secondary_cta_href) || '#tentang-nuzultrip' }}
    tags={strings(c.tags)}
  />
}

function AboutAndStats({ intro, stats }: { intro?: Section; stats?: Section; business?: Section }) {
  if (!intro && !stats) return null
  const content = intro?.content ?? {}
  const metrics = records(stats?.content.metrics).slice(0, 5)
  return (
    <section id={intro?.anchor_id ?? 'tentang'} className="py-16 sm:py-24 lg:py-28 border-t border-black/[0.08] bg-[#F5F5F3]">
      <div className="w-full mx-auto px-5 sm:px-8 md:px-12 lg:px-16 max-w-[1320px]">
        <div className="text-center max-w-[860px] mx-auto mb-12 sm:mb-16 flex flex-col items-center">
          <div className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.16em] mb-4 sm:mb-5 select-none text-[#111111]">{text(content.eyebrow) || 'TENTANG KAMI'}</div>
          <h2 className="font-h2 font-bold text-[#111111] leading-[1.18] tracking-tight max-w-[820px] text-center">{text(content.title) || <>Menghadirkan Inovasi Teknologi<br className="hidden sm:inline" />dengan Integrasi Berkelanjutan</>}</h2>
        </div>
        {metrics.length ? <div className="border border-black/[0.14] rounded-2xl overflow-hidden bg-white/50 backdrop-blur-xs shadow-xs"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 lg:divide-x divide-black/[0.12]">
          {metrics.map((item,index)=><div key={`${text(item.label)}-${index}`} className={`p-6 sm:p-7 flex flex-col justify-between items-center text-center transition-colors duration-200 hover:bg-black/[0.03] group ${index%2===1?'sm:border-l sm:border-black/[0.12] lg:border-l-0':''} ${index>=2?'sm:border-t sm:border-black/[0.12] lg:border-t-0':''}`}>
            <div className="w-full flex flex-col items-center justify-end h-[96px] sm:h-[105px] pb-3"><div className="text-[10px] font-bold text-[#8A8A8A] uppercase tracking-[0.16em] mb-2 text-center">Metrik 0{index+1}</div><div className="font-stat-large text-[#111111] font-extrabold tracking-tight text-center group-hover:scale-105 transition-transform duration-200">{text(item.value)}</div></div>
            <div className="w-full border-t border-black/[0.1] my-0" />
            <div className="w-full pt-4 flex flex-col items-center text-center flex-1 justify-start"><p className="text-[13.5px] sm:text-[14px] font-bold text-[#222222] leading-snug text-center">{text(item.label)}</p>{text(item.description)?<p className="text-[11.5px] sm:text-[12px] text-[#666666] leading-relaxed mt-1.5 text-center line-clamp-3">{text(item.description)}</p>:null}</div>
          </div>)}
        </div></div>:null}
      </div>
    </section>
  )
}

function Offering({ section }: { section?: Section }) {
  if (!section) return null
  const content=section.content, rows=records(content.terms).slice(0,6)
  return <section id={section.anchor_id ?? 'peluang'} className="py-16 sm:py-24 lg:py-32 border-t border-black/[0.06]"><div className="w-full mx-auto px-5 sm:px-8 md:px-12 lg:px-16 max-w-[1320px]"><div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-stretch">
    <div className="lg:col-span-4 flex flex-col justify-between h-full"><div><div className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.16em] mb-4 sm:mb-5 select-none text-[#111111]">{text(content.eyebrow)||'PELUANG EQUITY'}</div><h2 className="font-h2 font-bold text-[#111111] leading-[1.05] tracking-tight mb-5 sm:mb-6">{text(content.title)||<>Kesempatan<br/>Bertumbuh<br/>Bersama</>}</h2><p className="text-[16px] sm:text-[17px] text-[#555555] leading-[1.65] max-w-[360px]">{text(content.description)||'Jadilah bagian dari perjalanan besar Nuzultrip dengan kepemilikan yang jelas, transparan, dan terstruktur.'}</p></div>
      <div className="pt-8 sm:pt-10 mt-auto"><Link href={usableHref(content.cta_href)||'/hubungi'} className="group inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer bg-transparent text-[#111111] hover:text-black p-0 border-b border-transparent hover:border-black/30 font-semibold text-[15px] py-1"><span className="truncate">{text(content.cta_label)||'Lebih Detail Penawaran'}</span><ArrowRight size={17} className="ml-2 shrink-0 transition-transform duration-200 group-hover:translate-x-1.5"/></Link></div>
    </div>
    <div className="lg:col-span-4 flex flex-col justify-between h-full py-1 min-h-[420px] sm:min-h-[480px]">{rows.map((item,index)=><div key={`${text(item.label)}-${index}`} className={`flex items-baseline justify-between gap-4 pb-3 sm:pb-3.5 ${index<rows.length-1?'border-b border-black/[0.1]':''} group`}><div className="text-[26px] sm:text-[30px] lg:text-[32px] font-extrabold text-[#111111] tracking-tight leading-none shrink-0 group-hover:translate-x-0.5 transition-transform duration-200">{text(item.value)}</div><p className="text-[13px] sm:text-[14px] text-[#666666] font-medium text-right leading-snug max-w-[200px]">{text(item.label)}</p></div>)}</div>
    <div className="lg:col-span-4 flex flex-col h-full"><div className="relative w-full h-full min-h-[420px] sm:min-h-[480px] rounded-2xl overflow-hidden shadow-lg border border-black/10 flex flex-col justify-between p-6 sm:p-7 text-white group">{text(content.card_image_url)?<CmsImage src={text(content.card_image_url)} alt={text(content.card_image_alt)||'Masjid Nabawi di waktu senja'} className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"/>:null}<div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/40 to-black/85"/><div className="relative z-10"><h3 className="text-[22px] sm:text-[25px] font-bold leading-[1.2] tracking-tight">{text(content.card_title)||<>Investasi Hari Ini,<br/>Untuk Masa Depan<br/>yang Lebih Baik.</>}</h3></div><div className="relative z-10 pt-6"><Link href={usableHref(content.card_cta_href)||'/hubungi'} className="w-full py-3.5 px-4 rounded-xl bg-white text-[#090909] font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-[#EDEDEB] active:scale-98 transition-all duration-200 shadow-sm group/btn cursor-pointer"><span>{text(content.card_cta_label)||'Ajukan Minat Equity'}</span><span className="transition-transform duration-200 group-hover/btn:translate-x-1">→</span></Link></div></div></div>
  </div></div></section>
}
function CompanyStory({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const images = records(c.images)
  const metrics = records(c.metrics)
  const primaryImage = text(c.image_url)
  const galleryImages = [
    ...(primaryImage ? [{ src: primaryImage, alt: text(c.image_alt) || 'Nuzultrip' }] : []),
    ...images.map((image, index) => ({
      src: text(image.image_url) || text(image.url),
      alt: text(image.alt) || text(image.title) || `Galeri perjalanan Nuzultrip #${index + 1}`,
    })),
  ].filter((image, index, all) => image.src && all.findIndex((candidate) => candidate.src === image.src) === index)
  const galleryMetrics = metrics.map((metric) => ({
    value: text(metric.value),
    label: text(metric.label),
  })).filter((metric) => metric.value || metric.label)

  return (
    <section className={styles.section} id={section.anchor_id ?? 'bisnis'}>
      <div className={styles.shell}><div className={styles.companyGrid}>
        <div className={styles.companyIntro}><div><div className={styles.eyebrowDark}>{text(c.eyebrow) || 'PERUSAHAAN'}</div><h2>{text(c.title) || 'Nuzultrip'}</h2>{text(c.description) ? <p>{text(c.description)}</p> : null}</div><Link href={usableHref(c.cta_href) || '#informasi-investor'} className={styles.inlineLink}>{text(c.cta_label) || 'Lebih Detail Penawaran'} <Arrow /></Link></div>
        <V2CompanyGallery images={galleryImages} metrics={galleryMetrics} />
      </div></div>
    </section>
  )
}

function Services({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const items = records(c.items).slice(0, 4)
  if (!items.length && !text(c.title)) return null
  return <section className={styles.servicesV2} id={section.anchor_id ?? 'layanan'}><div className={styles.shell}><div className={styles.servicesV2Grid}>
    <div className={styles.servicesV2Intro}><div><div className={styles.eyebrowDark}>{text(c.eyebrow)||'LAYANAN UTAMA'}</div><h2>{text(c.title)||<>Ekosistem<br/>Perjalanan Muslim<br/>Nuzultrip</>}</h2><p>{text(c.description)||'Menghubungkan mitra, vendor layanan, dan jaringan distribusi dalam satu kesatuan sistem yang transparan dan terstandar.'}</p></div><div className={styles.servicesV2IntroCta}><Link href={usableHref(c.cta_href)||'/layanan'} className={styles.inlineLink}>{text(c.cta_label)||'Layanan Lainnya'} <Arrow/></Link></div></div>
    <div className={styles.servicesV2Cards}>{items.map((item,index)=>{const href=usableHref(item.href)||'/layanan';const ServiceIcon=[Building2,Luggage,Compass,Globe2][index]??Building2;return <Link href={href} className={styles.servicesV2Card} key={`${text(item.title)}-${index}`}><div className={styles.servicesV2CardTop}><span className={styles.servicesV2Icon}>{text(item.icon_url)?<CmsIcon item={item} fallback=""/>:<ServiceIcon size={22}/>}</span><small>{text(item.code)}</small></div><div><h3>{text(item.title)}</h3><p>“{text(item.tagline)||text(item.description)}”</p></div><div className={styles.servicesV2Learn}><span>Pelajari selengkapnya</span><Arrow/></div></Link>})}</div>
  </div></div></section>
}

function Process({ offering }: { offering?: Section }) {
  if (!offering) return null
  const c = offering.content
  const steps = records(c.process_steps).slice(0,4).map((step,index)=>({number:`0${index+1}`,title:text(step.title),description:text(step.description),duration:text(step.duration),output:text(step.output)}))
  if (!steps.length) return null
  return <V2Process eyebrow={text(c.process_eyebrow)||'ALUR & TAHAPAN INVESTASI'} title={text(c.process_title)||'Langkah Mudah|Menjadi Bagian dari Kami'} description={text(c.process_description)||'Empat tahapan transparan dan berkepastian hukum untuk menjadi pemegang unit equity resmi ekosistem Nuzultrip.'} steps={steps} primary={{label:text(c.process_primary_cta_label)||'Ajukan Minat Unit Equity',href:usableHref(c.process_primary_cta_href)||'/hubungi'}} secondary={{label:text(c.process_cta_label)||'Pelajari Prosedur Lengkap',href:usableHref(c.process_cta_href)||'/informasi'}} />
}

function Roadmap({ section }: { section?: Section }) {
  if (!section) return null
  const c = section.content
  const source = records(c.milestones).length ? records(c.milestones) : records(c.items)
  if (!source.length && !text(c.title)) return null

  const items = source.map((item) => ({
    period: text(item.period) || text(item.date) || text(item.year),
    title: text(item.title) || text(item.label),
    description: text(item.description) || text(item.summary),
    status: text(item.status_label) || text(item.status),
    bullets: strings(item.bullets).length ? strings(item.bullets) : strings(item.highlights),
    metricLabel: text(item.metric_label) || text(item.kpi_label),
    metricValue: text(item.metric_value) || text(item.kpi_value),
  }))

  return (
    <section className={styles.roadmapSection} id={section.anchor_id ?? 'roadmap'}>
      <div className={styles.shell}>
        <div className={styles.roadmapHeaderExact}>
          <div>
            <div className={styles.eyebrowDark}>{text(c.eyebrow) || 'ROADMAP PERUSAHAAN'}</div>
            <h2>{text(c.title) || 'Peta Jalan Pertumbuhan Nuzultrip'}</h2>
            {text(c.description) ? <p>{text(c.description)}</p> : null}
          </div>
        </div>
        {items.length ? <V2RoadmapSlider items={items} /> : null}
      </div>
    </section>
  )
}

function Partners({ section }: { section?: Section }) {
  if (!section) return null
  const c=section.content,items=(records(c.items).length?records(c.items):records(c.logos)).slice(0,3),image=text(c.image_url)
  if(!items.length&&!text(c.title)) return null
  return <section className={styles.networkV2} id={section.anchor_id??'jaringan'}><div className={styles.shell}><div className={styles.networkV2Grid}>
    <div className={styles.networkV2Intro}><div><div className={styles.eyebrowDark}>{text(c.eyebrow)||'JARINGAN & MITRA'}</div><h2>{text(c.title)||<>Terhubung<br/>untuk<br/>Bertumbuh<br/>Bersama</>}</h2><p>{text(c.description)||'Menjadi bagian dari perjalanan bersama Nuzultrip melalui kepemilikan equity dan sinergi ekosistem.'}</p></div><div className={styles.networkV2IntroCta}><Link className={styles.inlineLink} href={usableHref(c.cta_href)||'/informasi'}>{text(c.cta_label)||'Pelajari Selengkapnya'} <Arrow/></Link></div></div>
    <div className={styles.networkV2Cards}>{items.map((item,index)=><article key={index}><span className={styles.networkV2Icon}><CmsIcon item={item} fallback={['◎','◇','▣'][index]||'◎'}/></span><div><h3>{text(item.title)||text(item.name)}</h3><p>“{text(item.description)}”</p></div></article>)}</div>
    <div className={styles.networkV2Media}>{image?<CmsImage src={image} alt={text(c.image_alt)||'Mitra dan Ekosistem Profesional Nuzultrip'}/>:null}<span className={styles.networkV2Shade}/><h3>{text(c.image_caption)||text(c.highlight_title)||<>Satu<br/>Ekosistem,<br/>Banyak<br/>Peluang</>}</h3></div>
  </div></div></section>
}

function InvestorInfo({ growth, funds, governance, risks, documents, publicDocuments }: { growth?: Section; funds?: Section; governance?: Section; risks?: Section; documents?: Section; publicDocuments: PublicPortalDocument[] }) {
  const documentPresentation = documents?.content ?? {}
  const governanceItems = records(governance?.content.items)
  const legacySections = [funds, risks].filter(Boolean) as Section[]
  const sectionCards = (governanceItems.length
    ? governanceItems.map((item, index) => ({
        key: `${governance?.id ?? 'investor'}-${text(item.title) || index}`,
        title: text(item.title),
        description: text(item.description),
        image: text(item.image_url) || text(governance?.content.image_url),
        imageAlt: text(item.image_alt),
        details: text(item.details),
        href: usableHref(item.href),
      }))
    : legacySections.flatMap((section) => {
        const c = section.content
        const nested = records(c.pillars).length ? records(c.pillars) : records(c.items)
        if (nested.length) {
          return nested.map((item) => ({
            key: `${section.id}-${text(item.title)}`,
            title: text(item.title),
            description: text(item.description),
            image: text(item.image_url) || text(c.image_url),
            imageAlt: text(item.image_alt),
            details: text(item.details),
            href: usableHref(item.href),
          }))
        }
        return [{
          key: section.id,
          title: text(c.title),
          description: text(c.description) || text(c.content),
          image: text(c.image_url),
          imageAlt: text(c.image_alt),
          details: text(c.details),
          href: usableHref(c.cta_href),
        }]
      })).filter((item) => item.title || item.description)

  const heroImage = text(documentPresentation.image_url) || sectionCards.map((item) => item.image).find(Boolean) || text(growth?.content.image_url)
  const eyebrow = text(documentPresentation.eyebrow) || 'INFORMASI INVESTOR'
  const title = text(documentPresentation.title) || 'Informasi penting dalam satu tempat'
  const availableDocumentSlots = Math.max(0, 6 - sectionCards.length)
  if (!sectionCards.length && !publicDocuments.length && !documents) return null

  return <section className={styles.infoSection} id="informasi-investor"><div className={styles.shell}>
    <div className={styles.infoHeader}><div className={styles.eyebrowDark}>{eyebrow}</div><h2>{title}</h2>{text(documentPresentation.description)?<p>{text(documentPresentation.description)}</p>:null}</div>
    <V2InvestorInfo
      fallbackImage={heroImage}
      cards={[
        ...sectionCards.slice(0, 6),
        ...publicDocuments.slice(0, availableDocumentSlots).map((document) => ({
          key: document.id,
          title: document.title,
          description: document.summary ?? '',
          image: heroImage,
          imageAlt: '',
          details: '',
          href: document.href,
        })),
      ]}
      interestHref="/hubungi"
    />
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
    <div className={styles.articleCards}>{items.slice(0,2).map((item,index)=>{const href=usableHref(item.href);const body=<><div className={styles.articleImage}><CmsImage src={text(item.image_url)} alt={text(item.title)}/><span>{text(item.type)||'Artikel'}</span></div><div className={styles.articleBody}><small>{[text(item.date), text(item.read_time)].filter(Boolean).join(' • ')}</small><h3>{text(item.title)}</h3>{text(item.description)?<p>{text(item.description)}</p>:null}<b>Baca Selengkapnya <Arrow /></b></div></>;return <article key={index}>{href?<Link href={href}>{body}</Link>:body}</article>})}</div>
  </div></div></section>
}

function ContactCta({ section, documents }: { section?: Section; documents: PublicPortalDocument[] }) {
  if (!section) return null
  const c=section.content
  const primaryHref=usableHref(c.primary_cta_href)||'/hubungi'
  const secondaryHref=usableHref(c.secondary_cta_href)||documents[0]?.href||null
  return <section className={styles.contactSection} id={section.anchor_id ?? 'kontak'}><div className={styles.shell}><div className={styles.quickLayout}>
    <div className={styles.quickIntro}><div className={styles.eyebrowLight}>{text(c.eyebrow)||'QUICK ACTION'}</div><h2>{text(c.title)||'Kenali. Pelajari. Tentukan Langkah Anda.'}</h2>{text(c.description)?<p>{text(c.description)}</p>:null}</div>
    <div className={styles.quickCards}><Link href={primaryHref}><span>{text(c.primary_cta_eyebrow)||'Investor Relations'}</span><h3>{text(c.primary_cta_label)||'Hubungi Tim'}</h3><p>{text(c.primary_cta_description)||text(c.contact_value)}</p><Arrow /></Link>{secondaryHref?<Link href={secondaryHref}><span>{text(c.secondary_cta_eyebrow)||'Dokumen Resmi'}</span><h3>{text(c.secondary_cta_label)||'Unduh Pitchdeck'}</h3><p>{text(c.secondary_cta_description)||'Pelajari ringkasan informasi Nuzultrip Equity'}</p><Arrow /></Link>:null}</div>
    <div className={styles.quickMedia}>{text(c.image_url)?<CmsImage src={text(c.image_url)} alt={text(c.image_alt)||'Nuzultrip Equity'}/>:null}<div><small>{text(c.image_eyebrow)||'LANGKAH AWAL KEMITRAAN'}</small><h3>{text(c.image_title)||'Siap Mengenal Nuzultrip Lebih Jauh?'}</h3>{text(c.image_description)?<p>{text(c.image_description)}</p>:null}<Link href={usableHref(c.image_cta_href)||primaryHref}>{text(c.image_cta_label)||'Ajukan Minat Equity'} <Arrow /></Link></div></div>
  </div></div></section>
}

function Footer({ navigation, pageTitle, content }: { navigation: NavItem[]; pageTitle: string; content?: Record<string, unknown> }) {
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
            <div className={styles.footerWordmark}><strong>{text(content?.footer_brand_name) || 'Nuzultrip'}</strong><span>{text(content?.footer_brand_badge) || 'Equity'}</span></div>
            <p>{text(content?.footer_tagline) || 'Melayani perjalanan Muslim Indonesia dengan hati, profesionalisme, dan teknologi.'}</p>
            {social.length ? (
              <div>{social.slice(0, 5).map((item) => <Link key={item.id} href={item.href} target={item.target}>{item.label}</Link>)}</div>
            ) : null}
          </div>
          {footer.length ? <div className={styles.footerColumns}>{footer.slice(0,2).map((group)=><nav key={group.id}><h4>{group.label}</h4>{(footerChildren.filter((item)=>item.parent_id===group.id).length ? footerChildren.filter((item)=>item.parent_id===group.id) : [group]).slice(0,8).map((item)=>{const href=footerHref(item);return href?<Link key={item.id} href={href}>{item.label}</Link>:<span key={item.id}>{item.label}</span>})}</nav>)}</div> : null}
          <div className={styles.newsletter}>
            <h4>{text(content?.footer_contact_title) || 'Butuh informasi terbaru?'}</h4>
            <p>{text(content?.footer_contact_description) || 'Hubungi tim Investor Relations untuk informasi, dokumen, atau pembaruan resmi Nuzultrip Equity.'}</p>
            <Link href={usableHref(content?.footer_contact_href) || '/hubungi'}>{text(content?.footer_contact_label) || 'Hubungi Kami'} <Arrow /></Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} {pageTitle}. All Rights Reserved.</span>
          <span>{text(content?.footer_bottom_text) || 'Platform Penawaran Equity Ekosistem Perjalanan Muslim Indonesia.'}</span>
        </div>
      </div>
    </footer>
  )
}

export function PublicPortalExact({ page, sections, navigation, publicDocuments, brandLogoUrl }: PublicPortalExactProps) {
  const resolved = sections

  const hero = sectionByKind(resolved, 'hero_3d')
  const intro = sectionByKind(resolved, 'intro')
  const stats = sectionByKind(resolved, 'stat_grid') ?? sectionByKind(resolved, 'financial_highlights')
  const offering = sectionByKind(resolved, 'investment_info')
  const business = sectionByKind(resolved, 'business_overview')
  const ecosystem = sectionByKind(resolved, 'ecosystem')
  const growth = sectionByKind(resolved, 'growth_story')
  const funds = sectionByKind(resolved, 'strategic_direction')
  // growth_story is the canonical roadmap source. Keep milestones only as a
  // compatibility fallback for previously published revisions.
  const roadmap = growth ?? sectionByKind(resolved, 'milestones')
  const governance = sectionByKind(resolved, 'investor_updates')
  const risks = sectionByKind(resolved, 'legal_notice')
  const documents = sectionByKind(resolved, 'documents')
  const logos = sectionByKind(resolved, 'logo_wall')
  const articles = sectionByKind(resolved, 'rich_content')
  const contactCta = sectionByKind(resolved, 'contact_cta')
  const logoSrc = brandLogoUrl || '/brand/nuzultrip-logo-portal.svg'

  return (
    <div className={styles.page}>
      <Header navigation={navigation} logoSrc={logoSrc} heroSection={hero} />
      <main id="main">
        <Hero section={hero} />
        <AboutAndStats intro={intro} stats={stats} business={business} />
        <Offering section={offering} />
        <CompanyStory section={business} />
        <Services section={ecosystem} />
        <Process offering={offering} />
        <Roadmap section={roadmap} />
        <Partners section={logos} />
        <InvestorInfo growth={growth} funds={funds} governance={governance} risks={risks} documents={documents} publicDocuments={publicDocuments} />
        <ContactCta section={contactCta} documents={publicDocuments} />
        <Articles section={articles} />
      </main>
      <Footer navigation={navigation} pageTitle={page.title} content={contactCta?.content} />
    </div>
  )
}
