'use client'

import { useRef, useState, useTransition } from 'react'

import {
  refundPolicySchema,
  type RefundPolicy,
  type RefundTier,
} from '@/core/financials/refund-policy'
import { updateFinancePolicySettings } from '@/server/financials/policy-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Card, CardBody } from '@/ui/card'
import { Input, Textarea } from '@/ui/input'

type Props = {
  termsBody: string
  termsLetterheadAssetId: string | null
  refundPolicy: RefundPolicy
}

type Result = { ok: boolean; error?: { message: string } }

export function RefundPolicySettings({
  termsBody,
  termsLetterheadAssetId,
  refundPolicy,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [letterheadId, setLetterheadId] = useState(termsLetterheadAssetId)
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const rows = Array.from({ length: 5 }, (_, index) => refundPolicy.tiers[index] ?? null)

  async function uploadLetterhead(file: File | null) {
    if (!file) return
    setUploading(true)
    setNotice(null)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('purpose', 'finance-branding')
      const response = await fetch('/api/admin/media/upload', { method: 'POST', body })
      const payload = (await response.json()) as {
        ok?: boolean
        asset?: { id: string }
        error?: string
      }
      if (!response.ok || !payload.ok || !payload.asset)
        throw new Error(payload.error || 'Kop surat gagal diunggah.')
      setLetterheadId(payload.asset.id)
      setNotice({ ok: true, text: 'Kop surat berhasil diunggah. Simpan pengaturan untuk menerapkannya.' })
    } catch (error) {
      setNotice({
        ok: false,
        text: error instanceof Error ? error.message : 'Kop surat gagal diunggah.',
      })
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function collectTiers(form: FormData): RefundTier[] {
    const tiers: RefundTier[] = []
    for (let index = 0; index < 5; index += 1) {
      const minRaw = String(form.get(`tier-${index}-min`) ?? '').trim()
      const maxRaw = String(form.get(`tier-${index}-max`) ?? '').trim()
      const percentRaw = String(form.get(`tier-${index}-percent`) ?? '').trim()
      if (!minRaw && !maxRaw && !percentRaw) continue

      if (!minRaw || !percentRaw) {
        throw new Error(
          `Baris kebijakan refund ${index + 1} belum lengkap. Isi minimum hari dan persentase, atau kosongkan seluruh baris.`,
        )
      }

      const min = Number(minRaw)
      const max = maxRaw ? Number(maxRaw) : null
      const percent = Number(percentRaw)
      if (!Number.isFinite(min) || (max !== null && !Number.isFinite(max)) || !Number.isFinite(percent)) {
        throw new Error(`Baris kebijakan refund ${index + 1} berisi angka yang tidak valid.`)
      }

      tiers.push({
        minDaysBeforeDeparture: min,
        maxDaysBeforeDeparture: max,
        refundPercent: percent,
      })
    }
    return tiers
  }

  function run(task: () => Promise<Result>) {
    setNotice(null)
    startTransition(async () => {
      const result = await task()
      setNotice(
        result.ok
          ? { ok: true, text: 'Syarat, kop surat, dan kebijakan refund berhasil disimpan.' }
          : {
              ok: false,
              text: result.error?.message ?? 'Pengaturan tidak dapat disimpan.',
            },
      )
    })
  }

  return (
    <Card>
      <CardBody>
        <h2 className="text-heading-sm font-semibold">Syarat invoice & kebijakan refund</h2>
        <p className="text-body-sm text-fg-muted mt-1">
          Pengaturan ini disalin sebagai snapshot ketika invoice diterbitkan. Perubahan berikutnya
          tidak mengubah syarat pada invoice lama.
        </p>

        {notice ? (
          <div className="mt-4">
            <Alert tone={notice.ok ? 'success' : 'danger'} title={notice.ok ? 'Berhasil' : 'Tidak dapat diproses'}>
              {notice.text}
            </Alert>
          </div>
        ) : null}

        <form
          className="mt-5 grid gap-6"
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            try {
              const candidate = {
                processingDays: Number(form.get('processingDays')),
                dayBasis: String(form.get('dayBasis')) as 'business_days' | 'calendar_days',
                tiers: collectTiers(form),
              }
              const parsed = refundPolicySchema.safeParse(candidate)
              if (!parsed.success) {
                setNotice({
                  ok: false,
                  text: parsed.error.issues[0]?.message ?? 'Kebijakan refund tidak valid.',
                })
                return
              }
              run(() =>
                updateFinancePolicySettings({
                  termsBody: String(form.get('termsBody') ?? ''),
                  termsLetterheadAssetId: letterheadId,
                  refundPolicy: parsed.data,
                }),
              )
            } catch (error) {
              setNotice({
                ok: false,
                text: error instanceof Error ? error.message : 'Kebijakan refund tidak valid.',
              })
            }
          }}
        >
          <section className="grid gap-3">
            <div>
              <h3 className="font-semibold">Halaman 2 — Syarat & Ketentuan</h3>
              <p className="text-caption text-fg-muted mt-1">
                Isi berikut dicetak langsung sebagai halaman kedua PDF invoice. Pembayaran pelanggan
                menjadi bukti persetujuan atas syarat yang tercantum pada snapshot invoice tersebut.
              </p>
            </div>
            <label className="text-body-sm grid gap-1.5">
              <span>Isi syarat & ketentuan</span>
              <Textarea name="termsBody" defaultValue={termsBody} rows={12} maxLength={20_000} />
            </label>

            <div className="border-border grid gap-3 rounded-xl border p-4">
              <div>
                <p className="text-body-sm font-medium">Kop surat halaman 2</p>
                <p className="text-caption text-fg-subtle">
                  PNG, JPG, atau WebP; maksimal 6 MB. Kop surat dicetak di bagian atas halaman syarat.
                </p>
              </div>
              {letterheadId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/admin/finance/assets/${letterheadId}`}
                  alt="Kop surat syarat dan ketentuan"
                  className="max-h-32 w-full object-contain object-left"
                />
              ) : (
                <p className="text-caption text-fg-subtle">Belum ada kop surat.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  loading={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {letterheadId ? 'Ganti kop surat' : 'Unggah kop surat'}
                </Button>
                {letterheadId ? (
                  <Button type="button" variant="ghost" disabled={uploading} onClick={() => setLetterheadId(null)}>
                    Hapus
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void uploadLetterhead(event.target.files?.[0] ?? null)}
              />
            </div>
          </section>

          <section className="grid gap-4">
            <div>
              <h3 className="font-semibold">SLA proses refund</h3>
              <p className="text-caption text-fg-muted mt-1">
                Contoh: 90 hari kerja. Hari kerja saat ini dihitung Senin–Jumat; kalender hari libur
                nasional belum mengurangi hitungan.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-body-sm grid gap-1.5">
                <span>Maksimal proses</span>
                <Input
                  name="processingDays"
                  type="number"
                  min="1"
                  max="365"
                  defaultValue={refundPolicy.processingDays}
                  required
                />
              </label>
              <label className="text-body-sm grid gap-1.5">
                <span>Dasar hari</span>
                <select
                  name="dayBasis"
                  defaultValue={refundPolicy.dayBasis}
                  className="border-border-strong bg-surface h-11 rounded-md border px-3"
                >
                  <option value="business_days">Hari kerja (Senin–Jumat)</option>
                  <option value="calendar_days">Hari kalender</option>
                </select>
              </label>
            </div>
          </section>

          <section className="grid gap-3">
            <div>
              <h3 className="font-semibold">Persentase refund berdasarkan jarak keberangkatan</h3>
              <p className="text-caption text-fg-muted mt-1">
                Tidak ada persentase yang ditentukan sistem. Isi sesuai kebijakan perusahaan. Nilai
                0% berarti pembayaran hangus pada rentang tersebut. Rentang tidak boleh tumpang tindih;
                baris kosong diabaikan.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-fg-muted">
                  <tr>
                    <th className="pb-2 pr-3">Min. hari sebelum berangkat</th>
                    <th className="pb-2 pr-3">Maks. hari</th>
                    <th className="pb-2">Pengembalian (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((tier, index) => (
                    <TierRow key={index} index={index} tier={tier} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              Simpan syarat & kebijakan refund
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

function TierRow({ index, tier }: { index: number; tier: RefundTier | null }) {
  return (
    <tr className="border-border border-t">
      <td className="py-2 pr-3">
        <Input
          name={`tier-${index}-min`}
          type="number"
          min="0"
          max="3650"
          defaultValue={tier?.minDaysBeforeDeparture ?? ''}
        />
      </td>
      <td className="py-2 pr-3">
        <Input
          name={`tier-${index}-max`}
          type="number"
          min="0"
          max="3650"
          placeholder="Kosong = tanpa batas"
          defaultValue={tier?.maxDaysBeforeDeparture ?? ''}
        />
      </td>
      <td className="py-2">
        <Input
          name={`tier-${index}-percent`}
          type="number"
          min="0"
          max="100"
          step="0.01"
          defaultValue={tier?.refundPercent ?? ''}
        />
      </td>
    </tr>
  )
}
