/**
 * Publication lifecycle shared by documents, company-profile versions, portal
 * sections and financial reports (docs/DATABASE.md §5).
 *
 * Mirrored by the Postgres `publication_status` enum.
 */

export const PUBLICATION_STATUSES = [
  'draft',
  'review',
  'approved',
  'published',
  'archived',
] as const

export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number]

export const PUBLICATION_TRANSITIONS: Readonly<
  Record<PublicationStatus, readonly PublicationStatus[]>
> = {
  draft: ['review'],
  review: ['approved', 'draft'],
  approved: ['published', 'draft'],
  published: ['archived'],
  // An archived item is restored by creating a new draft version, never by
  // mutating the published one.
  archived: [],
}

export function canPublicationTransition(
  from: PublicationStatus,
  to: PublicationStatus,
): boolean {
  return PUBLICATION_TRANSITIONS[from].includes(to)
}

/** The permission suffix a transition requires, keyed by target state. */
export const PUBLICATION_TRANSITION_ACTION: Readonly<
  Record<PublicationStatus, 'update' | 'review' | 'approve' | 'publish' | 'archive'>
> = {
  draft: 'update',
  review: 'review',
  approved: 'approve',
  published: 'publish',
  archived: 'archive',
}

export const PUBLICATION_STATUS_LABELS: Readonly<Record<PublicationStatus, string>> = {
  draft: 'Draf',
  review: 'Ditinjau',
  approved: 'Disetujui',
  published: 'Terbit',
  archived: 'Diarsipkan',
}

/* -------------------------------------------------------------------------- */

/** Who may see a document once it is published. */
export const VISIBILITIES = ['public', 'investors', 'restricted', 'internal'] as const
export type Visibility = (typeof VISIBILITIES)[number]

export const VISIBILITY_LABELS: Readonly<Record<Visibility, string>> = {
  public: 'Publik',
  investors: 'Semua investor',
  restricted: 'Investor terpilih',
  internal: 'Internal',
}

export const VISIBILITY_DESCRIPTIONS: Readonly<Record<Visibility, string>> = {
  public: 'Dapat diakses siapa pun melalui portal publik.',
  investors: 'Dapat diakses seluruh investor yang aktif atau disetujui.',
  restricted: 'Hanya investor yang diberi akses secara eksplisit.',
  internal: 'Hanya staf internal dengan izin terkait.',
}
