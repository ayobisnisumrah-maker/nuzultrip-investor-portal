/**
 * Investor lifecycle (docs/DATABASE.md §4).
 *
 * This module is the single source of truth for the lifecycle in TypeScript.
 * The Postgres `investor_status` enum and the transition trigger mirror it, and
 * a test asserts the two match — a transition that is legal here but illegal in
 * the database (or the reverse) is a bug that would only surface in production.
 */

export const INVESTOR_STATUSES = [
  'prospective',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'active',
  'inactive',
] as const

export type InvestorStatus = (typeof INVESTOR_STATUSES)[number]

/** Legal transitions. Anything absent here is rejected by the database. */
export const INVESTOR_TRANSITIONS: Readonly<Record<InvestorStatus, readonly InvestorStatus[]>> = {
  prospective: ['submitted'],
  submitted: ['under_review', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['active', 'rejected'],
  active: ['inactive'],
  inactive: ['active'],
  // Rejection is terminal. Rejected candidate data is retained only for the
  // configured 72-hour safety window, then purged so the person can apply again.
  rejected: [],
}

export function canTransition(from: InvestorStatus, to: InvestorStatus): boolean {
  return INVESTOR_TRANSITIONS[from].includes(to)
}

/**
 * Statuses that grant access to investor data. Deliberately narrow: an investor
 * who has been deactivated can still sign in, but sees an explanatory state and
 * no data.
 */
const ACCESS_GRANTING: ReadonlySet<InvestorStatus> = new Set<InvestorStatus>(['approved', 'active'])

export function grantsDataAccess(status: InvestorStatus): boolean {
  return ACCESS_GRANTING.has(status)
}

/** Terminal for the application workflow — no further review action pending. */
export function isTerminal(status: InvestorStatus): boolean {
  return status === 'active' || status === 'inactive' || status === 'rejected'
}

export const INVESTOR_STATUS_LABELS: Readonly<Record<InvestorStatus, string>> = {
  prospective: 'Calon investor',
  submitted: 'Diajukan',
  under_review: 'Sedang ditinjau',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  active: 'Aktif',
  inactive: 'Nonaktif',
}

export const INVESTOR_STATUS_DESCRIPTIONS: Readonly<Record<InvestorStatus, string>> = {
  prospective: 'Akun dibuat, pengajuan belum dikirim.',
  submitted: 'Pengajuan telah dikirim dan menunggu antrean peninjauan.',
  under_review: 'Tim hubungan investor sedang meninjau pengajuan ini.',
  approved: 'Pengajuan disetujui. Akses ke materi investor telah dibuka.',
  rejected: 'Pengajuan tidak dilanjutkan. Data calon investor dijadwalkan dihapus maksimal 3×24 jam agar dapat mengajukan kembali.',
  active: 'Investor aktif dengan akses penuh sesuai izin yang diberikan.',
  inactive: 'Akses dihentikan sementara. Riwayat dan dokumen tetap tersimpan.',
}
