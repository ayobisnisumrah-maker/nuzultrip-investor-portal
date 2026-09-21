/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState } from 'react'
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

export function V2InvestorInfo({ cards, fallbackImage, interestHref = '/hubungi' }: { cards: InvestorCard[]; fallbackImage: string; interestHref?: string }) {
  const [active, setActive] = useState(0)
  const [detailIndex, setDetailIndex] = useState<number | null>(null)
  const safeCards = cards.slice(0, 6)
  const activeImage = safeCards[active]?.image || fallbackImage
  const detailCard = detailIndex === null ? null : safeCards[detailIndex]

  useEffect(() => {
    if (!detailCard) return
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailIndex(null)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [detailCard])

  const openDetails = (index: number) => {
    setActive(index)
    setDetailIndex(index)
  }

  return (
    <>
      <div className={styles.infoLayout}>
        <div className={styles.infoMedia}>
          {safeCards.map((item,index) => {
            const src=item.image || fallbackImage
            return src ? <img key={item.key} src={src} alt={item.imageAlt || item.title || 'Informasi Investor Nuzultrip'} className={index === active ? styles.infoMediaImageActive : styles.infoMediaImage} loading="lazy" /> : null
          })}
        </div>
        <div className={styles.infoGrid}>
          {safeCards.map((item, index) => {
            const body = (
              <article className={index === active ? styles.infoCardActive : undefined}>
                <div><h3>{item.title}</h3>{item.description ? <p>{item.description}</p> : null}</div>
                <span className={styles.infoMore}>Selengkapnya <span aria-hidden="true">→</span></span>
              </article>
            )
            if (item.href) {
              return <Link href={item.href} key={item.key} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)}>{body}</Link>
            }
            return (
              <button className={styles.infoCardButton} type="button" key={item.key} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => openDetails(index)}>
                {body}
              </button>
            )
          })}
        </div>
      </div>

      {detailCard ? (
        <div className={styles.infoModalBackdrop} role="presentation" onMouseDown={() => setDetailIndex(null)}>
          <section className={styles.infoModal} role="dialog" aria-modal="true" aria-labelledby="investor-detail-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className={styles.infoModalClose} type="button" aria-label="Tutup" onClick={() => setDetailIndex(null)}>×</button>
            <div className={styles.infoModalHeading}>
              <span>Informasi Resmi</span>
              <h3 id="investor-detail-title">{detailCard.title}</h3>
            </div>
            {detailCard.description ? <p className={styles.infoModalCopy}>{detailCard.description}</p> : null}
            {detailCard.details ? (
              <div className={styles.infoModalDetails}>
                <h4>Poin Kunci &amp; Ketentuan</h4>
                {detailCard.details.split(/\\r?\\n/).map((detail) => detail.trim()).filter(Boolean).map((detail) => <div key={detail}><span aria-hidden="true">✓</span><p>{detail}</p></div>)}
              </div>
            ) : null}
            <div className={styles.infoModalActions}>
              <button type="button" onClick={() => setDetailIndex(null)}>Tutup</button>
              <Link href={interestHref}>Ajukan Minat Equity →</Link>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
