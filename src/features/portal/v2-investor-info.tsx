'use client'

import { useState } from 'react'
import Link from 'next/link'

import styles from './public-portal-exact.module.css'

type InvestorCard = {
  key: string
  title: string
  description: string
  image: string
  imageAlt: string
  details: string
  href: string | null
}

export function V2InvestorInfo({ cards, fallbackImage }: { cards: InvestorCard[]; fallbackImage: string }) {
  const [active, setActive] = useState(0)
  const safeCards = cards.slice(0, 6)
  const activeImage = safeCards[active]?.image || fallbackImage

  return (
    <div className={styles.infoLayout}>
      <div className={styles.infoMedia}>
        {activeImage ? {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={activeImage} alt={safeCards[active]?.imageAlt || safeCards[active]?.title || 'Informasi Investor Nuzultrip'} /> : null}
      </div>
      <div className={styles.infoGrid}>
        {safeCards.map((item, index) => {
          const body = (
            <article className={index === active ? styles.infoCardActive : undefined}>
              <div><h3>{item.title}</h3>{item.description ? <p>{item.description}</p> : null}{item.details ? <ul>{item.details.split(/\r?\n/).map((detail) => detail.trim()).filter(Boolean).slice(0, 4).map((detail) => <li key={detail}>{detail}</li>)}</ul> : null}</div>
              <span className={styles.infoMore}>Selengkapnya <span aria-hidden="true">→</span></span>
            </article>
          )
          return item.href
            ? <Link href={item.href} key={item.key} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)}>{body}</Link>
            : <div key={item.key} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} tabIndex={0}>{body}</div>
        })}
      </div>
    </div>
  )
}
