import type { ComponentProps } from 'react'

import { PublicPortalModel } from '@/features/portal/public-portal-model'

type PublicPortalProps = ComponentProps<typeof PublicPortalModel>

export function PublicPortalReference(props: PublicPortalProps) {
  return <PublicPortalModel {...props} />
}
