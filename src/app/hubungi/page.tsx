import Link from 'next/link'

import { submitPortalInquiry } from '@/server/portal/inquiry-actions'

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const params = await searchParams

  return (
    <main className="bg-background text-fg min-h-dvh px-6 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-caption text-fg-muted hover:text-fg">
          ← Kembali ke Investor Relations
        </Link>

        <div className="mt-8">
          <p className="text-caption text-fg-subtle font-medium tracking-[0.16em] uppercase">
            Investor Relations
          </p>
          <h1 className="font-display text-display-lg text-fg mt-3">Hubungi Tim Kami</h1>
          <p className="text-body-lg text-fg-muted mt-4 max-w-2xl leading-8">
            Sampaikan minat investasi, pertanyaan perusahaan, atau permintaan informasi. Permintaan
            akan masuk ke inbox Investor Relations untuk ditindaklanjuti oleh tim.
          </p>
        </div>

        {params.sent === '1' ? (
          <div className="border-border bg-surface mt-8 rounded-2xl border p-6">
            <h2 className="font-display text-heading-md text-fg">Permintaan berhasil dikirim</h2>
            <p className="text-body-sm text-fg-muted mt-2 leading-6">
              Tim Investor Relations akan meninjau permintaan Anda dan melakukan tindak lanjut
              melalui informasi kontak yang diberikan.
            </p>
            <Link
              href="/"
              className="text-primary mt-5 inline-flex text-sm font-semibold hover:underline"
            >
              Kembali ke portal
            </Link>
          </div>
        ) : (
          <form
            action={submitPortalInquiry}
            className="border-border bg-surface mt-8 space-y-6 rounded-2xl border p-6 sm:p-8"
          >
            {params.error === 'invalid' ? (
              <div
                role="alert"
                className="border-border bg-background text-fg-muted rounded-xl border p-4 text-sm"
              >
                Data belum lengkap atau formatnya tidak valid. Periksa kembali formulir.
              </div>
            ) : null}

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="text-body-sm text-fg font-medium">
                  Nama lengkap
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  maxLength={200}
                  className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-body-sm text-fg font-medium">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  maxLength={320}
                  className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none"
                />
              </div>
              <div>
                <label htmlFor="phone" className="text-body-sm text-fg font-medium">
                  Nomor telepon
                </label>
                <input
                  id="phone"
                  name="phone"
                  maxLength={50}
                  className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none"
                />
              </div>
              <div>
                <label htmlFor="organization" className="text-body-sm text-fg font-medium">
                  Perusahaan / organisasi
                </label>
                <input
                  id="organization"
                  name="organization"
                  maxLength={200}
                  className="border-border bg-background text-fg focus:border-primary mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="text-body-sm text-fg font-medium">
                Pesan
              </label>
              <textarea
                id="message"
                name="message"
                required
                maxLength={5000}
                rows={7}
                className="border-border bg-background text-fg focus:border-primary mt-2 w-full rounded-xl border px-3 py-3 text-sm leading-6 outline-none"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-caption text-fg-subtle">
                Data digunakan untuk menindaklanjuti permintaan Anda.
              </p>
              <button
                type="submit"
                className="bg-primary text-primary-foreground inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold hover:opacity-90"
              >
                Kirim Permintaan
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
