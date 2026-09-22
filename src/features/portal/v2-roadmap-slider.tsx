'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import styles from './public-portal-exact.module.css'

type RoadmapItem = {
  period: string
  title: string
  description: string
  status: string
  bullets: string[]
  metricLabel: string
  metricValue: string
}

function statusClass(status: string) {
  const value = status.toLocaleLowerCase('id-ID')
  if (value.includes('aktif')) return styles.roadmapStatusActive
  if (value.includes('rencana') || value.includes('mendatang')) return styles.roadmapStatusFuture
  return styles.roadmapStatusDone
}

export function V2RoadmapSlider({ items }: { items: RoadmapItem[] }) {
  const initial = Math.min(3, Math.max(items.length - 1, 0))
  const [active, setActive] = useState(initial)
  const trackRef = useRef<HTMLDivElement>(null)
  const safeItems = useMemo(() => items.slice(0, 5), [items])

  useEffect(() => {
    const track = trackRef.current
    if (!track || !safeItems.length) return
    const activeCard = track.querySelector<HTMLElement>(`[data-roadmap-index="${initial}"]`)
    const timer = window.setTimeout(() => {
      activeCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [initial, safeItems.length])

  function handleScroll() {
    const track = trackRef.current
    if (!track) return
    const scrollCenter = track.scrollLeft + track.clientWidth / 2
    let closest = 0
    let distance = Number.POSITIVE_INFINITY
    Array.from(track.children).forEach((child, index) => {
      const card = child as HTMLElement
      const candidate = Math.abs(card.offsetLeft + card.clientWidth / 2 - scrollCenter)
      if (candidate < distance) {
        distance = candidate
        closest = index
      }
    })
    if (closest !== active) setActive(closest)
  }

  function go(index: number) {
    if (!safeItems.length) return
    const next = Math.min(Math.max(index, 0), safeItems.length - 1)
    setActive(next)
    const card = trackRef.current?.querySelector<HTMLElement>(`[data-roadmap-index="${next}"]`)
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  return (
    <>
      <div className={styles.roadmapControls}>
        <span>FASE {String(active + 1).padStart(2, '0')} / {String(safeItems.length).padStart(2, '0')}</span>
        <button type="button" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Fase sebelumnya">‹</button>
        <button type="button" onClick={() => go(active + 1)} disabled={active === safeItems.length - 1} aria-label="Fase berikutnya">›</button>
      </div>

      <div className={styles.roadmapTabs}>
        {safeItems.map((item, index) => (
          <button key={index} type="button" onClick={() => go(index)} className={index === active ? styles.roadmapTabActive : ''}>
            <span>FASE {String(index + 1).padStart(2, '0')}</span>
            <strong>{item.period}</strong>
            {index < active ? <i>✓</i> : index === active ? <i>●</i> : null}
          </button>
        ))}
      </div>

      <div className={styles.roadmapTrackExact} ref={trackRef} onScroll={handleScroll}>
        {safeItems.map((item, index) => (
          <article
            key={index}
            data-roadmap-index={index}
            className={index === active ? styles.roadmapCardActive : ''}
            onClick={() => go(index)}
          >
            <div className={styles.roadmapCardTop}>
              <b>FASE {String(index + 1).padStart(2, '0')}</b>
              {item.status ? <span className={statusClass(item.status)}>{item.status}</span> : null}
            </div>
            {item.period ? <small>{item.period}</small> : null}
            <h3>{item.title}</h3>
            {item.description ? <p>{item.description}</p> : null}
            {item.bullets.length ? (
              <ul>{item.bullets.slice(0, 4).map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
            ) : null}
            {(item.metricLabel || item.metricValue) ? (
              <div className={styles.roadmapMetric}>
                <span>{item.metricLabel}</span>
                <strong>{item.metricValue}</strong>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </>
  )
}
