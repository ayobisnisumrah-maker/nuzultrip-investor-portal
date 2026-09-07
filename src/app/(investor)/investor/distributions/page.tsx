import type { Metadata } from 'next'

import { requireInvestorPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Bagi Hasil' }

function rupiah(value: number | string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function date(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

const STATUS_LABELS: Record<string, string> = {
  payable: 'Siap Dibayar',
  paid: 'Sudah Dibayar',
}

export default async function InvestorDistributionsPage() {
  const principal = await requireInvestorPage()
  const supabase = await getServerSupabase()

  const { data: allocations, error: allocationError } = await supabase
    .from('profit_distribution_allocations')
    .select(
      'id, distribution_id, allocation_amount, ownership_bps, investor_pool_share_bps, status, paid_at, payment_reference, created_at',
    )
    .eq('investor_id', principal.investorId)
    .in('status', ['payable', 'paid'])
    .order('created_at', { ascending: false })

  if (allocationError) {
    throw new Error('Data bagi hasil investor tidak dapat dimuat.')
  }

  const rows = allocations ?? []
  const distributionIds = [...new Set(rows.map((item) => item.distribution_id))]
  const allocationIds = rows.map((item) => item.id)

  const [{ data: distributions }, { data: proofs }] = await Promise.all([
    distributionIds.length
      ? supabase
          .from('profit_distributions')
          .select('id, period_start, period_end, profit_amount, investor_pool_amount, status, paid_at, notes')
          .in('id', distributionIds)
      : Promise.resolve({ data: [] }),
    allocationIds.length
      ? supabase
          .from('profit_distribution_payment_proofs')
          .select('id, allocation_id, original_file_name, mime_type, file_size_bytes, uploaded_at')
          .eq('investor_id', principal.investorId)
          .in('allocation_id', allocationIds)
      : Promise.resolve({ data: [] }),
  ])

  const distributionMap = new Map((distributions ?? []).map((item) => [item.id, item]))
  const proofMap = new Map((proofs ?? []).map((item) => [item.allocation_id, item]))

  const totalPayable = rows
    .filter((item) => item.status === 'payable')
    .reduce((sum, item) => sum + Number(item.allocation_amount), 0)
  const totalPaid = rows
    .filter((item) => item.status === 'paid')
    .reduce((sum, item) => sum + Number(item.allocation_amount), 0)

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Keuangan Investor"
        title="Bagi Hasil"
        description="Pantau alokasi bagi hasil yang telah disetujui untuk akun Anda, status pembayaran, referensi transaksi, dan bukti pembayaran."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <div className="text-caption text-fg-subtle">Siap Dibayar</div>
            <div className="text-heading-lg mt-1 font-semibold tabular">{rupiah(totalPayable)}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-caption text-fg-subtle">Sudah Dibayar</div>
            <div className="text-heading-lg mt-1 font-semibold tabular">{rupiah(totalPaid)}</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="text-caption text-fg-subtle">Riwayat Distribusi</div>
            <div className="text-heading-lg mt-1 font-semibold tabular">{rows.length.toLocaleString('id-ID')}</div>
          </CardBody>
        </Card>
      </div>

      {!rows.length ? (
        <EmptyState
          title="Belum ada bagi hasil"
          description="Alokasi yang telah siap dibayar atau telah dibayarkan akan muncul di halaman ini."
        />
      ) : (
        <div className="grid gap-4">
          {rows.map((allocation) => {
            const distribution = distributionMap.get(allocation.distribution_id)
            const proof = proofMap.get(allocation.id)

            return (
              <Card key={allocation.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle>
                      {distribution
                        ? `Periode ${date(distribution.period_start)} — ${date(distribution.period_end)}`
                        : 'Distribusi bagi hasil'}
                    </CardTitle>
                    <span className="rounded-full border border-border px-3 py-1 text-body-sm font-medium">
                      {STATUS_LABELS[allocation.status] ?? allocation.status}
                    </span>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <div className="text-caption text-fg-subtle">Alokasi Anda</div>
                      <div className="mt-1 font-semibold tabular">{rupiah(allocation.allocation_amount)}</div>
                    </div>
                    <div>
                      <div className="text-caption text-fg-subtle">Porsi Kepemilikan</div>
                      <div className="mt-1 font-semibold tabular">
                        {(Number(allocation.ownership_bps) / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%
                      </div>
                    </div>
                    <div>
                      <div className="text-caption text-fg-subtle">Porsi Pool Investor</div>
                      <div className="mt-1 font-semibold tabular">
                        {(Number(allocation.investor_pool_share_bps) / 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%
                      </div>
                    </div>
                    <div>
                      <div className="text-caption text-fg-subtle">Tanggal Pembayaran</div>
                      <div className="mt-1 font-semibold">{date(allocation.paid_at)}</div>
                    </div>
                  </div>

                  {allocation.payment_reference ? (
                    <div className="mt-4 rounded-lg border border-border bg-sunken p-3 text-body-sm">
                      <span className="text-fg-subtle">Referensi pembayaran: </span>
                      <span className="font-mono">{allocation.payment_reference}</span>
                    </div>
                  ) : null}

                  {distribution?.notes ? (
                    <p className="text-body-sm text-fg-muted mt-4 whitespace-pre-wrap">{distribution.notes}</p>
                  ) : null}

                  {proof ? (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                      <div>
                        <div className="text-body-sm font-medium">{proof.original_file_name}</div>
                        <div className="text-caption text-fg-subtle mt-1">Bukti pembayaran · {date(proof.uploaded_at)}</div>
                      </div>
                      <a
                        href={`/api/investor/profit-distributions/proofs/${proof.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="border-border text-body-sm text-fg hover:bg-muted inline-flex h-9 items-center rounded-lg border px-3 font-medium transition"
                      >
                        Buka bukti pembayaran
                      </a>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </Stack>
  )
}
