import type { ComponentProps } from 'react'

import { PublicPortalModel } from '@/features/portal/public-portal-model'
import type { PublicPortalDocument } from '@/server/portal/public-queries'

type PublicPortalProps = ComponentProps<typeof PublicPortalModel>

type PublicPortalReferenceProps = PublicPortalProps & {
  publicDocuments: PublicPortalDocument[]
}

// Portal publik hanya memiliki satu stylesheet: public-portal-model.module.css.
// Jangan menambah lapisan penimpa; perbaiki gaya langsung di stylesheet utama tersebut.
export function PublicPortalReference({
  publicDocuments,
  sections,
  ...props
}: PublicPortalReferenceProps) {
  // Published CMS document items are legitimate public copy and must remain
  // visible even when there is not yet a downloadable public file. When real
  // public documents exist, they become the linked cards. This avoids an empty
  // "Dokumen Investor" section while still preventing restricted files from
  // leaking into the public portal.
  const resolvedSections = sections.map((section) => {
    if (section.section_kind !== 'documents' || publicDocuments.length === 0) {
      return section
    }

    return {
      ...section,
      content: {
        ...section.content,
        items: publicDocuments.map((document) => ({
          title: document.title,
          href: document.href,
        })),
      },
    }
  })

  return <PublicPortalModel {...props} sections={resolvedSections} />
}
