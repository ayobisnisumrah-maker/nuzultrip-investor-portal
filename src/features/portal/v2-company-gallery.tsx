'use client'

import { useEffect, useRef, useState } from 'react'

import styles from './public-portal-exact.module.css'

type GalleryImage = {
  src: string
  alt: string
}

type GalleryMetric = {
  value: string
  label: string
}

export function V2CompanyGallery({
  images,
  metrics,
}: {
  images: GalleryImage[]
  metrics: GalleryMetric[]
}) {
  const safeImages = images.filter((image) => Boolean(image.src)).slice(0, 5)
  const safeMetrics = metrics.slice(0, 5)
  const [activeIndex, setActiveIndex] = useState(0)
  const mediaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (safeImages.length < 2 || !window.matchMedia('(hover: none)').matches) return
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeImages.length)
    }, 3200)
    return () => window.clearInterval(interval)
  }, [safeImages.length])

  const selectFromPointer = (clientX: number) => {
    const media = mediaRef.current
    if (!media || safeImages.length < 2) return
    const rect = media.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(0.9999, (clientX - rect.left) / rect.width))
    setActiveIndex(Math.floor(ratio * safeImages.length))
  }

  return (
    <>
      <div
        ref={mediaRef}
        className={styles.companyMedia}
        onMouseMove={(event) => selectFromPointer(event.clientX)}
      >
        {safeImages.map((image, index) => (
          // Published CMS media can be hosted by an approved HTTPS origin.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={image.src + index}
            src={image.src}
            alt={image.alt}
            className={index === activeIndex ? styles.companyGalleryImageActive : styles.companyGalleryImage}
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        ))}
        {safeImages.length > 1 ? (
          <div className={styles.mediaIndicators} aria-hidden="true">
            {safeImages.map((image, index) => (
              <span key={image.src + index} className={index === activeIndex ? styles.mediaIndicatorActive : undefined} />
            ))}
          </div>
        ) : null}
      </div>
      <div className={styles.companyMetrics}>
        {safeMetrics.map((metric, index) => (
          <article
            key={metric.label + index}
            className={index === activeIndex ? styles.companyMetricActive : undefined}
            onMouseEnter={() => safeImages[index] && setActiveIndex(index)}
            onClick={() => safeImages[index] && setActiveIndex(index)}
          >
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </div>
    </>
  )
}
