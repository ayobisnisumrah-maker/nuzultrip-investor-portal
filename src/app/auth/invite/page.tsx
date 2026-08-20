import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { acceptInvite } from '@/server/auth/invite-actions'
import { Button } from '@/ui/button'
import { KhatimStar } from '@/ui/geometry/khatim'

export const metadata: Metadata = {
  title: 'Terima Undangan',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string
    type?: string
  }>
}) {
  const params = await searchParams

  const tokenHash = params.token_hash
  const type = params.type

  if (!tokenHash || type !== 'invite') {
    redirect('/masuk?galat=tautan_tidak_valid')
  }

  return (
    <div className="min-h-dvh bg-canvas px-5 py-10 sm:px-10">
      <div className="mx-auto flex min-h-[80dvh] w-full max-w-lg items-center justify-center">
        <div className="w-full rounded-2xl border border-border bg-surface p-8 shadow-sm sm:p-10">
          <div className="flex items-center gap-3">
            <KhatimStar
              variant="filled"
              className="text-accent-solid size-7"
            />

            <div className="flex flex-col leading-tight">
              <span className="font-display text-heading-md text-fg">
                Nuzultrip
              </span>

              <span className="text-caption uppercase tracking-[0.1em] text-fg-muted">
                Investor Relations
              </span>
            </div>
          </div>

          <div className="mt-10">
            <p className="text-caption font-medium uppercase tracking-[0.14em] text-accent">
              Investor Relations
            </p>

            <h1 className="mt-2 font-display text-display-md text-fg">
              Anda mendapat undangan
            </h1>

            <p className="mt-4 text-body-sm leading-6 text-fg-muted">
              Anda diundang untuk membuat akun administrator
              Nuzultrip Investor Relations.
            </p>

            <p className="mt-3 text-body-sm leading-6 text-fg-muted">
              Klik tombol di bawah untuk menerima undangan dan
              melanjutkan ke proses pembuatan kata sandi.
            </p>
          </div>

          <form action={acceptInvite} className="mt-8">
            <input
              type="hidden"
              name="tokenHash"
              value={tokenHash}
            />

            <Button
              type="submit"
              size="lg"
              fullWidth
            >
              Terima Undangan
            </Button>
          </form>

          <p className="mt-6 text-center text-caption text-fg-muted">
            Jika Anda tidak mengenali undangan ini, Anda dapat
            menutup halaman ini.
          </p>

          <div className="mt-6 text-center">
            <Link
              href="/masuk"
              className="text-caption text-fg-muted hover:text-fg"
            >
              Kembali ke halaman masuk
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}