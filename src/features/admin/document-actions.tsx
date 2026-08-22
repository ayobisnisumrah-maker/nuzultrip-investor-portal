'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PublicationStatus } from '@/core/documents/publication'
import { PUBLICATION_STATUS_LABELS } from '@/core/documents/publication'
import {
  approveDocument,
  archiveDocument,
  publishDocument,
  submitDocumentForReview,
} from '@/server/documents/admin-actions'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog'
import { useToast } from '@/ui/toast'

type Key = 'review' | 'approve' | 'publish' | 'archive'
const config: Record<
  Key,
  {
    label: string
    target: PublicationStatus
    permission: string
    consequence: string
    variant: 'primary' | 'secondary' | 'danger'
  }
> = {
  review: {
    label: 'Kirim untuk peninjauan',
    target: 'review',
    permission: 'documents.review',
    consequence: 'Dokumen masuk ke tahap peninjauan dan belum dapat diakses investor.',
    variant: 'secondary',
  },
  approve: {
    label: 'Setujui dokumen',
    target: 'approved',
    permission: 'documents.approve',
    consequence: 'Versi aktif siap diterbitkan, tetapi belum dapat diakses investor.',
    variant: 'primary',
  },
  publish: {
    label: 'Terbitkan dokumen',
    target: 'published',
    permission: 'documents.publish',
    consequence: 'Dokumen akan tersedia sesuai visibilitas dan akses investor yang berlaku.',
    variant: 'primary',
  },
  archive: {
    label: 'Arsipkan dokumen',
    target: 'archived',
    permission: 'documents.archive',
    consequence:
      'Dokumen tidak lagi tersedia bagi pembaca. Versi terbit tetap tersimpan sebagai catatan.',
    variant: 'danger',
  },
}
const handlers = {
  review: submitDocumentForReview,
  approve: approveDocument,
  publish: publishDocument,
  archive: archiveDocument,
}

export function DocumentActions({
  documentId,
  title,
  status,
  permissions,
}: {
  documentId: string
  title: string
  status: PublicationStatus
  permissions: readonly string[]
}) {
  const router = useRouter()
  const { push } = useToast()
  const [selected, setSelected] = useState<Key | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const key =
    status === 'draft'
      ? 'review'
      : status === 'review'
        ? 'approve'
        : status === 'approved'
          ? 'publish'
          : status === 'published'
            ? 'archive'
            : null
  if (!key || !permissions.includes(config[key].permission)) return null
  const actionKey: Key = key
  const action = config[actionKey]
  function confirm() {
    if (pending) return
    setError(null)
    startTransition(async () => {
      const result = await handlers[actionKey]({ documentId })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setSelected(null)
      push({
        tone: 'success',
        title: 'Status dokumen diperbarui',
        description: `${title} kini ${PUBLICATION_STATUS_LABELS[action.target].toLowerCase()}.`,
      })
      router.refresh()
    })
  }
  return (
    <>
      <Button variant={action.variant} onClick={() => setSelected(key)}>
        {action.label}
      </Button>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setSelected(null)
            setError(null)
          }
        }}
      >
        <DialogContent size="sm" showClose={!pending}>
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{action.label}?</DialogTitle>
                <DialogDescription>
                  Anda akan mengubah status <strong>{title}</strong> dari{' '}
                  {PUBLICATION_STATUS_LABELS[status].toLowerCase()} menjadi{' '}
                  {PUBLICATION_STATUS_LABELS[action.target].toLowerCase()}.
                </DialogDescription>
              </DialogHeader>
              <p className="border-border bg-sunken text-body-sm text-fg-muted rounded-md border p-3">
                {action.consequence}
              </p>
              {error ? (
                <Alert tone="danger" title="Aksi tidak dapat diselesaikan">
                  {error}
                </Alert>
              ) : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary" disabled={pending}>
                    Batal
                  </Button>
                </DialogClose>
                <Button variant={action.variant} loading={pending} onClick={confirm}>
                  {action.label}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
