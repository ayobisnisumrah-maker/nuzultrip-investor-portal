import type { ComponentProps } from 'react'

import { PublicPortalModel } from '@/features/portal/public-portal-model'
import type { PublicPortalDocument } from '@/server/portal/public-queries'

type PublicPortalProps = ComponentProps<typeof PublicPortalModel>

type PublicPortalReferenceProps = PublicPortalProps & {
  publicDocuments: PublicPortalDocument[]
}

const partnerLogoStyles = `
.nuzultrip-public-portal :is(
  img[alt='Agen Nuzultrip'],
  img[alt='Mitra Travel'],
  img[alt='Mitra Layanan'],
  img[alt='Land Arrangement'],
  img[alt='Mitra Strategis']
) {
  width: 100% !important;
  max-width: 190px !important;
  max-height: 76px !important;
  height: auto !important;
  object-fit: contain !important;
  transform: scale(1.28);
  transform-origin: center;
}

@media (max-width: 820px) {
  .nuzultrip-public-portal :is(
    img[alt='Agen Nuzultrip'],
    img[alt='Mitra Travel'],
    img[alt='Mitra Layanan'],
    img[alt='Land Arrangement'],
    img[alt='Mitra Strategis']
  ) {
    max-width: 175px !important;
    max-height: 70px !important;
    transform: scale(1.18);
  }
}

@media (max-width: 560px) {
  .nuzultrip-public-portal :is(
    img[alt='Agen Nuzultrip'],
    img[alt='Mitra Travel'],
    img[alt='Mitra Layanan'],
    img[alt='Land Arrangement'],
    img[alt='Mitra Strategis']
  ) {
    max-width: 165px !important;
    max-height: 66px !important;
    transform: scale(1.08);
  }
}
`

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

  return (
    <div className="nuzultrip-public-portal">
      <style>{partnerLogoStyles}</style>
      <PublicPortalModel {...props} sections={resolvedSections} />
    </div>
  )
}
