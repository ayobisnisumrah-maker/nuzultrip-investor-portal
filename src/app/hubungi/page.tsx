import Link from 'next/link'

import { submitPortalInquiry } from '@/server/portal/inquiry-actions'

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const params = await searchParams

  return (
    <main className="min-h-dvh bg-background px-6 py-16 text-fg sm:py-24">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-caption text-fg-muted hover:text-fg">
          ← Kembali ke Investor Relations
        </Link>

        <div className="mt-8">
          <p className="text-caption font-medium uppercase tracking-[0.16em] text-fg-subtle">Investor Relations</p>
          <h1 className="mt-3 font-display text-display-lg text-fg">Hubungi Tim Kami</h1>
          <p className="mt-4 max-w-2xl text-body-lg leading-8 text-fg-muted">
            Sampaikan minat investasi, pertanyaan perusahaan, atau permintaan informasi. Permintaan akan masuk ke inbox Investor Relations untuk ditindaklanjuti oleh tim.
          </p>
        </div>

        {params.sent === '1' ? (
          <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-display text-heading-md text-fg">Permintaan berhasil dikirim</h2>
            <p className="mt-2 text-body-sm leading-6 text-fg-muted">
              Tim Investor Relations akan meninjau permintaan Anda dan melakukan tindak lanjut melalui informasi kontak yang diberikan.
            </p>
            <Link href="/" className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">
              Kembali ke portal
            </Link>
          </div>
        ) : (
          <form action={submitPortalInquiry} className="mt-8 space-y-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
            {params.error === 'invalid' ? (
              <div role="alert" className="rounded-xl border border-border bg-background p-4 text-sm text-fg-muted">
                Data belum lengkap atau formatnya tidak valid. Periksa kembali formulir.
              </div>
            ) : null}

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="text-body-sm font-medium text-fg">Nama lengkap</label>
                <input id="name" name="name" required maxLength={200} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-fg outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="email" className="text-body-sm font-medium text-fg">Email</label>
                <input id="email" name="email" type="email" required maxLength={320} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-fg outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="phone" className="text-body-sm font-medium text-fg">Nomor telepon</label>
                <input id="phone" name="phone" maxLength={50} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-fg outline-none focus:border-primary" />
              </div>
              <div>
                <label htmlFor="organization" className="text-body-sm font-medium text-fg">Perusahaan / organisasi</label>
                <input id="organization" name="organization" maxLength={200} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-fg outline-none focus:border-primary" />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="text-body-sm font-medium text-fg">Pesan</label>
              <textarea id="message" name="message" required maxLength={5000} rows={7} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6 text-fg outline-none focus:border-primary" />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-caption text-fg-subtle">Data digunakan untuk menindaklanjuti permintaan Anda.</p>
              <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Kirim Permintaan
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
