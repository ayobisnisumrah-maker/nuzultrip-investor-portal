import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getPrincipal } from '@/server/auth/session'
import { MIN_PASSWORD_LENGTH } from '@/core/auth/schemas'
import { SetPasswordForm } from './set-password-form'

export const metadata: Metadata = {
  title: 'Atur Kata Sandi',
  robots: { index: false, follow: false },
}

/**
 * Reached from a recovery or invite link, which the callback route has already
 * exchanged for a session. Without that session there is nothing to update, so
 * an unauthenticated visitor is sent to request a fresh link rather than shown
 * a form that cannot work.
 */
export default async function SetPasswordPage() {
  const principal = await getPrincipal()
  if (principal.kind === 'anonymous') redirect('/lupa-sandi')

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-fg-subtle overline">{principal.email}</p>
        <h1 className="font-display text-display-lg text-fg">Atur kata sandi</h1>
        <p className="text-body-sm text-fg-muted">
          Gunakan minimal {MIN_PASSWORD_LENGTH} karakter, dengan huruf kapital, huruf kecil, dan
          angka.
        </p>
      </header>

      <SetPasswordForm destination={principal.kind === 'admin' ? '/admin' : '/investor'} />
    </div>
  )
}
