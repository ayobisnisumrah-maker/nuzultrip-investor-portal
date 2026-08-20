import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { DocumentCreateForm } from '@/features/admin/document-create-form'
import { requireAdminPage } from '@/server/auth/page-guards'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { PageHeader, Stack } from '@/ui/layout'

export const metadata: Metadata = {
  title: 'Dokumen Baru',
}

export default async function NewDocumentPage() {
  const principal = await requireAdminPage('/admin/documents/new')

  if (!principal.permissions.has('documents.create')) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Peran Anda tidak memiliki izin untuk membuat dokumen.
      </Alert>
    )
  }

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Investor Relations"
        title="Dokumen Baru"
        description="Buat dokumen baru sebagai draft. Dokumen belum dipublikasikan sampai melewati lifecycle publikasi."
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/documents">
              <ArrowLeft aria-hidden="true" />
              Kembali
            </Link>
          </Button>
        }
      />

      <DocumentCreateForm />
    </Stack>
  )
}
