import type { ComponentProps } from 'react'
import Link from 'next/link'
import { ArrowRight, Building, Building2, Compass, Disc as TikTokIcon, Facebook, FileDown, Globe2, Handshake, Instagram, Luggage, Phone, Users } from 'lucide-react'

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
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
  }

  // Visual CMS multiline fields are stored as strings. Accept that shape too so
  // responsive V2 components receive the same list data without requiring JSON mode.
  if (typeof value === 'string') {
    return value.split(/\\r?\\n/).map((item) => item.trim()).filter(Boolean)
  }

  return []
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

function Header({ navigation, logoSrc, heroSection }: { navigation: NavItem[]; logoSrc: string; heroSection?: Section }) {
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
            {logoSrc ? <CmsImage src={logoSrc} alt="Nuzultrip Equity" className="h-7 sm:h-8 w-auto max-w-[180px] object-contain object-left" /> : <div className="flex items-center">
              <span className="text-[22px] sm:text-[24px] font-extrabold tracking-tight text-white transition-opacity group-hover:opacity-80">Nuzultrip</span>
              <span className="ml-1.5 inline-block text-[10px] font-bold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded bg-white/10 text-[#d1d5db] border border-white/15">Equity</span>
            </div>}
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
            logoSrc={logoSrc || "/brand/nuzultrip-logo-portal.svg"}
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
  const content=section.content, images=records(content.images), metrics=records(content.metrics)
  const primaryImage=text(content.image_url)
  const galleryImages=[...(primaryImage?[{src:primaryImage,alt:text(content.image_alt)||'Nuzultrip'}]:[]),...images.map((image,index)=>({src:text(image.image_url)||text(image.url),alt:text(image.alt)||text(image.title)||`Galeri perjalanan Nuzultrip #${index+1}`}))].filter((image,index,all)=>image.src&&all.findIndex((candidate)=>candidate.src===image.src)===index)
  const galleryMetrics=metrics.map((metric)=>({value:text(metric.value),label:text(metric.label)})).filter((metric)=>metric.value||metric.label)
  return <section id={section.anchor_id??'perusahaan'} className="py-16 sm:py-24 lg:py-32 border-t border-black/[0.06]"><div className="w-full mx-auto px-5 sm:px-8 md:px-12 lg:px-16 max-w-[1320px]"><div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-stretch">
    <div className="lg:col-span-4 flex flex-col justify-between h-full"><div><div className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.16em] mb-4 sm:mb-5 select-none text-[#111111]">{text(content.eyebrow)||'PERUSAHAAN'}</div><h2 className="font-h2 font-bold text-[#111111] leading-[1.05] tracking-tight mb-5 sm:mb-6">{text(content.title)||<>Perjalanan<br/>Muslim yang<br/>Bertumbuh</>}</h2><p className="text-[16px] sm:text-[17px] text-[#555555] leading-[1.65] max-w-[360px]">{text(content.description)||'Menghadirkan layanan perjalanan ibadah yang bermakna melalui layanan, jaringan, dan teknologi.'}</p></div><div className="pt-8 sm:pt-10 mt-auto"><Link href={usableHref(content.cta_href)||'#informasi-investor'} className="group inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer bg-transparent text-[#111111] hover:text-black p-0 border-b border-transparent hover:border-black/30 font-semibold text-[15px] py-1"><span className="truncate">{text(content.cta_label)||'Lebih Detail Penawaran'}</span><ArrowRight size={17} className="ml-2 shrink-0 transition-transform duration-200 group-hover:translate-x-1.5"/></Link></div></div>
    <V2CompanyGallery images={galleryImages} metrics={galleryMetrics}/>
  </div></div></section>
}

