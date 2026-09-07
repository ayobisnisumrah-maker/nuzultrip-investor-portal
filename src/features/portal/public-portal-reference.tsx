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
  // Compatibility adapter for the current renderer. The source of document
  // cards is exclusively the published-document query; CMS `content.items`
  // and manually entered document URLs are discarded here.
  const resolvedSections = sections.map((section) =>
    section.section_kind === 'documents'
      ? {
          ...section,
          content: {
            ...section.content,
            items: publicDocuments.map((document) => ({
              title: document.title,
              href: document.href,
            })),
          },
        }
      : section,
  )

  return <PublicPortalModel {...props} sections={resolvedSections} />
}
