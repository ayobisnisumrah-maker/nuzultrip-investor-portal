import Image from 'next/image'
import Link from 'next/link'

import { submitPortalInquiry } from '@/server/portal/inquiry-actions'
import type { PublicPortalSection } from '@/server/portal/public-queries'

import styles from './public-portal-reference-v2.module.css'

type NavItem = {
  id: string
  location: 'header' | 'footer' | 'legal' | 'social'
  label: string
  href: string
  target: string
  position: number
  parent_id: string | null
}

type Props = {
  page: { title: string; seo: unknown }
  sections: PublicPortalSection[]
  navigation: NavItem[]
  brandLogoUrl?: string | null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function list(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : []
}

function anchor(section: PublicPortalSection) {
  return section.anchor_id ?? section.id
}

function CmsImage({ src, alt, className }: { src: unknown; alt?: unknown; className?: string }) {
  const url = text(src)
  if (!url) return null
  // CMS media lives in a project-specific public bucket, so it cannot be constrained to a static Next image hostname.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={text(alt) ?? ''} className={className} />
}

function Eyebrow({ children }: { children: string | null }) {
  return children ? <p className={styles.eyebrow}>{children}</p> : null
}

function ArrowLink({ href, children, light = false }: { href: string; children: string; light?: boolean }) {
  return (
    <Link href={href} className={`${styles.arrowLink} ${light ? styles.lightLink : ''}`}>
      <span>{children}</span><span aria-hidden="true">→</span>
    </Link>
  )
}

function Hero({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const title = text(c.title)
  const titleLines = title?.split('|').map((line) => line.trim()).filter(Boolean) ?? []
  const tags = Array.isArray(c.tags) ? c.tags.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : []
  const primaryLabel = text(c.primary_cta_label)
  const primaryHref = text(c.primary_cta_href)
  const secondaryLabel = text(c.secondary_cta_label)
  const secondaryHref = text(c.secondary_cta_href)

  return (
    <section id={anchor(section)} className={styles.hero}>
      <div className={styles.heroCopy}>
        <Eyebrow>{text(c.eyebrow)}</Eyebrow>
        {titleLines.length ? (
          <h1>{titleLines.map((line) => <span key={line}>{line}</span>)}</h1>
        ) : null}
        {text(c.description) ? <p className={styles.heroLead}>{text(c.description)}</p> : null}
        {(primaryLabel && primaryHref) || (secondaryLabel && secondaryHref) ? (
          <div className={styles.heroActions}>
            {primaryLabel && primaryHref ? <Link href={primaryHref} className={styles.heroPrimary}>{primaryLabel}<span aria-hidden="true">→</span></Link> : null}
            {secondaryLabel && secondaryHref ? <ArrowLink href={secondaryHref} light>{secondaryLabel}</ArrowLink> : null}
          </div>
        ) : null}
        {tags.length ? <div className={styles.heroTags}>{tags.slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
      </div>
      <div className={styles.heroMedia}>
        <CmsImage src={c.image_url} alt={c.image_alt} className={styles.heroImage} />
        {text(c.image_caption) ? <p className={styles.heroCaption}>{text(c.image_caption)}</p> : null}
      </div>
    </section>
  )
}

function Intro({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const features = list(c.features)
  return (
    <section id={anchor(section)} className={styles.section}>
      <div className={styles.editorialIntro}>
        <Eyebrow>{text(c.eyebrow)}</Eyebrow>
        <h2>{text(c.title)}</h2>
        <div className={styles.introBody}>
          {text(c.description) ? <p>{text(c.description)}</p> : null}
          {text(c.primary_cta_label) && text(c.primary_cta_href) ? <ArrowLink href={text(c.primary_cta_href)!}>{text(c.primary_cta_label)!}</ArrowLink> : null}
        </div>
      </div>
      {features.length ? (
        <div className={styles.metricStrip}>
          {features.slice(0, 5).map((item, index) => (
            <article key={`${section.id}-intro-${index}`}>
              <strong>{text(item.value) ?? text(item.title)}</strong>
              <span>{text(item.label) ?? text(item.description)}</span>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function Stats({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const metrics = list(c.metrics)
  return (
    <section id={anchor(section)} className={`${styles.section} ${styles.compactSection}`}>
      {(text(c.eyebrow) || text(c.title) || text(c.description)) ? (
        <div className={styles.editorialIntro}>
          <Eyebrow>{text(c.eyebrow)}</Eyebrow>
          <h2>{text(c.title)}</h2>
          <div className={styles.introBody}>{text(c.description) ? <p>{text(c.description)}</p> : null}</div>
        </div>
      ) : null}
      <div className={styles.metricStrip}>
        {metrics.slice(0, 6).map((item, index) => (
          <article key={`${section.id}-stat-${index}`}>
            <strong>{text(item.value)}</strong>
            <span>{text(item.label)}</span>
            {text(item.description) ? <small>{text(item.description)}</small> : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function Offering({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const terms = list(c.terms).length ? list(c.terms) : list(c.use_of_funds)
  const steps = list(c.process_steps)
  return (
    <section id={anchor(section)} className={styles.section}>
      <div className={styles.threeColumn}>
        <div className={styles.leftColumn}>
          <Eyebrow>{text(c.eyebrow)}</Eyebrow>
          <h2>{text(c.title)}</h2>
          {text(c.description) ? <p>{text(c.description)}</p> : null}
          {text(c.process_cta_label) && text(c.process_cta_href) ? <ArrowLink href={text(c.process_cta_href)!}>{text(c.process_cta_label)!}</ArrowLink> : null}
        </div>
        <div className={styles.equityTable}>
          {text(c.funding_target) ? (
            <div className={styles.equityRow}><span>{text(c.funding_label) ?? 'Target'}</span><strong>{[text(c.funding_currency), text(c.funding_target)].filter(Boolean).join(' ')}</strong></div>
          ) : null}
          {terms.map((row, index) => (
            <div className={styles.equityRow} key={`${section.id}-term-${index}`}>
              <span>{text(row.label) ?? text(row.title)}</span>
              <strong>{text(row.value) ?? text(row.description)}</strong>
            </div>
          ))}
        </div>
        <aside className={styles.darkCard}>
          <h3>{text(c.process_title) ?? text(c.notice) ?? text(c.title)}</h3>
          {steps.length ? (
            <ol>{steps.slice(0, 4).map((item, index) => <li key={`${section.id}-step-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><b>{text(item.title)}</b><p>{text(item.description)}</p></div></li>)}</ol>
          ) : text(c.risk_note) ? <p>{text(c.risk_note)}</p> : null}
          {text(c.process_cta_label) && text(c.process_cta_href) ? <ArrowLink href={text(c.process_cta_href)!} light>{text(c.process_cta_label)!}</ArrowLink> : null}
        </aside>
      </div>
      {text(c.risk_note) && steps.length ? <p className={styles.note}>{text(c.risk_note)}</p> : null}
    </section>
  )
}

function Business({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const items = list(c.items)
  return (
    <section id={anchor(section)} className={styles.section}>
      <div className={styles.mediaStory}>
        <div className={styles.leftColumn}>
          <Eyebrow>{text(c.eyebrow)}</Eyebrow>
          <h2>{text(c.title)}</h2>
          {text(c.description) ? <p>{text(c.description)}</p> : null}
          {text(c.primary_cta_label) && text(c.primary_cta_href) ? <ArrowLink href={text(c.primary_cta_href)!}>{text(c.primary_cta_label)!}</ArrowLink> : null}
        </div>
        <div className={styles.storyMedia}>
          <CmsImage src={c.image_url} alt={c.image_alt} className={styles.storyImage} />
          {text(c.image_caption) ? <h3>{text(c.image_caption)}</h3> : null}
        </div>
      </div>
      {items.length ? <div className={styles.serviceCards}>{items.slice(0, 4).map((item, index) => <article key={`${section.id}-business-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><h3>{text(item.title)}</h3><p>{text(item.description)}</p></article>)}</div> : null}
    </section>
  )
}

function Ecosystem({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const items = list(c.items)
  return (
    <section id={anchor(section)} className={styles.section}>
      <div className={styles.sideBySide}>
        <div className={styles.leftColumn}><Eyebrow>{text(c.eyebrow)}</Eyebrow><h2>{text(c.title)}</h2>{text(c.description) ? <p>{text(c.description)}</p> : null}</div>
        <div className={styles.serviceCards}>
          {items.slice(0, 6).map((item, index) => (
            <article key={`${section.id}-eco-${index}`}>
              <div className={styles.iconBox}>{text(item.icon) ?? '↗'}</div>
              <h3>{text(item.title)}</h3><p>{text(item.description)}</p>
              {text(item.caption) ? <small>{text(item.caption)}</small> : null}
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
    <section id={anchor(section)} className={styles.section}>
      <div className={styles.sideBySide}>
        <div className={styles.leftColumn}><Eyebrow>{text(c.eyebrow)}</Eyebrow><h2>{text(c.title)}</h2>{text(c.description) ? <p>{text(c.description)}</p> : null}</div>
        <div className={styles.stepGrid}>
          {milestones.slice(0, 6).map((item, index) => <article key={`${section.id}-growth-${index}`}><strong>{String(index + 1).padStart(2, '0')}</strong><h3>{text(item.title)}</h3><p>{text(item.description)}</p></article>)}
        </div>
      </div>
    </section>
  )
}

function LogoWall({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const logos = list(c.logos)
  return (
    <section id={anchor(section)} className={styles.section}>
      <div className={styles.sideBySide}>
        <div className={styles.leftColumn}><Eyebrow>{text(c.eyebrow)}</Eyebrow><h2>{text(c.title)}</h2></div>
        <div className={styles.logoGrid}>{logos.map((logo, index) => {
          const url = text(logo.image_url)
          const content = url ? <CmsImage src={url} alt={logo.name} /> : <span>{text(logo.name)}</span>
          const href = text(logo.href)
          return href ? <Link href={href} key={`${section.id}-logo-${index}`}>{content}</Link> : <div key={`${section.id}-logo-${index}`}>{content}</div>
        })}</div>
      </div>
    </section>
  )
}

function Updates({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const items = list(c.items)
  return (
    <section id={anchor(section)} className={styles.darkSection}>
      <div className={styles.sideBySide}>
        <div className={styles.darkIntro}><Eyebrow>{text(c.eyebrow)}</Eyebrow><h2>{text(c.title)}</h2>{text(c.description) ? <p>{text(c.description)}</p> : null}</div>
        <div className={styles.articleGrid}>{items.slice(0, 4).map((item, index) => {
          const href = text(item.href) ?? text(item.url)
          const card = <><CmsImage src={item.image_url} alt={item.title} className={styles.articleImage} /><div className={styles.articleBody}><h3>{text(item.title)}</h3><p>{text(item.description)}</p>{text(item.date) ? <small>{text(item.date)}</small> : null}<span aria-hidden="true">→</span></div></>
          return href ? <Link href={href} className={styles.articleCard} key={`${section.id}-article-${index}`}>{card}</Link> : <article className={styles.articleCard} key={`${section.id}-article-${index}`}>{card}</article>
        })}</div>
      </div>
    </section>
  )
}

function Documents({ section }: { section: PublicPortalSection }) {
  const c = section.content
  return <section id={anchor(section)} className={styles.section}><div className={styles.sideBySide}><div className={styles.leftColumn}><Eyebrow>{text(c.eyebrow)}</Eyebrow><h2>{text(c.title)}</h2>{text(c.description) ? <p>{text(c.description)}</p> : null}</div><div className={styles.documentGrid}>{list(c.items).map((item, index) => { const href = text(item.href) ?? text(item.url); const content = <><span>↗</span><b>{text(item.title) ?? text(item.label)}</b></>; return href ? <Link href={href} key={`${section.id}-doc-${index}`}>{content}</Link> : <div key={`${section.id}-doc-${index}`}>{content}</div> })}</div></div></section>
}

function Faq({ section }: { section: PublicPortalSection }) {
  const c = section.content
  return <section id={anchor(section)} className={styles.section}><div className={styles.sideBySide}><div className={styles.leftColumn}><Eyebrow>{text(c.eyebrow)}</Eyebrow><h2>{text(c.title)}</h2></div><div className={styles.faqList}>{list(c.items).map((item, index) => <details key={`${section.id}-faq-${index}`}><summary>{text(item.question) ?? text(item.title)}</summary><p>{text(item.answer) ?? text(item.description)}</p></details>)}</div></div></section>
}

function Contact({ section }: { section: PublicPortalSection }) {
  const c = section.content
  return (
    <section id={anchor(section)} className={styles.contactSection}>
      <div className={styles.contactCopy}><Eyebrow>{text(c.eyebrow)}</Eyebrow><h2>{text(c.title)}</h2>{text(c.description) ? <p>{text(c.description)}</p> : null}</div>
      <form action={submitPortalInquiry} className={styles.contactForm}>
        <input name="name" required maxLength={200} placeholder={text(c.name_label) ?? 'Nama'} />
        <input name="email" type="email" required maxLength={320} placeholder={text(c.email_label) ?? 'Email'} />
        <input name="phone" maxLength={50} placeholder={text(c.phone_label) ?? 'Nomor telepon'} />
        <input name="organization" maxLength={200} placeholder={text(c.organization_label) ?? 'Perusahaan / organisasi'} />
        <textarea name="message" required maxLength={5000} rows={4} placeholder={text(c.message_label) ?? 'Pesan'} />
        <button type="submit">{text(c.submit_label) ?? 'Kirim permintaan'}<span aria-hidden="true">→</span></button>
      </form>
    </section>
  )
}

function Generic({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const items = list(c.items).length ? list(c.items) : list(c.pillars)
  if (!text(c.title) && !text(c.description) && items.length === 0) return null
  return <section id={anchor(section)} className={styles.section}><div className={styles.sideBySide}><div className={styles.leftColumn}><Eyebrow>{text(c.eyebrow)}</Eyebrow><h2>{text(c.title)}</h2>{text(c.description) ? <p>{text(c.description)}</p> : null}</div>{items.length ? <div className={styles.serviceCards}>{items.slice(0, 6).map((item, index) => <article key={`${section.id}-generic-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><h3>{text(item.title)}</h3><p>{text(item.description)}</p></article>)}</div> : null}</div></section>
}

function RenderSection({ section }: { section: PublicPortalSection }) {
  switch (section.section_kind) {
    case 'hero_3d': return <Hero section={section} />
    case 'intro': return <Intro section={section} />
    case 'financial_highlights':
    case 'stat_grid': return <Stats section={section} />
    case 'investment_info': return <Offering section={section} />
    case 'business_overview': return <Business section={section} />
    case 'ecosystem': return <Ecosystem section={section} />
    case 'growth_story':
    case 'milestones': return <Growth section={section} />
    case 'logo_wall': return <LogoWall section={section} />
    case 'investor_updates': return <Updates section={section} />
    case 'documents': return <Documents section={section} />
    case 'faq': return <Faq section={section} />
    case 'contact_cta': return <Contact section={section} />
    case 'vision_mission':
    case 'strategic_direction':
    case 'legal_notice':
    case 'rich_content': return <Generic section={section} />
    default: return <Generic section={section} />
  }
}

export function PublicPortalReferenceV2({ page, sections, navigation, brandLogoUrl }: Props) {
  const header = navigation.filter((item) => item.location === 'header' && !item.parent_id).sort((a, b) => a.position - b.position)
  const footer = navigation.filter((item) => item.location === 'footer' && !item.parent_id).sort((a, b) => a.position - b.position)
  const legal = navigation.filter((item) => item.location === 'legal' && !item.parent_id).sort((a, b) => a.position - b.position)
  const social = navigation.filter((item) => item.location === 'social' && !item.parent_id).sort((a, b) => a.position - b.position)
  const cta = header.find((item) => /minat|daftar|invest/i.test(item.label) || item.href === '/hubungi') ?? header.at(-1)
  const headerLinks = cta ? header.filter((item) => item.id !== cta.id) : header
  const logoSrc = brandLogoUrl || '/brand/nuzultrip-logo-portal.svg'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label={page.title}><Image src={logoSrc} alt={page.title} width={156} height={48} priority /></Link>
          <nav className={styles.nav} aria-label="Navigasi utama">{headerLinks.map((item) => <Link key={item.id} href={item.href} target={item.target === '_blank' ? '_blank' : undefined}>{item.label}</Link>)}</nav>
          {cta ? <Link href={cta.href} className={styles.headerCta}>{cta.label}<span aria-hidden="true">→</span></Link> : null}
        </div>
      </header>
      <main id="main">{sections.map((section) => <RenderSection key={section.id} section={section} />)}</main>
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}><Image src={logoSrc} alt={page.title} width={160} height={50} /><p>{page.title}</p><div className={styles.social}>{social.map((item) => <Link key={item.id} href={item.href} aria-label={item.label}>{item.label}</Link>)}</div></div>
          <nav aria-label="Navigasi footer">{footer.map((item) => <Link key={item.id} href={item.href}>{item.label}</Link>)}</nav>
          <div className={styles.footerLegal}>{legal.map((item) => <Link key={item.id} href={item.href}>{item.label}</Link>)}</div>
        </div>
        <div className={styles.footerBottom}><span>© {new Date().getFullYear()} {page.title}.</span><span>Investor Relations Portal</span></div>
      </footer>
    </div>
  )
}