function Services({ section }: { section?: Section }) {
  if (!section) return null
  const content=section.content,items=records(content.items).slice(0,4)
  if(!items.length&&!text(content.title))return null
  return <section id={section.anchor_id??'layanan'} className="py-16 sm:py-24 lg:py-32 border-t border-black/[0.06]"><div className="w-full mx-auto px-5 sm:px-8 md:px-12 lg:px-16 max-w-[1320px]"><div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
    <div className="lg:col-span-4 flex flex-col justify-between h-full"><div><div className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.16em] mb-4 sm:mb-5 select-none text-[#111111]">{text(content.eyebrow)||'LAYANAN UTAMA'}</div><h2 className="font-h2 font-bold text-[#111111] leading-[1.05] tracking-tight mb-5 sm:mb-6">{text(content.title)||<>Ekosistem<br/>Perjalanan Muslim<br/>Nuzultrip</>}</h2><p className="text-[16px] sm:text-[17px] text-[#555555] leading-[1.65] max-w-[360px]">{text(content.description)||'Menghubungkan mitra, vendor layanan, dan jaringan distribusi dalam satu kesatuan sistem yang transparan dan terstandar.'}</p></div><div className="pt-8 sm:pt-10 mt-auto"><Link href={usableHref(content.cta_href)||'/layanan'} className="group inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer bg-transparent text-[#111111] hover:text-black p-0 border-b border-transparent hover:border-black/30 font-semibold text-[15px] py-1"><span className="truncate">{text(content.cta_label)||'Layanan Lainnya'}</span><ArrowRight size={17} className="ml-2 shrink-0 transition-transform duration-200 group-hover:translate-x-1.5"/></Link></div></div>
    <div className="lg:col-span-8 flex flex-col justify-between"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">{items.map((item,index)=>{const Icon=[Building2,Luggage,Compass,Globe2][index]??Building2;const href=usableHref(item.href)||'/layanan';return <Link href={href} key={`${text(item.title)}-${index}`} className="bg-white rounded-2xl p-6 sm:p-7 border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[180px] sm:min-h-[200px] hover:-translate-y-1 hover:border-black/25 hover:shadow-md transition-all duration-300 cursor-pointer group"><div className="flex items-start justify-between mb-4"><div className="w-12 h-12 rounded-xl bg-[#F5F5F3] flex items-center justify-center border border-black/[0.06] group-hover:scale-105 group-hover:bg-[#10b981] group-hover:border-[#10b981] group-hover:shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition-all duration-300">{text(item.icon_url)?<CmsIcon item={item} fallback=""/>:<Icon size={24} className="transition-colors duration-200 text-[#111111] group-hover:text-white"/>}</div><span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#888888] group-hover:text-black transition-colors">{text(item.code)}</span></div><div><h3 className="text-[18px] sm:text-[19px] font-bold text-[#111111] mb-2 tracking-tight group-hover:text-black">{text(item.title)}</h3><p className="text-[14px] sm:text-[14.5px] text-[#666666] leading-relaxed">“{text(item.tagline)||text(item.description)}”</p></div><div className="mt-4 pt-3 border-t border-black/[0.04] flex items-center justify-between text-[13px] font-semibold text-[#111111] opacity-0 group-hover:opacity-100 transition-opacity"><span>Pelajari selengkapnya</span><ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/></div></Link>})}</div></div>
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
  const c=section.content,source=records(c.milestones).length?records(c.milestones):records(c.items)
  if(!source.length&&!text(c.title))return null
  const items=source.map((item)=>({period:text(item.period)||text(item.date)||text(item.year),title:text(item.title)||text(item.label),description:text(item.description)||text(item.summary),status:text(item.status_label)||text(item.status),bullets:strings(item.bullets).length?strings(item.bullets):strings(item.highlights),metricLabel:text(item.metric_label)||text(item.kpi_label),metricValue:text(item.metric_value)||text(item.kpi_value)}))
  return <section id={section.anchor_id??'roadmap'} className="py-14 sm:py-18 lg:py-20 border-t border-black/[0.08] bg-[#FAFAF8] overflow-hidden"><div className="w-full mx-auto px-5 sm:px-8 md:px-12 lg:px-16 max-w-[1320px]"><div className="relative">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-10"><div><div className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.16em] mb-4 sm:mb-5 select-none text-[#111111]">{text(c.eyebrow)||'ROADMAP PERUSAHAAN'}</div><h2 className="font-h2 font-bold text-[#111111] leading-[1.12] tracking-tight">{text(c.title)||'Peta Jalan Pertumbuhan Nuzultrip'}</h2><p className="text-[14.5px] sm:text-[15.5px] text-[#666666] mt-2 max-w-xl">{text(c.description)||'Tahapan strategis pengembangan bisnis, platform teknologi, dan tata kelola investasi jangka panjang.'}</p></div></div>
    <V2RoadmapSlider items={items}/>
  </div></div></section>
}
function Partners({ section }: { section?: Section }) {
  if (!section) return null
  const c=section.content,items=(records(c.items).length?records(c.items):records(c.logos)).slice(0,3),image=text(c.image_url)
  if(!items.length&&!text(c.title)) return null
  const icons=[Users,Handshake,Building]
  return <section id={section.anchor_id??'jaringan'} className="py-16 sm:py-24 lg:py-32 border-t border-black/[0.06]"><div className="w-full mx-auto px-5 sm:px-8 md:px-12 lg:px-16 max-w-[1320px]"><div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-stretch">
    <div className="lg:col-span-4 flex flex-col justify-between h-full"><div><div className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.16em] mb-4 sm:mb-5 select-none text-[#111111]">{text(c.eyebrow)||'JARINGAN & MITRA'}</div><h2 className="font-h2 font-bold text-[#111111] leading-[1.05] tracking-tight mb-5 sm:mb-6">{text(c.title)||<>Terhubung<br/>untuk<br/>Bertumbuh<br/>Bersama</>}</h2><p className="text-[16px] sm:text-[17px] text-[#555555] leading-[1.65] max-w-[360px]">{text(c.description)||'Menjadi bagian dari perjalanan bersama Nuzultrip melalui kepemilikan equity dan sinergi ekosistem.'}</p></div><div className="pt-8 sm:pt-10 mt-auto"><Link href={usableHref(c.cta_href)||'/informasi'} className="group inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer bg-transparent text-[#111111] hover:text-black p-0 border-b border-transparent hover:border-black/30 font-semibold text-[15px] py-1"><span className="truncate">{text(c.cta_label)||'Pelajari Selengkapnya'}</span><ArrowRight size={17} className="ml-2 shrink-0 transition-transform duration-200 group-hover:translate-x-1.5"/></Link></div></div>
    <div className="lg:col-span-4 flex flex-col justify-between gap-4">{items.map((item,index)=>{const Icon=icons[index]??Users;return <div key={index} className="bg-white rounded-2xl p-6 border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-start gap-4 hover:border-black/20 hover:shadow-md transition-all duration-300 group flex-1"><div className="w-11 h-11 rounded-xl bg-[#F5F5F3] flex items-center justify-center shrink-0 border border-black/[0.06] group-hover:scale-105 group-hover:bg-white transition-all duration-200">{text(item.icon_url)?<CmsIcon item={item} fallback=""/>:<Icon size={22} className="text-[#111111]"/>}</div><div><h3 className="text-[17px] sm:text-[18px] font-bold text-[#111111] mb-1.5 tracking-tight group-hover:text-black">{text(item.title)||text(item.name)}</h3><p className="text-[13.5px] sm:text-[14px] text-[#666666] leading-relaxed">“{text(item.description)}”</p></div></div>})}</div>
    <div className="lg:col-span-4 flex flex-col h-full"><div className="relative w-full h-full min-h-[380px] sm:min-h-[460px] rounded-2xl overflow-hidden shadow-lg border border-black/10 flex flex-col justify-end p-7 text-white group">{image?<CmsImage src={image} alt={text(c.image_alt)||'Mitra dan Ekosistem Profesional Nuzultrip'} className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"/>:null}<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"/><div className="relative z-10"><h3 className="text-[28px] sm:text-[32px] font-bold leading-[1.1] tracking-tight">{text(c.image_caption)||text(c.highlight_title)||<>Satu<br/>Ekosistem,<br/>Banyak<br/>Peluang</>}</h3></div></div></div>
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

  return <section id="informasi" className="py-16 sm:py-24 lg:py-32 border-t border-black/[0.06]"><div className="w-full mx-auto px-5 sm:px-8 md:px-12 lg:px-16 max-w-[1320px]">
    <div className="max-w-[720px] mb-12 sm:mb-16"><div className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.16em] mb-4 sm:mb-5 select-none text-[#111111]">{eyebrow}</div><h2 className="font-h2 font-bold text-[#111111] leading-[1.08] tracking-tight">{title}</h2>{text(documentPresentation.description)?<p className="text-[15px] sm:text-[16px] text-[#666666] leading-relaxed mt-3">{text(documentPresentation.description)}</p>:null}</div>
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
  const c=section.content,items=records(c.items)
  if(!items.length)return null
  const ctaHref=usableHref(c.cta_href)||usableHref(items[0]?.href)
  return <section id={section.anchor_id??'artikel'} className="py-16 sm:py-24 lg:py-32 border-t border-black/[0.06]"><div className="w-full mx-auto px-5 sm:px-8 md:px-12 lg:px-16 max-w-[1320px]"><div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
    <div className="lg:col-span-4 flex flex-col justify-between h-full"><div><div className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.16em] mb-4 sm:mb-5 select-none text-[#111111]">{text(c.eyebrow)||'ARTIKEL & BERITA'}</div><h2 className="font-h2 font-bold text-[#111111] leading-[1.05] tracking-tight mb-5 sm:mb-6">{text(c.title)||'Wawasan untuk Keputusan yang Lebih Baik'}</h2>{text(c.description)?<p className="text-[16px] sm:text-[17px] text-[#555555] leading-[1.65] max-w-[360px]">{text(c.description)}</p>:null}</div>{ctaHref?<div className="pt-8 sm:pt-10 mt-auto"><Link href={ctaHref} className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#111111] hover:gap-3 transition-all">{text(c.cta_label)||'Lebih Artikel Lainnya'} <ArrowRight size={15}/></Link></div>:null}</div>
    <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">{items.slice(0,2).map((item,index)=>{const href=usableHref(item.href);const body=<><div className="relative w-full h-[210px] overflow-hidden bg-[#E8E8E4]"><CmsImage src={text(item.image_url)} alt={text(item.image_alt)||text(item.title)} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"/><div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-[#111111] uppercase tracking-[0.1em]">{text(item.type)||'Artikel'}</div></div><div className="p-6 sm:p-7 flex flex-col justify-between flex-1"><div><div className="flex items-center gap-3 text-[12px] text-[#888888] font-medium mb-2.5"><span>{text(item.date)}</span>{text(item.date)&&text(item.read_time)?<span>•</span>:null}<span>{text(item.read_time)}</span></div><h3 className="text-[19px] sm:text-[20px] font-bold text-[#111111] leading-snug tracking-tight mb-2.5">{text(item.title)}</h3>{text(item.description)?<p className="text-[14px] text-[#666666] leading-relaxed line-clamp-3">{text(item.description)}</p>:null}</div><div className="mt-6 pt-4 border-t border-black/[0.06] flex items-center justify-between text-[13px] font-bold text-[#111111]"><span>Baca Selengkapnya</span><ArrowRight size={15} className="group-hover:translate-x-1.5 transition-transform duration-200"/></div></div></>;return <article key={index} className="bg-white rounded-2xl overflow-hidden border border-black/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-black/25 hover:shadow-md transition-all duration-300 group">{href?<Link href={href} className="flex flex-col h-full">{body}</Link>:body}</article>})}</div>
  </div></div></section>
}
function ContactCta({ section, documents }: { section?: Section; documents: PublicPortalDocument[] }) {
  if (!section) return null
  const c=section.content
  const primaryHref=usableHref(c.primary_cta_href)||'/hubungi'
  const secondaryHref=usableHref(c.secondary_cta_href)||documents[0]?.href||null
  return <section id={section.anchor_id??'kontak'} className="bg-[#080808] text-white py-16 sm:py-24 lg:py-28"><div className="w-full mx-auto px-5 sm:px-8 md:px-12 lg:px-16 max-w-[1320px]"><div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-stretch">
    <div className="lg:col-span-4 flex flex-col justify-between"><div><div className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.16em] mb-4 sm:mb-5 select-none text-white/70">{text(c.eyebrow)||'QUICK ACTION'}</div><h2 className="font-h2 font-bold text-white leading-[1.05] tracking-tight mb-4">{text(c.title)||<>Kenali. Pelajari.<br/>Tentukan Langkah<br/>Anda.</>}</h2><p className="text-[15px] sm:text-[16px] text-white/65 leading-relaxed max-w-[320px]">{text(c.description)||'Tim Investor Relations kami siap memberikan pendampingan personal bagi calon mitra dan investor strategis.'}</p></div></div>
    <div className="lg:col-span-4 flex flex-col justify-between gap-4">
      <Link href={primaryHref} className="bg-white/[0.04] hover:bg-white/[0.08] rounded-2xl p-6 border border-white/15 hover:border-white/35 transition-all duration-300 flex flex-col justify-between flex-1 group cursor-pointer"><div className="flex items-center justify-between mb-4"><div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:scale-105 transition-transform"><Phone size={18}/></div><ArrowRight size={16} className="text-white/60 group-hover:translate-x-1 group-hover:text-white transition-all"/></div><div><span className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/60">{text(c.primary_cta_eyebrow)||'Investor Relations'}</span><h3 className="text-[18px] sm:text-[20px] font-bold text-white mt-1">{text(c.primary_cta_label)||'Hubungi Tim'}</h3><p className="text-[14px] text-white/70 mt-1">{text(c.primary_cta_description)||text(c.contact_value)}</p></div></Link>
      {secondaryHref?<Link href={secondaryHref} className="bg-white/[0.04] hover:bg-white/[0.08] rounded-2xl p-6 border border-white/15 hover:border-white/35 transition-all duration-300 flex flex-col justify-between flex-1 group cursor-pointer"><div className="flex items-center justify-between mb-4"><div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white group-hover:scale-105 transition-transform"><FileDown size={18}/></div><ArrowRight size={16} className="text-white/60 group-hover:translate-x-1 group-hover:text-white transition-all"/></div><div><span className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/60">{text(c.secondary_cta_eyebrow)||'Dokumen Resmi'}</span><h3 className="text-[18px] sm:text-[20px] font-bold text-white mt-1">{text(c.secondary_cta_label)||'Unduh Pitchdeck'}</h3><p className="text-[14px] text-white/70 mt-1">{text(c.secondary_cta_description)||'Pelajari ringkasan model bisnis & proyeksi'}</p></div></Link>:null}
    </div>
    <div className="lg:col-span-4 flex flex-col"><div className="relative w-full h-full min-h-[320px] rounded-2xl overflow-hidden border border-white/15 flex flex-col justify-between p-7 text-white group">{text(c.image_url)?<CmsImage src={text(c.image_url)} alt={text(c.image_alt)||'Ekosistem Nuzultrip'} className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"/>:null}<div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/70"/><div className="relative z-10"><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">{text(c.image_eyebrow)||'Langkah Awal Kemitraan'}</span><h3 className="text-[22px] sm:text-[24px] font-bold text-white mt-2 leading-[1.2]">{text(c.image_title)||'Siap Mengenal Nuzultrip Lebih Jauh?'}</h3><p className="text-[14px] text-white/75 mt-2 leading-relaxed">{text(c.image_description)||'Dapatkan konsultasi eksklusif mengenai struktur kepemilikan dan skema bagi hasil.'}</p></div><div className="relative z-10 pt-6"><Link href={usableHref(c.image_cta_href)||primaryHref} className="w-full py-3 px-5 rounded-xl bg-white text-[#090909] font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-[#EDEDEB] transition-all shadow-md group/btn"><span>{text(c.image_cta_label)||'Ajukan Minat Equity'}</span><ArrowRight size={15} className="group-hover/btn:translate-x-1 transition-transform"/></Link></div></div></div>
  </div></div></section>
}
function Footer({ navigation, pageTitle, logoSrc, content }: { navigation: NavItem[]; pageTitle: string; logoSrc: string; content?: Record<string, unknown> }) {
  const roots=navigation.filter((item)=>item.location==='footer'&&!item.parent_id).sort((a,b)=>a.position-b.position)
  const children=navigation.filter((item)=>item.location==='footer'&&Boolean(item.parent_id)).sort((a,b)=>a.position-b.position)
  const social=navigation.filter((item)=>item.location==='social'&&!item.parent_id&&usableHref(item.href)).sort((a,b)=>a.position-b.position)
  const socialKind=(item:NavItem)=>{const value=(item.label+' '+text((item as unknown as Record<string,unknown>).icon)).toLowerCase();if(value.includes('instagram'))return 'instagram';if(value.includes('facebook')||value==='fb'||value.includes(' fb'))return 'facebook';if(value.includes('tiktok')||value.includes('tik tok'))return 'tiktok';return null}
  const socialThree=social.map((item)=>({item,kind:socialKind(item)})).filter((entry):entry is {item:NavItem;kind:'instagram'|'facebook'|'tiktok'}=>Boolean(entry.kind)).filter((entry,index,array)=>array.findIndex((candidate)=>candidate.kind===entry.kind)===index).slice(0,3)
  const footerHref=(item:NavItem)=>usableHref(item.href)
  return <footer id="site-footer" className="bg-[#080808] text-white pt-16 sm:pt-20 pb-12 border-t border-white/10"><div className="w-full mx-auto px-5 sm:px-8 md:px-12 lg:px-16 max-w-[1320px]">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-16 border-b border-white/15">
      <div className="lg:col-span-4 flex flex-col justify-between"><div><div className="flex items-center mb-4 min-w-0">{logoSrc?<CmsImage src={logoSrc} alt="Nuzultrip" className="h-7 sm:h-8 w-auto max-w-[180px] object-contain object-left"/>:<span className="text-[24px] sm:text-[26px] font-extrabold tracking-tight text-white">Nuzultrip</span>}<span className="ml-2 shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded bg-white/10 text-white/80 border border-white/15">EQUITY</span></div><p className="text-[14px] sm:text-[15px] text-white/70 leading-relaxed max-w-[320px]">{text(content?.footer_tagline)||'Melayani perjalanan Muslim Indonesia dengan hati, profesionalisme, dan teknologi.'}</p></div>{socialThree.length?<div className="mt-8 flex items-center gap-3">{socialThree.map(({item,kind})=><Link key={item.id} href={item.href} target={item.target} aria-label={item.label} className="w-9 h-9 shrink-0 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">{kind==='instagram'?<Instagram size={17}/>:kind==='facebook'?<Facebook size={17}/>:<Music2 size={17}/>} </Link>)}</div>:null}</div>
      {roots.slice(0,2).map((group,index)=><div key={group.id} className={index===0?'lg:col-span-3':'lg:col-span-2'}><h4 className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/50 mb-5">{group.label}</h4><ul className="space-y-2.5">{(children.filter((item)=>item.parent_id===group.id).length?children.filter((item)=>item.parent_id===group.id):[group]).slice(0,8).map((item)=>{const href=footerHref(item);return <li key={item.id}>{href?<Link href={href} target={item.target} className="text-[14px] text-white/75 hover:text-white transition-colors">{item.label}</Link>:<span className="text-[14px] text-white/75">{item.label}</span>}</li>})}</ul></div>)}
      {roots.length<2?<><div className="lg:col-span-3"/><div className="lg:col-span-2"/></>:null}
      <div className="lg:col-span-3"><div className="bg-white/[0.04] rounded-2xl p-6 border border-white/15"><h4 className="text-[12px] font-bold uppercase tracking-[0.16em] text-white/60 mb-2">{text(content?.footer_contact_title)||'BUTUH INFORMASI TERBARU?'}</h4><p className="text-[13.5px] text-white/70 leading-relaxed mb-5">{text(content?.footer_contact_description)||'Hubungi tim Investor Relations untuk informasi, dokumen, atau pembaruan resmi Nuzultrip Equity.'}</p><Link href={usableHref(content?.footer_contact_href)||'/hubungi'} className="w-full py-2.5 px-4 rounded-xl bg-white text-[#090909] font-bold text-[13.5px] flex items-center justify-center gap-2 hover:bg-[#EDEDEB] transition-all group"><span>{text(content?.footer_contact_label)||'Hubungi Kami'}</span><ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/></Link></div></div>
    </div>
    <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-white/50"><p>© {new Date().getFullYear()} {pageTitle}. All Rights Reserved.</p><p className="text-center sm:text-right">{text(content?.footer_bottom_text)||'Platform Penawaran Equity Ekosistem Perjalanan Muslim Indonesia.'}</p></div>
  </div></footer>
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
      <Footer navigation={navigation} pageTitle={page.title} logoSrc={logoSrc} content={contactCta?.content} />
    </div>
  )
}
