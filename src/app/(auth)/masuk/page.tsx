import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPrincipal } from '@/server/auth/session'
import { SignInForm } from './sign-in-form'

export const metadata: Metadata = {
  title: 'Masuk',
  robots: { index: false, follow: false },
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string; galat?: string }>
}) {
  const principal = await getPrincipal()
  if (principal.kind === 'admin') redirect('/admin')
  if (principal.kind === 'investor') redirect('/investor')

  const params = await searchParams

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-fg-subtle overline">Investor Relations</p>
        <h1 className="font-display text-display-lg text-fg">Masuk</h1>
        <p className="text-body-sm text-fg-muted">Gunakan surel dan kata sandi akun Anda.</p>
      </header>

      <SignInForm
        redirectTo={params.lanjut}
        initialError={params.galat ? describeCallbackError(params.galat) : undefined}
      />

      <div className="text-body-sm text-fg-muted flex flex-col gap-2">
        <p>
          Lupa kata sandi?{' '}
          <Link href="/lupa-sandi" className="text-primary underline-offset-4 hover:underline">
            Pulihkan akses
          </Link>
        </p>
        <p className="text-caption text-fg-subtle">
          Akses investor dibuat oleh tim admin. Undangan aktivasi dan pembuatan kata sandi akan dikirim ke surel investor yang didaftarkan.
        </p>
      </div>
    </div>
  )
}

function describeCallbackError(code: string): string {
  switch (code) {
    case 'tautan_tidak_valid':
      return 'Tautan sudah kedaluwarsa atau pernah digunakan. Silakan minta tautan baru.'
    case 'missing_code':
      return 'Tautan tidak lengkap. Silakan buka kembali tautan dari surel Anda.'
    default:
      return 'Proses masuk tidak dapat diselesaikan. Silakan coba lagi.'
  }
}
