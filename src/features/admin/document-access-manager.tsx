'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { grantDocumentAccess, revokeDocumentAccess } from '@/server/documents/admin-actions'
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

export type GrantView = {
  id: string
  grantedAt: string
  note: string | null
  investorName: string
  referenceCode: string
}
export type InvestorOption = { id: string; label: string; referenceCode: string }

export function DocumentAccessManager({
  documentId,
  documentTitle,
  grants,
  investors,
  canAssign,
  canRevoke,
}: {
  documentId: string
  documentTitle: string
  grants: readonly GrantView[]
  investors: readonly InvestorOption[]
  canAssign: boolean
  canRevoke: boolean
}) {
  const router = useRouter()
  const { push } = useToast()
  const [grantOpen, setGrantOpen] = useState(false)
  const [revoke, setRevoke] = useState<GrantView | null>(null)
  const [investorId, setInvestorId] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  function giveAccess() {
    if (!investorId || pending) return
    setError(null)
    startTransition(async () => {
      const result = await grantDocumentAccess({
        documentId,
        investorId,
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setGrantOpen(false)
      setInvestorId('')
      setNote('')
      push({
        tone: 'success',
        title: 'Akses diberikan',
        description: 'Investor dapat mengakses dokumen sesuai status publikasinya.',
      })
      router.refresh()
    })
  }
  function removeAccess() {
    if (!revoke || pending) return
    setError(null)
    startTransition(async () => {
      const result = await revokeDocumentAccess({ grantId: revoke.id })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setRevoke(null)
      push({
        tone: 'success',
        title: 'Akses dicabut',
        description: 'Investor tidak lagi memiliki akses khusus ke dokumen ini.',
      })
      router.refresh()
    })
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-fg-muted">
          Akses individual hanya berlaku untuk dokumen dengan visibilitas investor terpilih.
        </p>
        {canAssign ? (
          <Button
            onClick={() => {
              setError(null)
              setGrantOpen(true)
            }}
          >
            Berikan akses
          </Button>
        ) : null}
      </div>
      {grants.length ? (
        <ul className="divide-border divide-y">
          {grants.map((grant) => (
            <li
              key={grant.id}
              className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-fg font-medium">{grant.investorName}</p>
                <p className="text-caption text-fg-subtle font-mono">
                  {grant.referenceCode} · Diberikan{' '}
                  {new Intl.DateTimeFormat('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(grant.grantedAt))}
                </p>
                {grant.note ? (
                  <p className="text-body-sm text-fg-muted mt-1">{grant.note}</p>
                ) : null}
              </div>
              {canRevoke ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setError(null)
                    setRevoke(grant)
                  }}
                >
                  Cabut akses
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-border text-body-sm text-fg-muted rounded-md border border-dashed p-4">
          Belum ada investor dengan akses khusus.
        </p>
      )}
      <Dialog
        open={grantOpen}
        onOpenChange={(open) => {
          if (!pending) {
            setGrantOpen(open)
            setError(null)
          }
        }}
      >
        <DialogContent size="sm" showClose={!pending}>
          <DialogHeader>
            <DialogTitle>Berikan akses dokumen</DialogTitle>
            <DialogDescription>
              Pilih investor yang dapat mengakses <strong>{documentTitle}</strong>.
            </DialogDescription>
          </DialogHeader>
          <label className="text-body-sm text-fg grid gap-1.5">
            <span>Investor</span>
            <select
              value={investorId}
              onChange={(event) => setInvestorId(event.target.value)}
              className="border-border bg-canvas text-body-sm h-10 rounded-lg border px-3"
            >
              <option value="">Pilih investor</option>
              {investors.map((investor) => (
                <option key={investor.id} value={investor.id}>
                  {investor.label} — {investor.referenceCode}
                </option>
              ))}
            </select>
          </label>
          <label className="text-body-sm text-fg grid gap-1.5">
            <span>Catatan (opsional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={1000}
              rows={3}
              className="border-border bg-canvas text-body-sm rounded-lg border p-3"
            />
          </label>
          {error ? (
            <Alert tone="danger" title="Akses tidak dapat diberikan">
              {error}
            </Alert>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" disabled={pending}>
                Batal
              </Button>
            </DialogClose>
            <Button loading={pending} disabled={!investorId} onClick={giveAccess}>
              Berikan akses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={revoke !== null}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setRevoke(null)
            setError(null)
          }
        }}
      >
        <DialogContent size="sm" showClose={!pending}>
          {revoke ? (
            <>
              <DialogHeader>
                <DialogTitle>Cabut akses dokumen?</DialogTitle>
                <DialogDescription>
                  Akses <strong>{revoke.investorName}</strong> ke <strong>{documentTitle}</strong>{' '}
                  akan dicabut.
                </DialogDescription>
              </DialogHeader>
              <p className="border-border bg-sunken text-body-sm text-fg-muted rounded-md border p-3">
                Investor tidak lagi dapat mengakses dokumen ini melalui akses khusus.
              </p>
              {error ? (
                <Alert tone="danger" title="Akses tidak dapat dicabut">
                  {error}
                </Alert>
              ) : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary" disabled={pending}>
                    Batal
                  </Button>
                </DialogClose>
                <Button variant="danger" loading={pending} onClick={removeAccess}>
                  Cabut akses
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
