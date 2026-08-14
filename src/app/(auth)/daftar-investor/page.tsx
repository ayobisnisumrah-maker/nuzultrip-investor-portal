import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPrincipal } from '@/server/auth/session'
import { getServerSupabase } from '@/server/supabase/server'
import { Alert } from '@/ui/alert'
import { InvestorApplicationForm } from './application-form'

export const metadata: Metadata = {
  title: 'Pendaftaran Investor',
  robots: { index: false, follow: false },
}

export default async function InvestorApplicationPage() {
  const principal = await getPrincipal()
  if (principal.kind === 'admin') redirect('/admin')
  if (principal.kind === 'investor') redirect('/investor')

  const supabase = await getServerSupabase()
  const { data: setting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'workflow.investor_application_open')
    .maybeSingle()

  // Absent is treated as closed: an operator who has not made a decision should
  // not have the form silently open. The same rule is applied server-side in
  // the action, which is what actually enforces it.
  const isOpen = setting?.value === true

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-fg-subtle overline">Investor Relations</p>
        <h1 className="font-display text-display-lg text-fg">Pendaftaran investor</h1>
        <p className="text-body-sm text-fg-muted">
          Lengkapi data berikut. Tim hubungan investor akan meninjau pengajuan Anda sebelum akses
          dibuka.
        </p>
      </header>

      {isOpen ? (
        <InvestorApplicationForm />
      ) : (
        <Alert tone="info" title="Pendaftaran sedang ditutup">
          Saat ini kami tidak menerima pengajuan baru. Silakan hubungi tim hubungan investor untuk
          informasi lebih lanjut.
        </Alert>
      )}

      <p className="text-body-sm text-fg-muted">
        Sudah memiliki akun?{' '}
        <Link href="/masuk" className="text-primary underline-offset-4 hover:underline">
          Masuk di sini
        </Link>
      </p>

      <p className="border-border text-caption text-fg-subtle border-t pt-5">
        Pengajuan ini bersifat administratif untuk membuka akses informasi investor. Platform ini
        bukan sistem OJK, bukan platform perdagangan efek, dan bukan platform urun dana. Tidak ada
        penawaran, imbal hasil, atau jaminan apa pun yang timbul dari pengisian formulir ini.
      </p>
    </div>
  )
}
