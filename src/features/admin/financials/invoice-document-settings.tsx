import {
  updateInvoiceDocumentSettings,
  uploadInvoiceDocumentAsset,
} from '@/server/financials/invoice-asset-actions'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'

export type InvoiceDocumentSettingsValue = {
  company_email: string | null
  company_phone: string | null
  company_website: string | null
  signer_name: string | null
  signer_title: string | null
  logo_asset_id: string | null
  stamp_asset_id: string | null
  signature_asset_id: string | null
  show_stamp: boolean
  show_signature: boolean
  show_print_metadata: boolean
  show_draft_watermark: boolean
}

const inputClass =
  'border-border bg-canvas text-fg h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-primary-solid'

function AssetUpload({
  kind,
  label,
  present,
  guidance,
}: {
  kind: 'logo' | 'stamp' | 'signature'
  label: string
  present: boolean
  guidance: string
}) {
  return (
    <form
      action={async (formData) => {
        'use server'
        await uploadInvoiceDocumentAsset(formData)
      }}
      className="border-border bg-canvas-subtle rounded-xl border p-4"
    >
      <input type="hidden" name="kind" value={kind} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-body-sm font-semibold">{label}</div>
          <div className="text-caption text-fg-muted mt-1">{guidance}</div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            present ? 'bg-success-subtle text-success' : 'bg-surface text-fg-muted'
          }`}
        >
          {present ? 'Sudah diunggah' : 'Belum diunggah'}
        </span>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="border-border bg-surface text-body-sm text-fg file:bg-surface-strong file:text-fg w-full rounded-lg border p-2 file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5"
        />
        <button
          type="submit"
          className="bg-primary-solid text-on-primary hover:bg-primary-solid-hover h-10 shrink-0 rounded-lg px-4 text-sm font-semibold transition"
        >
          {present ? 'Ganti file' : 'Unggah'}
        </button>
      </div>
    </form>
  )
}

export function InvoiceDocumentSettings({ settings }: { settings: InvoiceDocumentSettingsValue }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identitas Dokumen Invoice</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="grid gap-6">
          <div>
            <p className="text-body-sm text-fg-muted">
              Aset di bagian ini hanya dipakai untuk invoice/kwitansi cetak. Logo portal, header Admin Console,
              status sistem, dan kartu akses admin tidak ikut masuk ke dokumen cetak.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <AssetUpload
              kind="logo"
              label="Logo Invoice"
              present={Boolean(settings.logo_asset_id)}
              guidance="PNG/JPG/WebP, maksimal 5 MB. Gunakan logo horizontal/transparan bila tersedia."
            />
            <AssetUpload
              kind="stamp"
              label="Stempel Perusahaan"
              present={Boolean(settings.stamp_asset_id)}
              guidance="Disarankan PNG transparan agar menyatu rapi pada area otorisasi invoice."
            />
            <AssetUpload
              kind="signature"
              label="Tanda Tangan"
              present={Boolean(settings.signature_asset_id)}
              guidance="Disarankan PNG transparan. Tanda tangan tampil bersama nama dan jabatan penandatangan."
            />
          </div>

          <form
            action={async (formData) => {
              'use server'
              await updateInvoiceDocumentSettings(formData)
            }}
            className="grid gap-5"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-1.5 text-sm">
                <span>Email perusahaan</span>
                <input className={inputClass} type="email" name="company_email" defaultValue={settings.company_email ?? ''} />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span>Telepon / WhatsApp</span>
                <input className={inputClass} name="company_phone" defaultValue={settings.company_phone ?? ''} />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span>Website</span>
                <input className={inputClass} name="company_website" defaultValue={settings.company_website ?? ''} />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span>Nama penandatangan</span>
                <input className={inputClass} name="signer_name" defaultValue={settings.signer_name ?? ''} />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span>Jabatan penandatangan</span>
                <input className={inputClass} name="signer_title" defaultValue={settings.signer_title ?? ''} />
              </label>
            </div>

            <div className="border-border grid gap-3 rounded-xl border p-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="show_signature" defaultChecked={settings.show_signature} />
                Tampilkan tanda tangan
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="show_stamp" defaultChecked={settings.show_stamp} />
                Tampilkan stempel
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="show_print_metadata" defaultChecked={settings.show_print_metadata} />
                Tampilkan waktu & pencetak
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="show_draft_watermark" defaultChecked={settings.show_draft_watermark} />
                Watermark DRAFT
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-primary-solid text-on-primary hover:bg-primary-solid-hover h-10 rounded-lg px-5 text-sm font-semibold transition"
              >
                Simpan identitas dokumen
              </button>
            </div>
          </form>
        </div>
      </CardBody>
    </Card>
  )
}
