'use client'

import Link from 'next/link'
import { Eye, CheckCircle2 } from 'lucide-react'

import type { InvestorStatus } from '@/core/investors/status'
import { InvestorReviewActions } from '@/features/admin/investor-review-actions'

type Investor = {
  id: string
  reference_code: string
  status: InvestorStatus
  investor_type: string
  legal_name: string
  organization_name: string | null
  country: string
  city: string | null
  application_note: string | null
  rejection_reason: string | null
  applied_at: string | null
  created_at: string
}

type Props = {
  investors: Investor[]
  permissions: readonly string[]
}

const STATUS_LABELS: Record<InvestorStatus, string> = {
  prospective: 'Prospektif',
  submitted: 'Diajukan',
  under_review: 'Sedang Ditinjau',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  active: 'Aktif',
  inactive: 'Nonaktif',
}

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function statusClass(status: InvestorStatus) {
  switch (status) {
    case 'submitted':
      return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300'

    case 'under_review':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'

    case 'approved':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'

    case 'rejected':
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'

    case 'active':
      return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300'

    case 'inactive':
      return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'

    case 'prospective':
      return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'

    default:
      return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
  }
}

export function InvestorApplicationsManager({ investors, permissions }: Props) {
  if (!investors.length) {
    return (
      <div className="border-border bg-surface rounded-2xl border border-dashed p-12 text-center">
        <CheckCircle2 className="text-fg-muted mx-auto h-10 w-10" />

        <h2 className="text-fg mt-4 text-lg font-semibold">Tidak ada pengajuan</h2>

        <p className="text-fg-muted mx-auto mt-2 max-w-lg text-sm">
          Belum ada investor yang masuk ke antrean pengajuan.
        </p>
      </div>
    )
  }

  return (
    <div className="border-border bg-surface overflow-hidden rounded-2xl border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="border-border bg-surface-subtle border-b">
            <tr>
              <th className="px-5 py-4 text-left font-semibold">Investor</th>

              <th className="px-5 py-4 text-left font-semibold">Tipe</th>

              <th className="px-5 py-4 text-left font-semibold">Status</th>

              <th className="px-5 py-4 text-left font-semibold">Pengajuan</th>

              <th className="px-5 py-4 text-right font-semibold">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-border divide-y">
            {investors.map((investor) => (
              <tr key={investor.id} className="hover:bg-surface-subtle/60">
                <td className="px-5 py-4">
                  <div>
                    <Link
                      href={`/admin/investors/${investor.id}`}
                      className="text-fg font-semibold hover:underline"
                    >
                      {investor.legal_name}
                    </Link>

                    <div className="text-fg-muted mt-1 text-xs">{investor.reference_code}</div>

                    {investor.organization_name ? (
                      <div className="text-fg-muted mt-1 text-xs">{investor.organization_name}</div>
                    ) : null}
                  </div>
                </td>

                <td className="px-5 py-4">
                  {investor.investor_type === 'institution' ? 'Institusi' : 'Individu'}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                      investor.status,
                    )}`}
                  >
                    {STATUS_LABELS[investor.status]}
                  </span>
                </td>

                <td className="px-5 py-4">
                  <div className="text-fg">{formatDate(investor.applied_at)}</div>

                  {investor.city ? (
                    <div className="text-fg-muted mt-1 text-xs">
                      {investor.city}, {investor.country}
                    </div>
                  ) : null}
                </td>

                <td className="px-5 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link
                      href={`/admin/investors/${investor.id}`}
                      className="border-border text-fg hover:bg-surface-subtle inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detail
                    </Link>

                    <InvestorReviewActions
                      investorId={investor.id}
                      investorName={investor.legal_name}
                      status={investor.status}
                      permissions={permissions}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
