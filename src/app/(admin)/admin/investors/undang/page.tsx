import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { InviteInvestorForm } from '@/features/admin/investors/invite-investor-form'
import { requireAdminPage } from '@/server/auth/page-guards'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { PageHeader, Stack } from '@/ui/layout'

export const metadata: Metadata = {
  title: 'Undang Investor',
}

export default async function InviteInvestorPage() {
  const principal = await requireAdminPage('/admin/investors/undang')

  if (!principal.permissions.has('investors.create')) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Peran Anda tidak memiliki izin untuk membuat dan mengundang investor.
      </Alert>
    )
  }

  return (
    <Stack gap={6}>
      <PageHeader
        eyebrow="Investor Relations"
        title="Undang investor"
        description="Admin membuat akun awal investor. Sistem kemudian mengirim tautan aktivasi melalui surel agar investor membuat kata sandinya sendiri."
        breadcrumb={
          <Link
            href="/admin/investors"
            className="text-body-sm text-fg-muted hover:text-fg inline-flex items-center gap-2 transition"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Kembali ke investor
          </Link>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Data awal investor</CardTitle>
          <p className="text-body-sm text-fg-muted">
            Pastikan nama legal dan surel benar sebelum mengirim undangan. Tautan aktivasi akan mengarahkan investor ke halaman pembuatan kata sandi.
          </p>
        </CardHeader>
        <CardBody>
          <InviteInvestorForm />
        </CardBody>
      </Card>
    </Stack>
  )
}
