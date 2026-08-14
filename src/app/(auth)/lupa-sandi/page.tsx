import type { Metadata } from 'next'
import Link from 'next/link'
import { PasswordResetForm } from './password-reset-form'

export const metadata: Metadata = {
  title: 'Pulihkan Akses',
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-fg-subtle overline">Investor Relations</p>
        <h1 className="font-display text-display-lg text-fg">Pulihkan akses</h1>
        <p className="text-body-sm text-fg-muted">
          Masukkan surel akun Anda. Bila terdaftar, kami akan mengirim tautan untuk mengatur ulang
          kata sandi.
        </p>
      </header>

      <PasswordResetForm />

      <p className="text-body-sm text-fg-muted">
        Sudah ingat kata sandi Anda?{' '}
        <Link href="/masuk" className="text-primary underline-offset-4 hover:underline">
          Kembali ke halaman masuk
        </Link>
      </p>
    </div>
  )
}
