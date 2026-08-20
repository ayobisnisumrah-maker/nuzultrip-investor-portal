import Link from 'next/link'

import { adminWithPermission } from '@/server/auth/page-guards'

export default async function NewPortalPage() {
  const principal = await adminWithPermission(
    'portal.update',
    '/admin/portal/pages/new',
  )

  if (!principal) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h1 className="font-display text-heading-lg text-fg">
          Akses Ditolak
        </h1>

        <p className="mt-2 text-body-sm text-fg-muted">
          Anda tidak memiliki izin untuk membuat halaman Portal.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/portal/pages"
          className="text-caption text-fg-muted hover:text-fg"
        >
          ← Kembali ke Halaman
        </Link>

        <div className="mt-4">
          <p className="text-caption font-medium uppercase tracking-[0.14em] text-fg-subtle">
            Portal & Content
          </p>

          <h1 className="mt-1 font-display text-heading-lg text-fg">
            Buat Halaman
          </h1>

          <p className="mt-2 max-w-2xl text-body-sm text-fg-muted">
            Buat halaman baru untuk Portal Investor.
          </p>
        </div>
      </div>

      <form className="rounded-xl border border-border bg-surface p-6">
        <div className="grid gap-6">
          <div>
            <label
              htmlFor="title"
              className="text-body-sm font-medium text-fg"
            >
              Judul Halaman
            </label>

            <input
              id="title"
              name="title"
              type="text"
              required
              className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-fg outline-none focus:border-primary"
              placeholder="Contoh: Tentang NuzulTrip"
            />
          </div>

          <div>
            <label
              htmlFor="slug"
              className="text-body-sm font-medium text-fg"
            >
              Slug
            </label>

            <input
              id="slug"
              name="slug"
              type="text"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-fg outline-none focus:border-primary"
              placeholder="tentang-nuzultrip"
            />

            <p className="mt-1 text-caption text-fg-muted">
              Hanya huruf kecil, angka, dan tanda hubung.
            </p>
          </div>

          <div>
            <label
              htmlFor="page_kind"
              className="text-body-sm font-medium text-fg"
            >
              Jenis Halaman
            </label>

            <select
              id="page_kind"
              name="page_kind"
              defaultValue="standard"
              className="mt-2 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-fg outline-none focus:border-primary"
            >
              <option value="standard">Standard</option>
              <option value="home">Beranda</option>
              <option value="legal">Legal</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="seo_description"
              className="text-body-sm font-medium text-fg"
            >
              SEO Description
            </label>

            <textarea
              id="seo_description"
              name="seo_description"
              rows={4}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-3 text-sm text-fg outline-none focus:border-primary"
              placeholder="Deskripsi halaman untuk mesin pencari."
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/admin/portal/pages"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-fg hover:bg-muted"
            >
              Batal
            </Link>

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Simpan Draft
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
