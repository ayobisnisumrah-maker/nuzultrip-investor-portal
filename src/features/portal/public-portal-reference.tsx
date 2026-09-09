import type { ComponentProps } from 'react'

import { PublicPortalReferenceV2 } from '@/features/portal/public-portal-reference-v2'
import type { PublicPortalDocument } from '@/server/portal/public-queries'

type PublicPortalProps = ComponentProps<typeof PublicPortalReferenceV2>

type PublicPortalReferenceProps = PublicPortalProps & {
  publicDocuments: PublicPortalDocument[]
}

export function PublicPortalReference({
  publicDocuments,
  sections,
  ...props
}: PublicPortalReferenceProps) {
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

  return <PublicPortalReferenceV2 {...props} sections={resolvedSections} />
}
