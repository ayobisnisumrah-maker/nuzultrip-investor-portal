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

  const fieldClassName =
    'mt-2 h-12 w-full rounded-[3px] border border-[#cfcfcb] bg-white px-4 text-base text-[#111111] outline-none transition focus:border-[#111111] focus:ring-2 focus:ring-black/10'

  return (
    <main className="min-h-dvh bg-white px-6 py-14 text-[#111111] sm:py-20">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 border-b border-[#111111] pb-1 text-sm font-semibold text-[#111111] transition-opacity hover:opacity-60"
        >
          ← Kembali ke Investor Relations
        </Link>

        <div className="mt-10 border-b border-[#e1e1df] pb-10">
          <p className="text-xs font-bold tracking-[0.14em] text-[#252525] uppercase">
            Investor Relations
          </p>
          <h1 className="font-display mt-4 text-4xl font-medium tracking-[-0.045em] text-[#111111] sm:text-5xl">
            Minta Informasi atau Dokumen
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#707070] sm:text-lg sm:leading-8">
            Gunakan formulir ini untuk meminta informasi atau dokumen Nuzultrip Equity yang ingin Anda
            pelajari terlebih dahulu. Pengiriman formulir ini bukan pendaftaran investor dan tidak
            membuat akun investor.
          </p>
        </div>

        {params.sent === '1' ? (
          <div className="mt-9 rounded-[4px] border border-[#e1e1df] bg-[#f6f6f4] p-7 sm:p-9">
            <p className="text-xs font-bold tracking-[0.14em] text-[#555555] uppercase">Terkirim</p>
            <h2 className="font-display mt-3 text-2xl font-medium tracking-[-0.035em] text-[#111111] sm:text-3xl">
              Permintaan berhasil dikirim
            </h2>
            <p className="mt-3 text-base leading-7 text-[#707070] sm:text-lg sm:leading-8">
              Tim Investor Relations akan meninjau kebutuhan informasi atau dokumen Anda dan
              menindaklanjutinya melalui informasi kontak yang diberikan.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-5 border-b border-[#111111] pb-1 text-sm font-semibold text-[#111111] hover:opacity-60"
            >
              Kembali ke portal →
            </Link>
          </div>
        ) : (
          <form
            action={submitPortalInquiry}
            className="mt-9 space-y-7 rounded-[4px] border border-[#e1e1df] bg-white p-6 sm:p-9"
          >
            {errorMessage ? (
              <div
                role="alert"
                className="rounded-[3px] border border-[#d9b9b2] bg-[#fff7f5] p-4 text-base text-[#7d3328]"
              >
                {errorMessage}
              </div>
            ) : null}

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="text-sm font-semibold text-[#111111]">
                  Nama lengkap
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  maxLength={200}
                  className={fieldClassName}
                />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-semibold text-[#111111]">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  maxLength={320}
                  className={fieldClassName}
                />
              </div>
              <div>
                <label htmlFor="phone" className="text-sm font-semibold text-[#111111]">
                  Nomor telepon
                </label>
                <input
                  id="phone"
                  name="phone"
                  maxLength={50}
                  className={fieldClassName}
                />
              </div>
              <div>
                <label htmlFor="organization" className="text-sm font-semibold text-[#111111]">
                  Perusahaan / organisasi
                </label>
                <input
                  id="organization"
                  name="organization"
                  maxLength={200}
                  className={fieldClassName}
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className="text-sm font-semibold text-[#111111]">
                Informasi / dokumen yang ingin dipelajari
              </label>
              <textarea
                id="message"
                name="message"
                required
                maxLength={5000}
                rows={7}
                placeholder="Contoh: Saya ingin mempelajari profil perusahaan, skema kepemilikan, atau dokumen pendukung yang tersedia."
                className="mt-2 w-full rounded-[3px] border border-[#cfcfcb] bg-white px-4 py-3 text-base leading-7 text-[#111111] outline-none transition placeholder:text-[#909090] focus:border-[#111111] focus:ring-2 focus:ring-black/10"
              />
            </div>

            <div className="flex flex-col-reverse gap-4 border-t border-[#ededed] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-sm leading-6 text-[#707070]">
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
