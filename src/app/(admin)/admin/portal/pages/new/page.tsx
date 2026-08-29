import Link from 'next/link'

import { adminWithPermission } from '@/server/auth/page-guards'

export default async function NewPortalPage() {
  const principal = await adminWithPermission('portal.update', '/admin/portal/pages/new')

  if (!principal) {
    return (
      <div className="border-border bg-surface rounded-xl border p-6">
        <h1 className="font-display text-heading-lg text-fg">Akses Ditolak</h1>

        <p className="text-body-sm text-fg-muted mt-2">
          Anda tidak memiliki izin untuk membuat halaman Portal.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/portal/pages" className="text-caption text-fg-muted hover:text-fg">
          ← Kembali ke Halaman
        </Link>

        <div className="mt-4">
          <p className="text-caption text-fg-subtle font-medium tracking-[0.14em] uppercase">
            Portal & Konten
          </p>

          <h1 className="font-display text-heading-lg text-fg mt-1">Buat Halaman</h1>

          <p className="text-body-sm text-fg-muted mt-2 max-w-2xl">
            Buat halaman baru untuk Portal Investor.
          </p>
        </div>
      </div>

      <form className="border-border bg-surface rounded-xl border p-6">
        <div className="grid gap-6">
          <div>
            <label htmlFor="title" className="text-body-sm text-fg font-medium">
              Judul Halaman
            </label>

            <input
              id="title"
              name="title"
              type="text"
              required
              className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              placeholder="Contoh: Tentang NuzulTrip"
            />
          </div>

          <div>
            <label htmlFor="slug" className="text-body-sm text-fg font-medium">
              Slug
            </label>

            <input
              id="slug"
              name="slug"
              type="text"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
              placeholder="tentang-nuzultrip"
            />

            <p className="text-caption text-fg-muted mt-1">
              Hanya huruf kecil, angka, dan tanda hubung.
            </p>
          </div>

          <div>
            <label htmlFor="page_kind" className="text-body-sm text-fg font-medium">
              Jenis Halaman
            </label>

            <select
              id="page_kind"
              name="page_kind"
              defaultValue="standard"
              className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none"
            >
              <option value="standard">Standard</option>
              <option value="home">Beranda</option>
              <option value="legal">Legal</option>
            </select>
          </div>

          <div>
            <label htmlFor="seo_description" className="text-body-sm text-fg font-medium">
              SEO Description
            </label>

            <textarea
              id="seo_description"
              name="seo_description"
              rows={4}
              className="border-border bg-background text-fg focus:border-primary mt-2 w-full rounded-lg border px-3 py-3 text-sm outline-none"
              placeholder="Deskripsi halaman untuk mesin pencari."
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/admin/portal/pages"
              className="border-border text-fg hover:bg-muted inline-flex h-10 items-center justify-center rounded-lg border px-4 text-sm font-medium"
            >
              Batal
            </Link>

            <button
              type="submit"
              className="bg-primary text-primary-foreground inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium hover:opacity-90"
            >
              Simpan Draf
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
