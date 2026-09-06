import Image from 'next/image'
import Link from 'next/link'

import { submitPortalInquiry } from '@/server/portal/inquiry-actions'
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

function SectionHeader({
  eyebrow,
  title,
  description,
  center = false,
}: {
  eyebrow?: string | null
  title?: string | null
  description?: string | null
  center?: boolean
}) {
  if (!eyebrow && !title && !description) return null
  return (
    <div className={`${styles.sectionHead} ${center ? styles.center : ''}`}>
      {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
      {title ? <h2>{title}</h2> : null}
      {description ? <p className={styles.lede}>{description}</p> : null}
    </div>
  )
}

function Hero({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const heroHighlights = list(c.highlights)
  const heroFloatCards = list(c.float_cards)
  const heroTitle = text(c.title)
  const heroTitleLines = heroTitle
    ? heroTitle
        .split('|')
        .map((line) => line.trim())
        .filter(Boolean)
    : []
  const heroTags = Array.isArray(c.tags)
    ? c.tags.filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
    : []
  const primaryLabel = text(c.primary_cta_label)
  const primaryHref = text(c.primary_cta_href)
  const secondaryLabel = text(c.secondary_cta_label)
  const secondaryHref = text(c.secondary_cta_href)
  const footnote = text(c.footnote)

  return (
    <>
      <section id={section.anchor_id ?? section.id} className={styles.hero}>
        <div className={styles.blob} aria-hidden="true" />
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            {text(c.eyebrow) ? <span className={styles.eyebrow}>{text(c.eyebrow)}</span> : null}
            {heroTitleLines.length ? (
              <h1 className={styles.headline}>
                {heroTitleLines.map((line) => (
                  <span key={line} style={{ display: 'block' }}>
                    {line}
                  </span>
                ))}
              </h1>
            ) : null}
            {text(c.description) ? <p className={styles.lede}>{text(c.description)}</p> : null}

            {heroTags.length ? (
              <div className={styles.heroTags} aria-label="Layanan utama">
                {heroTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            ) : null}

            {primaryLabel && primaryHref || secondaryLabel && secondaryHref ? (
              <div className={styles.heroActions}>
                {primaryLabel && primaryHref ? (
                  <Link className={styles.btnPrimary} href={primaryHref}>
                    {primaryLabel}
                  </Link>
                ) : null}
                {secondaryLabel && secondaryHref ? (
                  <Link className={styles.btnOutline} href={secondaryHref}>
                    {secondaryLabel}
                  </Link>
                ) : null}
              </div>
            ) : null}

            {footnote ? (
              <p
                className={styles.heroFoot}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ flex: '0 0 auto' }}
                >
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
                <span>{footnote}</span>
              </p>
            ) : null}
          </div>

          <div className={styles.heroArt} aria-hidden="true">
            <svg className={styles.scene} viewBox="0 0 560 470">
              <defs>
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#1B2C6B" />
                  <stop offset="1" stopColor="#0E9C9C" />
                </linearGradient>
                <linearGradient id="dome" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FDFBF6" />
                  <stop offset="1" stopColor="#E8DFC9" />
                </linearGradient>
              </defs>
              <circle cx="300" cy="224" r="184" fill="url(#sky)" />
              <path d="M232 248c0-44 30-70 68-92 38 22 68 48 68 92z" fill="url(#dome)" />
              <rect x="222" y="248" width="156" height="80" rx="10" fill="#FDFBF6" />
              <rect x="196" y="194" width="20" height="134" rx="7" fill="url(#dome)" />
              <rect x="384" y="194" width="20" height="134" rx="7" fill="url(#dome)" />
              <path d="M206 166c9 10 13 17 13 23a13 13 0 01-26 0c0-6 4-13 13-23z" fill="#F2DFB6" />
              <path d="M394 166c9 10 13 17 13 23a13 13 0 01-26 0c0-6 4-13 13-23z" fill="#F2DFB6" />
              <g fill="#1B2C6B" opacity=".82">
                <path d="M248 328v-34a13 13 0 0126 0v34z" />
                <path d="M287 328v-42a13 13 0 0126 0v42z" />
                <path d="M326 328v-34a13 13 0 0126 0v34z" />
              </g>
              <path
                d="M68 177c70-58 164-58 226-16"
                fill="none"
                stroke="#25BDB6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="7 9"
              />
              <g transform="translate(145 342)">
                <rect width="94" height="68" rx="14" fill="#DF6951" />
                <rect x="25" width="12" height="68" fill="#fff" opacity=".32" />
                <rect x="58" width="12" height="68" fill="#fff" opacity=".32" />
                <circle cx="20" cy="76" r="7" fill="#1B2C6B" />
                <circle cx="74" cy="76" r="7" fill="#1B2C6B" />
              </g>
              <g transform="translate(390 348)">
                <rect width="72" height="54" rx="9" fill="#25BDB6" />
                <path
                  d="M15 17h42M15 28h30M15 39h36"
                  stroke="#fff"
                  strokeWidth="5"
                  strokeLinecap="round"
                  opacity=".8"
                />
              </g>
              <path d="M412 104a22 22 0 100 44 27 27 0 110-44z" fill="#FFD98A" />
            </svg>
            {heroFloatCards[0] ? (
              <div className={`${styles.floatCard} ${styles.floatOne}`}>
                <b>{text(heroFloatCards[0].title)}</b>
                <span>{text(heroFloatCards[0].description)}</span>
              </div>
            ) : null}
            {heroFloatCards[1] ? (
              <div className={`${styles.floatCard} ${styles.floatTwo}`}>
                <b>{text(heroFloatCards[1].title)}</b>
                <span>{text(heroFloatCards[1].description)}</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className={styles.pillars}>
        <div className={`${styles.wrap} ${styles.pillarGrid}`}>
          {heroHighlights.slice(0, 4).map((item, index) => (
            <div key={`hero-highlight-${index}`} className={styles.pillar}>
              <span className={styles.pillarIcon}>{['✓', '◫', '◎', '↗'][index] ?? '•'}</span>
              <div>
                <b>{text(item.title)}</b>
                <small>{text(item.description)}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function Offering({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const rows = list(c.terms).length ? list(c.terms) : list(c.use_of_funds)
  const steps = list(c.process_steps)
  const fundingLabel = text(c.funding_label)
  const fundingTarget = text(c.funding_target)
  const fundingCurrency = text(c.funding_currency)
  const notice = text(c.notice)
  const processCtaLabel = text(c.process_cta_label)
  const processCtaHref = text(c.process_cta_href)
  const riskNote = text(c.risk_note)

  return (
    <section id={section.anchor_id ?? section.id} className={`${styles.section} ${styles.tinted}`}>
      <div className={styles.wrap}>
        <SectionHeader
          eyebrow={text(c.eyebrow)}
          title={text(c.title)}
          description={text(c.description)}
        />
        {fundingTarget ? (
          <div className={styles.fundingTarget}>
            {fundingLabel ? <span>{fundingLabel}</span> : null}
            <strong>
              {fundingCurrency ? `${fundingCurrency} ` : ''}{fundingTarget}
            </strong>
          </div>
        ) : null}
        {notice ? <div className={styles.offerNotice}>{notice}</div> : null}
        <div className={styles.offerGrid}>
          {rows.length ? (
            <div className={styles.offerTable}>
              {rows.map((row, index) => (
                <div className={styles.offerRow} key={`${section.id}-term-${index}`}>
                  <span>{text(row.label) ?? text(row.title)}</span>
                  <strong>{text(row.value) ?? text(row.description)}</strong>
                </div>
              ))}
            </div>
          ) : null}
          {steps.length || text(c.process_title) ? (
            <aside className={styles.processCard}>
              {text(c.process_title) ? <h3>{text(c.process_title)}</h3> : null}
              <ol>
                {steps.slice(0, 4).map((item, index) => (
                  <li key={`${section.id}-process-${index}`}>
                    <span>{index + 1}</span>
                    <div>
                      <b>{text(item.title)}</b>
                      <p>{text(item.description)}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {processCtaLabel && processCtaHref ? (
                <Link href={processCtaHref} className={styles.btnPrimary}>
                  {processCtaLabel}
                </Link>
              ) : null}
            </aside>
          ) : null}
        </div>
        {riskNote ? <div className={styles.offerFoot}>{riskNote}</div> : null}
      </div>
    </section>
  )
}

function Intro({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const items = list(c.features)
  return (
    <section id={section.anchor_id ?? section.id} className={styles.section}>
      <div className={styles.wrap}>
        <SectionHeader
          eyebrow={text(c.eyebrow)}
          title={text(c.title)}
          description={text(c.description)}
          center
        />
        <div className={styles.featureGrid}>
          {items.slice(0, 4).map((item, index) => (
            <article key={`${section.id}-feature-${index}`}>
              <span>{['◉', '◇', '◫', '△'][index] ?? '•'}</span>
              <h3>{text(item.title)}</h3>
              <p>{text(item.description)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function VisionMission({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const mission = Array.isArray(c.mission)
    ? c.mission.filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
    : []
  return (
    <section
      id={section.anchor_id ?? section.id}
      className={`${styles.sectionCompact} ${styles.aboutContinuation}`}
    >
      <div className={styles.wrap}>
        <SectionHeader eyebrow={text(c.eyebrow)} title={text(c.title)} />
      </div>
      <div className={`${styles.wrap} ${styles.vm}`}>
        <blockquote className={styles.quoteBox}>
          {text(c.vision_label) ? <span>{text(c.vision_label)}</span> : null}
          <p>{text(c.vision)}</p>
        </blockquote>
        <div className={styles.missionBox}>
          {text(c.mission_label) ? <span className={styles.eyebrow}>{text(c.mission_label)}</span> : null}
          <ul>
            {mission.map((item, index) => (
              <li key={`${section.id}-m-${index}`}>
                <span>✓</span>
                <p>{item}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function Revenue({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const items = list(c.items)
  return (
    <section id={section.anchor_id ?? section.id} className={`${styles.section} ${styles.tinted}`}>
      <div className={styles.wrap}>
        <SectionHeader eyebrow={text(c.eyebrow)} title={text(c.title)} description={text(c.description)} />
        <div className={styles.revenueGrid}>
          {items.slice(0, 4).map((item, index) => (
            <article key={`${section.id}-revenue-${index}`}>
              <span
                className={`${styles.revenueIcon} ${styles[`ri${index + 1}` as keyof typeof styles] ?? ''}`}
              >
                {['▣', '▤', '◈', '▦'][index]}
              </span>
              <div>
                <h3>{text(item.title)}</h3>
                <p>{text(item.description)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Ecosystem({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const items = list(c.items)
  const itemCaption = text(c.item_caption)
  return (
    <section id={section.anchor_id ?? section.id} className={styles.section}>
      <div className={styles.wrap}>
        <SectionHeader
          eyebrow={text(c.eyebrow)}
          title={text(c.title)}
          description={text(c.description)}
          center
        />
        <div className={styles.ecosystemGrid}>
          {items.slice(0, 6).map((item, index) => (
            <article
              key={`${section.id}-eco-${index}`}
              className={`${styles.ecoCard} ${styles[`tone${index + 1}` as keyof typeof styles] ?? ''}`}
            >
              <span className={styles.ecoIcon}>{['♙', '▤', '◎', '⌘', '▣', '✧'][index]}</span>
              <h3>{text(item.title)}</h3>
              <p>{text(item.description)}</p>
              {text(item.caption) || itemCaption ? <small>{text(item.caption) ?? itemCaption}</small> : null}
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
    <section id={section.anchor_id ?? section.id} className={`${styles.section} ${styles.tinted}`}>
      <div className={`${styles.wrap} ${styles.growthGrid}`}>
        <div>
          <SectionHeader eyebrow={text(c.eyebrow)} title={text(c.title)} description={text(c.description)} />
          <div className={styles.growthSteps}>
            {milestones.slice(0, 4).map((item, index) => (
              <div className={styles.growthStep} key={`${section.id}-growth-${index}`}>
                <span
                  className={`${styles.growthIcon} ${styles[`gi${index + 1}` as keyof typeof styles] ?? ''}`}
                >
                  {index + 1}
                </span>
                <div>
                  <b>{text(item.title)}</b>
                  <p>{text(item.description)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {text(c.progress_title) || text(c.progress_label) ? (
          <div className={styles.progressMock}>
            {text(c.progress_title) ? <div className={styles.progressTop}>{text(c.progress_title)}</div> : null}
            <div className={styles.progressBody}>
              {text(c.progress_label) ? <small>{text(c.progress_label)}</small> : null}
              {milestones.slice(0, 4).map((item, index) => {
                const raw = Number(item.progress_percent)
                const width = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 0
                return (
                  <div className={styles.progressRow} key={`${section.id}-progress-${index}`}>
                    <div>
                      <b>{text(item.title)}</b>
                      <span>{width}%</span>
                    </div>
                    <i>
                      <em style={{ width: `${width}%` }} />
                    </i>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function UseFunds({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const items = list(c.pillars).length ? list(c.pillars) : list(c.items)
  const priorityLabel = text(c.priority_label)
  return (
    <section id={section.anchor_id ?? section.id} className={styles.section}>
      <div className={styles.wrap}>
        <SectionHeader eyebrow={text(c.eyebrow)} title={text(c.title)} description={text(c.description)} />
        <div className={styles.fundsGrid}>
          {items.slice(0, 4).map((item, index) => (
            <article key={`${section.id}-fund-${index}`}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                {priorityLabel ? <small>{priorityLabel} {index + 1}</small> : null}
                <h3>{text(item.title)}</h3>
                <p>{text(item.description)}</p>
              </div>
            </article>
          ))}
        </div>
        {text(c.note) ? <div className={styles.softNote}>{text(c.note)}</div> : null}
      </div>
    </section>
  )
}

function Governance({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const items = list(c.items).length ? list(c.items) : list(c.pillars)
  return (
    <section id={section.anchor_id ?? section.id} className={`${styles.section} ${styles.tinted}`}>
      <div className={styles.wrap}>
        <SectionHeader
          eyebrow={text(c.eyebrow)}
          title={text(c.title)}
          description={text(c.description)}
          center
        />
        <div className={styles.govGrid}>
          {items.slice(0, 3).map((item, index) => (
            <article key={`${section.id}-gov-${index}`}>
              <span>{['▤', '◫', '◎'][index]}</span>
              <h3>{text(item.title)}</h3>
              <p>{text(item.description)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Risks({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const items = list(c.items).length ? list(c.items) : list(c.pillars)
  const body = text(c.description) ?? text(c.content)
  return (
    <section id={section.anchor_id ?? section.id} className={styles.section}>
      <div className={styles.wrap}>
        <SectionHeader eyebrow={text(c.eyebrow)} title={text(c.title)} description={body} />
        <div className={styles.riskGrid}>
          {items.slice(0, 6).map((item, index) => (
            <article key={`${section.id}-risk-${index}`}>
              <span>!</span>
              <div>
                <h3>{text(item.title)}</h3>
                <p>{text(item.description)}</p>
              </div>
            </article>
          ))}
        </div>
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
        <SectionHeader eyebrow={text(c.eyebrow)} title={text(c.title)} description={text(c.description)} />
        <div className={styles.docsGrid}>
          {items.slice(0, 6).map((item, index) => {
            const href = text(item.href) ?? text(item.url)
            const node = (
              <>
                <span>{['✓', '⌁', '▤', '◇', '▣', '◫'][index]}</span>
                <b>{text(item.title) ?? text(item.label)}</b>
              </>
            )
            return href ? (
              <Link key={`${section.id}-doc-${index}`} href={href}>
                {node}
              </Link>
            ) : (
              <div key={`${section.id}-doc-${index}`}>{node}</div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Contact({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const accountNote = text(c.account_note)
  const nameLabel = text(c.name_label) ?? 'Nama'
  const emailLabel = text(c.email_label) ?? 'Email'
  const phoneLabel = text(c.phone_label) ?? 'Nomor telepon'
  const organizationLabel = text(c.organization_label) ?? 'Perusahaan / organisasi'
  const messageLabel = text(c.message_label) ?? 'Pesan'
  const submitLabel = text(c.submit_label) ?? 'Kirim permintaan'

  return (
    <section id={section.anchor_id ?? section.id} className={styles.contactSection}>
      <div className={`${styles.wrap} ${styles.contactPanel}`}>
        <div className={styles.contactCopy}>
          {text(c.eyebrow) ? <span className={styles.eyebrow}>{text(c.eyebrow)}</span> : null}
          {text(c.title) ? <h2>{text(c.title)}</h2> : null}
          {text(c.description) ? <p>{text(c.description)}</p> : null}
          {text(c.primary_cta_label) && text(c.primary_cta_href) ? (
            <Link className={styles.btnPrimary} href={text(c.primary_cta_href) as string}>
              {text(c.primary_cta_label)}
            </Link>
          ) : null}
          {accountNote ? <small>{accountNote}</small> : null}
        </div>
        <form action={submitPortalInquiry} className={styles.contactForm}>
          <label>
            {nameLabel}
            <input name="name" required maxLength={200} />
          </label>
          <label>
            {emailLabel}
            <input name="email" type="email" required maxLength={320} />
          </label>
          <label>
            {phoneLabel}
            <input name="phone" maxLength={50} />
          </label>
          <label>
            {organizationLabel}
            <input name="organization" maxLength={200} />
          </label>
          <label>
            {messageLabel}
            <textarea name="message" required maxLength={5000} rows={4} />
          </label>
          <button type="submit">{submitLabel}</button>
        </form>
      </div>
    </section>
  )
}

function Generic({ section }: { section: PublicPortalSection }) {
  const c = section.content
  const title = text(c.title)
  const description = text(c.description)
  const items = list(c.items)
  if (!title && !description && items.length === 0) return null
  return (
    <section id={section.anchor_id ?? section.id} className={styles.section}>
      <div className={styles.wrap}>
        <SectionHeader eyebrow={text(c.eyebrow)} title={title} description={description} />
        {items.length ? (
          <div className={styles.govGrid}>
            {items.map((item, index) => (
              <article key={`${section.id}-${index}`}>
                <span>{index + 1}</span>
                <h3>{text(item.title)}</h3>
                <p>{text(item.description)}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function RenderSection({ section }: { section: PublicPortalSection }) {
  switch (section.section_kind) {
    case 'hero_3d':
      return <Hero section={section} />
    case 'investment_info':
      return <Offering section={section} />
    case 'intro':
      return <Intro section={section} />
    case 'vision_mission':
      return <VisionMission section={section} />
    case 'business_overview':
      return <Revenue section={section} />
    case 'ecosystem':
      return <Ecosystem section={section} />
    case 'growth_story':
      return <Growth section={section} />
    case 'strategic_direction':
      return <UseFunds section={section} />
    case 'investor_updates':
      return <Governance section={section} />
    case 'legal_notice':
      return <Risks section={section} />
    case 'documents':
      return <Documents section={section} />
    case 'contact_cta':
      return <Contact section={section} />
    case 'milestones':
    case 'financial_highlights':
    case 'rich_content':
    case 'stat_grid':
    case 'logo_wall':
    case 'faq':
      return null
    default:
      return <Generic section={section} />
  }
}

export function PublicPortalModel({
  page,
  sections,
  navigation,
}: {
  page: { title: string; seo: unknown }
  sections: PublicPortalSection[]
  navigation: NavItem[]
}) {
  const header = navigation
    .filter((item) => item.location === 'header' && !item.parent_id)
    .sort((a, b) => a.position - b.position)
  const footer = navigation
    .filter((item) => item.location === 'footer' && !item.parent_id)
    .sort((a, b) => a.position - b.position)
  const social = navigation
    .filter((item) => item.location === 'social' && !item.parent_id)
    .sort((a, b) => a.position - b.position)

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={`${styles.wrap} ${styles.navIn}`}>
          <Link className={styles.brand} href="/" aria-label="Nuzultrip">
            <Image
              src="/brand/nuzultrip-logo-portal.svg"
              alt="Nuzultrip"
              width={162}
              height={50}
              priority
              style={{ width: '128px', height: 'auto' }}
            />
          </Link>
          <nav className={styles.navLinks} aria-label="Navigasi utama">
            {header.map((item) => (
              <Link key={item.id} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Link className={styles.navCta} href="/masuk">
            Masuk
          </Link>
        </div>
      </header>

      <main>
        {sections.map((section) => (
          <RenderSection key={section.id} section={section} />
        ))}
      </main>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.footerGrid}>
            <div>
              <Image
                src="/brand/nuzultrip-logo-portal.svg"
                alt="Nuzultrip"
                width={162}
                height={50}
                style={{ width: '138px', height: 'auto' }}
              />
              <p>
                Hubungan Equity Nuzultrip — informasi perusahaan, perkembangan, dan dokumen dalam
                satu portal.
              </p>
            </div>
            <div>
              <h4>Perusahaan</h4>
              {footer.slice(0, 4).map((item) => (
                <Link key={item.id} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
            <div>
              <h4>Informasi</h4>
              {footer.slice(4, 8).map((item) => (
                <Link key={item.id} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
            <div>
              <h4>Ikuti Nuzultrip</h4>
              {social.map((item) => (
                <Link key={item.id} href={item.href} target={item.target} rel={item.target === '_blank' ? 'noreferrer' : undefined}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className={styles.legal}>
            <span>
              © {new Date().getFullYear()} {page.title}
            </span>
            <span>Nuzultrip Equity Relations</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
