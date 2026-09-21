/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import styles from './public-portal-exact.module.css'

type MobileNavItem = { id: string; label: string; href: string }

export function V2MobileHeader({ items, logoSrc }: { items: MobileNavItem[]; logoSrc: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return <>
    <button type="button" className={styles.mobileMenuButton} aria-label={open ? 'Tutup menu' : 'Buka menu'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span /><span />
    </button>
    {open ? <div className={styles.mobileMenuOverlay}>
      <div className={styles.mobileMenuTop}>
        <Link href="/" onClick={() => setOpen(false)}><img src={logoSrc} alt="Nuzultrip" /></Link>
        <button type="button" aria-label="Tutup menu" onClick={() => setOpen(false)}>×</button>
      </div>
      <nav aria-label="Navigasi mobile">
        {items.slice(0,7).map((item) => <Link key={item.id} href={item.href} onClick={() => setOpen(false)}>{item.label}<span>↗</span></Link>)}
      </nav>
      <div className={styles.mobileMenuActions}>
        <Link href="/hubungi" onClick={() => setOpen(false)}>Ajukan Minat Equity <span>→</span></Link>
        <Link href="/masuk" onClick={() => setOpen(false)}>Masuk Portal Investor <span>→</span></Link>
      </div>
    </div> : null}
  </>
}
