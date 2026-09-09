import Link from 'next/link'

import type { PublicPortalModel } from '@/features/portal/public-portal-model'

import styles from './public-portal-exact.module.css'

type NavItem = React.ComponentProps<typeof PublicPortalModel>['navigation'][number]

function usableHref(value: unknown): string | null {
  const href = typeof value === 'string' ? value.trim() : ''
  return href && href !== '#' ? href : null
}

export function PublicPortalHeaderOverride({
  navigation,
  logoSrc,
}: {
  navigation: NavItem[]
  logoSrc: string
}) {
  const header = navigation
    .filter((item) => item.location === 'header' && !item.parent_id && usableHref(item.href))
    .sort((a, b) => a.position - b.position)

  return (
    <header className={styles.header}>
      <div className={styles.shell}>
        <Link href="/" className={styles.logoLink} aria-label="Nuzultrip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Nuzultrip" className={styles.logo} />
        </Link>

        <nav className={styles.nav} aria-label="Navigasi utama">
          {header.slice(0, 6).map((item) => (
            <Link key={item.id} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <Link href="/masuk" className={styles.headerCta}>
            Masuk
          </Link>
        </div>
      </div>
    </header>
  )
}
