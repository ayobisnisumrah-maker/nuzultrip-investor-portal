import type { ComponentProps } from 'react'

import { PublicPortalModel } from '@/features/portal/public-portal-model'

type PublicPortalProps = ComponentProps<typeof PublicPortalModel>

// Portal publik hanya memiliki satu stylesheet: public-portal-model.module.css.
// Jangan menambah lapisan penimpa; perbaiki gaya langsung di stylesheet utama tersebut.
export function PublicPortalReference(props: PublicPortalProps) {
  return <PublicPortalModel {...props} />
}
