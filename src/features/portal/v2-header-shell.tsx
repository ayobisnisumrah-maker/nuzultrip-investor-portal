'use client'

import { useEffect, useState, type ReactNode } from 'react'

import styles from './public-portal-exact.module.css'

export function V2HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`${styles.header} ${scrolled ? styles.headerScrolled : styles.headerTop}`}>
      {children}
    </header>
  )
}
