import Link from 'next/link'

import { submitPortalInquiry } from '@/server/portal/inquiry-actions'

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const params = await searchParams

  return (
    <main className="min-h-dvh bg-[#f5faf9] px-6 py-14 text-[#142657] sm:py-20">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-base font-medium text-[#397077] hover:text-[#0e7f80]">
          ← Kembali ke Investor Relations
        </Link>

        <div className="mt-8">
          <p className="text-sm font-bold tracking-[0.16em] text-[#0e7f80] uppercase">
            Investor Relations
          </p>
          <h1 className="font-display text-display-lg mt-3 text-[#142657]">Hubungi Tim Kami</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#46556f] sm:text-xl sm:leading-9">
            Sampaikan minat investasi, pertanyaan perusahaan, atau permintaan informasi. Permintaan
            akan masuk ke inbox Investor Relations untuk ditindaklanjuti oleh tim.
          </p>
        </div>

        {params.sent === '1' ? (
          <div className="mt-9 rounded-2xl border border-[#cfe0df] bg-white p-7 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-semibold text-[#142657]">
              Permintaan berhasil dikirim
            </h2>
            <p className="mt-3 text-base leading-7 text-[#46556f] sm:text-lg sm:leading-8">
              Tim Investor Relations akan meninjau permintaan Anda dan melakukan tindak lanjut
              melalui informasi kontak yang diberikan.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex text-base font-semibold text-[#0e7f80] hover:underline"
            >
              Kembali ke portal
            </Link>
          </div>
        ) : (
          <form
            action={submitPortalInquiry}
            className="mt-9 space-y-7 rounded-2xl border border-[#cfe0df] bg-white p-6 shadow-sm sm:p-9"
          >
            {params.error === 'invalid' ? (
              <div
                role="alert"
                className="rounded-xl border border-[#e3b7ae] bg-[#fff4f1] p-4 text-base text-[#8b3c2f]"
              >
                Data belum lengkap atau formatnya tidak valid. Periksa kembali formulir.
              </div>
            ) : null}

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="text-base font-semibold text-[#142657]">
                  Nama lengkap
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  maxLength={200}
                  className="mt-2 h-12 w-full rounded-xl border border-[#bfd3d4] bg-white px-4 text-base text-[#142657] outline-none focus:border-[#0e9c9c] focus:ring-2 focus:ring-[#0e9c9c]/20"
                />
              </div>
              <div>
                <label htmlFor="email" className="text-base font-semibold text-[#142657]">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  maxLength={320}
                  className="mt-2 h-12 w-full rounded-xl border border-[#bfd3d4] bg-white px-4 text-base text-[#142657] outline-none focus:border-[#0e9c9c] focus:ring-2 focus:ring-[#0e9c9c]/20"
                />
              </div>
              <div>
                <label htmlFor="phone" className="text-base font-semibold text-[#142657]">
                  Nomor telepon
                </label>
                <input
                  id="phone"
                  name="phone"
                  maxLength={50}
                  className="mt-2 h-12 w-full rounded-xl border border-[#bfd3d4] bg-white px-4 text-base text-[#142657] outline-none focus:border-[#0e9c9c] focus:ring-2 focus:ring-[#0e9c9c]/20"
                />
              </div>
              <div>
                <label htmlFor="organization" className="text-base font-semibold text-[#142657]">
                  Perusahaan / organisasi
                </label>
                <input
                  id="organization"
                  name="organization"
                  maxLength={200}
                  className="mt-2 h-12 w-full rounded-xl border border-[#bfd3d4] bg-white px-4 text-base text-[#142657] outline-none focus:border-[#0e9c9c] focus:ring-2 focus:ring-[#0e9c9c]/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="text-base font-semibold text-[#142657]">
                Pesan
              </label>
              <textarea
                id="message"
                name="message"
                required
                maxLength={5000}
                rows={7}
                className="mt-2 w-full rounded-xl border border-[#bfd3d4] bg-white px-4 py-3 text-base leading-7 text-[#142657] outline-none focus:border-[#0e9c9c] focus:ring-2 focus:ring-[#0e9c9c]/20"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-[#617087] sm:text-base">
                Data digunakan untuk menindaklanjuti permintaan Anda.
              </p>
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0e8b8c] px-6 text-base font-semibold text-white transition-colors hover:bg-[#0b7374]"
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
