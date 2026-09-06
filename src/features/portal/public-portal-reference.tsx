import type { ComponentProps } from 'react'

import { PublicPortalModel } from '@/features/portal/public-portal-model'

import styles from './public-portal-consistency.module.css'

type PublicPortalProps = ComponentProps<typeof PublicPortalModel>

export function PublicPortalReference(props: PublicPortalProps) {
  return (
    <div className={styles.root}>
      <PublicPortalModel {...props} />
    </div>
  )
}
