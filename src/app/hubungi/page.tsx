import Link from 'next/link'

import { InquirySubmitButton } from '@/features/portal/inquiry-submit-button'
import { submitPortalInquiry } from '@/server/portal/inquiry-actions'

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const params = await searchParams
  const errorMessage =
    params.error === 'invalid'
      ? 'Data belum lengkap atau formatnya tidak valid. Periksa kembali formulir.'
      : params.error === 'rate'
        ? 'Terlalu banyak permintaan dalam waktu singkat. Silakan tunggu beberapa saat lalu coba lagi.'
        : params.error === 'server'
          ? 'Permintaan belum berhasil dikirim. Silakan coba kembali.'
          : null

  return (
    <main className="min-h-dvh bg-[#f5faf9] px-6 py-14 text-[#142657] sm:py-20">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-base font-medium text-[#397077] hover:text-[#0b7374]">
          ← Kembali ke Investor Relations
        </Link>

        <div className="mt-8">
          <p className="text-sm font-bold tracking-[0.16em] text-[#0b7374] uppercase">
            Investor Relations
          </p>
          <h1 className="font-display text-display-lg mt-3 text-[#142657]">
            Minta Informasi atau Dokumen
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#46556f] sm:text-xl sm:leading-9">
            Gunakan formulir ini untuk meminta informasi atau dokumen Nuzultrip Equity yang ingin Anda
            pelajari terlebih dahulu. Pengiriman formulir ini bukan pendaftaran investor dan tidak
            membuat akun investor.
          </p>
        </div>

        {params.sent === '1' ? (
          <div className="mt-9 rounded-2xl border border-[#cfe0df] bg-white p-7 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-semibold text-[#142657]">
              Permintaan berhasil dikirim
            </h2>
            <p className="mt-3 text-base leading-7 text-[#46556f] sm:text-lg sm:leading-8">
              Tim Investor Relations akan meninjau kebutuhan informasi atau dokumen Anda dan
              menindaklanjutinya melalui informasi kontak yang diberikan.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex text-base font-semibold text-[#0b7374] hover:underline"
            >
              Kembali ke portal
            </Link>
          </div>
        ) : (
          <form
            action={submitPortalInquiry}
            className="mt-9 space-y-7 rounded-2xl border border-[#cfe0df] bg-white p-6 shadow-sm sm:p-9"
          >
            {errorMessage ? (
              <div
                role="alert"
                className="rounded-xl border border-[#e3b7ae] bg-[#fff4f1] p-4 text-base text-[#8b3c2f]"
              >
                {errorMessage}
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
                  className="mt-2 h-12 w-full rounded-xl border border-[#799fa2] bg-white px-4 text-base text-[#142657] outline-none focus:border-[#0b7374] focus:ring-2 focus:ring-[#0b7374]/20"
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
                  className="mt-2 h-12 w-full rounded-xl border border-[#799fa2] bg-white px-4 text-base text-[#142657] outline-none focus:border-[#0b7374] focus:ring-2 focus:ring-[#0b7374]/20"
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
                  className="mt-2 h-12 w-full rounded-xl border border-[#799fa2] bg-white px-4 text-base text-[#142657] outline-none focus:border-[#0b7374] focus:ring-2 focus:ring-[#0b7374]/20"
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
                  className="mt-2 h-12 w-full rounded-xl border border-[#799fa2] bg-white px-4 text-base text-[#142657] outline-none focus:border-[#0b7374] focus:ring-2 focus:ring-[#0b7374]/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="text-base font-semibold text-[#142657]">
                Informasi / dokumen yang ingin dipelajari
              </label>
              <textarea
                id="message"
                name="message"
                required
                maxLength={5000}
                rows={7}
                placeholder="Contoh: Saya ingin mempelajari profil perusahaan, skema kepemilikan, atau dokumen pendukung yang tersedia."
                className="mt-2 w-full rounded-xl border border-[#799fa2] bg-white px-4 py-3 text-base leading-7 text-[#142657] outline-none placeholder:text-[#8290a5] focus:border-[#0b7374] focus:ring-2 focus:ring-[#0b7374]/20"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-[#617087] sm:text-base">
                Data digunakan hanya untuk menindaklanjuti permintaan informasi atau dokumen Anda.
              </p>
              <InquirySubmitButton />
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
