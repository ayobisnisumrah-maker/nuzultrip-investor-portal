import type { ComponentProps } from 'react'

import { PublicPortal } from '@/features/portal/public-portal'

import compatStyles from './public-portal-reference-theme-compat.module.css'
import styles from './public-portal-reference-theme.module.css'

type PublicPortalProps = ComponentProps<typeof PublicPortal>

export function PublicPortalReference(props: PublicPortalProps) {
  return (
    <div className={`${styles.theme} ${compatStyles.theme}`}>
      <PublicPortal {...props} />
    </div>
  )
}
