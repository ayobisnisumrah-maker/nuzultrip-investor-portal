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

export function InvestorApplicationsManager({
  investors,
  permissions,
}: Props) {
  if (!investors.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-fg-muted" />

        <h2 className="mt-4 text-lg font-semibold text-fg">
          Tidak ada pengajuan
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-sm text-fg-muted">
          Belum ada investor yang masuk ke antrean pengajuan.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="border-b border-border bg-surface-subtle">
            <tr>
              <th className="px-5 py-4 text-left font-semibold">
                Investor
              </th>

              <th className="px-5 py-4 text-left font-semibold">
                Tipe
              </th>

              <th className="px-5 py-4 text-left font-semibold">
                Status
              </th>

              <th className="px-5 py-4 text-left font-semibold">
                Pengajuan
              </th>

              <th className="px-5 py-4 text-right font-semibold">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {investors.map((investor) => (
              <tr
                key={investor.id}
                className="hover:bg-surface-subtle/60"
              >
                <td className="px-5 py-4">
                  <div>
                    <Link
                      href={`/admin/investors/${investor.id}`}
                      className="font-semibold text-fg hover:underline"
                    >
                      {investor.legal_name}
                    </Link>

                    <div className="mt-1 text-xs text-fg-muted">
                      {investor.reference_code}
                    </div>

                    {investor.organization_name ? (
                      <div className="mt-1 text-xs text-fg-muted">
                        {investor.organization_name}
                      </div>
                    ) : null}
                  </div>
                </td>

                <td className="px-5 py-4">
                  {investor.investor_type === 'institution'
                    ? 'Institusi'
                    : 'Individu'}
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
                  <div className="text-fg">
                    {formatDate(investor.applied_at)}
                  </div>

                  {investor.city ? (
                    <div className="mt-1 text-xs text-fg-muted">
                      {investor.city}, {investor.country}
                    </div>
                  ) : null}
                </td>

                <td className="px-5 py-4">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link
                      href={`/admin/investors/${investor.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-fg hover:bg-surface-subtle"
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
