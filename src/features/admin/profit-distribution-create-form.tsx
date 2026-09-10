'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { createProfitDistributionAction } from '@/server/ownership/profit-distribution-lifecycle-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Input, Textarea } from '@/ui/input'

type OfferingOption = { id: string; name: string; code: string; status: string }
type ReportOption = {
  versionId: string
  title: string
  periodLabel: string
  revenue: number
  expenses: number
  profit: number
}

export function ProfitDistributionCreateForm({
  offerings,
  reports,
}: {
  offerings: readonly OfferingOption[]
  reports: readonly ReportOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [offeringId, setOfferingId] = useState(offerings[0]?.id ?? '')
  const [financialReportVersionId, setFinancialReportVersionId] = useState(
    reports[0]?.versionId ?? '',
  )
  const [companyShare, setCompanyShare] = useState(60)
  const [investorShare, setInvestorShare] = useState(40)
  const [notes, setNotes] = useState('')

  const selectedReport = useMemo(
    () => reports.find((report) => report.versionId === financialReportVersionId),
    [financialReportVersionId, reports],
  )
  const profit = selectedReport?.profit ?? 0
  const investorPool = (profit * investorShare) / 100
  const splitValid = companyShare + investorShare === 100

  function submit() {
    if (pending || !offeringId || !financialReportVersionId || !splitValid) return
    setError(null)
    startTransition(async () => {
      const result = await createProfitDistributionAction({
        offeringId,
        financialReportVersionId,
        companyShareBps: Math.round(companyShare * 100),
        investorPoolBps: Math.round(investorShare * 100),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.push(`/admin/profit-distributions/${result.data.distributionId}`)
      router.refresh()
    })
  }

  if (!offerings.length) {
    return (
      <Alert tone="info" title="Belum ada penawaran kepemilikan">
        Buat dan aktifkan penawaran kepemilikan sebelum membuat distribusi bagi hasil.
      </Alert>
    )
  }

  if (!reports.length) {
    return (
      <Alert tone="info" title="Belum ada laporan resmi">
        Publikasikan laporan dari periode keuangan yang sudah ditutup sebelum membuat distribusi
        bagi hasil.
      </Alert>
    )
  }

  return (
    <div className="grid gap-5">
      <label className="text-body-sm text-fg grid gap-1.5">
        <span>Penawaran kepemilikan</span>
        <select
          value={offeringId}
          onChange={(e) => setOfferingId(e.target.value)}
          className="border-border bg-canvas h-10 rounded-lg border px-3"
        >
          {offerings.map((offering) => (
            <option key={offering.id} value={offering.id}>
              {offering.name} · {offering.code} · {offering.status}
            </option>
          ))}
        </select>
      </label>
      <label className="text-body-sm text-fg grid gap-1.5">
        <span>Laporan keuangan resmi</span>
        <select
          value={financialReportVersionId}
          onChange={(e) => setFinancialReportVersionId(e.target.value)}
          className="border-border bg-canvas h-10 rounded-lg border px-3"
        >
          {reports.map((report) => (
            <option key={report.versionId} value={report.versionId}>
              {report.title} · {report.periodLabel}
            </option>
          ))}
        </select>
      </label>
      <div className="border-border bg-sunken text-body-sm grid gap-2 rounded-lg border p-4 sm:grid-cols-2">
        <p>
          Pendapatan laporan:{' '}
          <strong>{(selectedReport?.revenue ?? 0).toLocaleString('id-ID')}</strong>
        </p>
        <p>
          Total beban laporan:{' '}
          <strong>{(selectedReport?.expenses ?? 0).toLocaleString('id-ID')}</strong>
        </p>
        <p>
          Profit setelah OPEX: <strong>{profit.toLocaleString('id-ID')}</strong>
        </p>
        <p>
          Pool investor: <strong>{investorPool.toLocaleString('id-ID')}</strong>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Porsi perusahaan (%)</span>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={companyShare}
            onChange={(e) => setCompanyShare(Number(e.target.value))}
          />
        </label>
        <label className="text-body-sm text-fg grid gap-1.5">
          <span>Pool investor (%)</span>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={investorShare}
            onChange={(e) => setInvestorShare(Number(e.target.value))}
          />
        </label>
      </div>
      {!splitValid ? (
        <Alert tone="warning" title="Porsi belum valid">
          Porsi perusahaan dan pool investor harus berjumlah tepat 100%.
        </Alert>
      ) : null}
      <label className="text-body-sm text-fg grid gap-1.5">
        <span>Catatan</span>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} />
      </label>
      {error ? (
        <Alert tone="danger" title="Distribusi tidak dapat dibuat">
          {error}
        </Alert>
      ) : null}
      <div className="flex justify-end">
        <Button
          loading={pending}
          disabled={!offeringId || !financialReportVersionId || !splitValid}
          onClick={submit}
        >
          Buat distribusi draft
        </Button>
      </div>
    </div>
  )
}
