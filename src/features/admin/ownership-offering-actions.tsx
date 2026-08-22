'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import type { OwnershipOfferingStatus } from '@/server/ownership/offering-service'
import {
  archiveOwnershipOffering,
  closeOwnershipOffering,
  pauseOwnershipOffering,
  publishOwnershipOffering,
  resumeOwnershipOffering,
} from '@/server/ownership/offering-actions'

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

type ActionKey = 'publish' | 'pause' | 'resume' | 'close' | 'archive'

type ActionConfig = {
  label: string
  target: OwnershipOfferingStatus
  permission: string
  consequence: string
  variant: 'primary' | 'secondary' | 'danger'
}

const STATUS_LABELS: Record<OwnershipOfferingStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  paused: 'Paused',
  closed: 'Closed',
  archived: 'Archived',
}

const CONFIG: Record<ActionKey, ActionConfig> = {
  publish: {
    label: 'Terbitkan Penawaran',
    target: 'open',
    permission: 'ownership_offerings.publish',
    consequence:
      'Penawaran akan menjadi aktif dan dapat diproses sesuai konfigurasi akses investor.',
    variant: 'primary',
  },

  pause: {
    label: 'Jeda Penawaran',
    target: 'paused',
    permission: 'ownership_offerings.pause',
    consequence:
      'Penawaran akan dihentikan sementara dan tidak dapat menerima investasi baru sampai dibuka kembali.',
    variant: 'secondary',
  },

  resume: {
    label: 'Buka Kembali',
    target: 'open',
    permission: 'ownership_offerings.resume',
    consequence: 'Penawaran akan kembali ke status Open dan dapat diproses kembali.',
    variant: 'primary',
  },

  close: {
    label: 'Tutup Penawaran',
    target: 'closed',
    permission: 'ownership_offerings.close',
    consequence:
      'Penawaran akan ditutup secara permanen dari lifecycle aktif. Pastikan seluruh proses transaksi yang relevan telah selesai.',
    variant: 'danger',
  },

  archive: {
    label: 'Arsipkan Penawaran',
    target: 'archived',
    permission: 'ownership_offerings.archive',
    consequence:
      'Penawaran akan dipindahkan ke arsip dan tidak lagi menjadi bagian dari lifecycle aktif.',
    variant: 'danger',
  },
}

function hasPermission(
  permissions: ReadonlySet<string> | readonly string[],
  permission: string,
): boolean {
  if ('has' in permissions) {
    return permissions.has(permission)
  }

  return permissions.includes(permission)
}
const HANDLERS = {
  publish: publishOwnershipOffering,
  pause: pauseOwnershipOffering,
  resume: resumeOwnershipOffering,
  close: closeOwnershipOffering,
  archive: archiveOwnershipOffering,
} as const

function getAvailableActions(status: OwnershipOfferingStatus): ActionKey[] {
  switch (status) {
    case 'draft':
      return ['publish']

    case 'open':
      return ['pause', 'close']

    case 'paused':
      return ['resume', 'close']

    case 'closed':
      return ['archive']

    case 'archived':
      return []

    default:
      return []
  }
}

type OwnershipOfferingActionsProps = {
  offeringId: string
  name: string
  status: OwnershipOfferingStatus
  permissions: ReadonlySet<string> | readonly string[]
}

export function OwnershipOfferingActions({
  offeringId,
  name,
  status,
  permissions,
}: OwnershipOfferingActionsProps) {
  const router = useRouter()
  const { push } = useToast()

  const [selected, setSelected] = useState<ActionKey | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const availableActions = getAvailableActions(status).filter((key) =>
    hasPermission(permissions, CONFIG[key].permission),
  )

  if (availableActions.length === 0) {
    return null
  }

  const selectedAction = selected !== null ? CONFIG[selected] : null

  function confirm() {
    if (selected === null || pending) {
      return
    }

    const actionKey = selected
    const action = CONFIG[actionKey]
    const handler = HANDLERS[actionKey]

    setError(null)

    startTransition(async () => {
      try {
        const result = await handler({
          offeringId,
        })

        if (!result.ok) {
          setError(result.error.message)
          return
        }

        setSelected(null)

        push({
          tone: 'success',
          title: 'Status penawaran diperbarui',
          description: `${name} kini ${STATUS_LABELS[action.target]}.`,
        })

        router.refresh()
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Aksi penawaran tidak dapat diselesaikan.',
        )
      }
    })
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {availableActions.map((key) => {
          const action = CONFIG[key]

          return (
            <Button
              key={key}
              variant={action.variant}
              onClick={() => {
                setError(null)
                setSelected(key)
              }}
            >
              {action.label}
            </Button>
          )
        })}
      </div>

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
          {selected !== null && selectedAction ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAction.label}?</DialogTitle>

                <DialogDescription>
                  Anda akan mengubah status <strong>{name}</strong> dari {STATUS_LABELS[status]}{' '}
                  menjadi {STATUS_LABELS[selectedAction.target]}.
                </DialogDescription>
              </DialogHeader>

              <p className="border-border bg-sunken text-body-sm text-fg-muted rounded-md border p-3">
                {selectedAction.consequence}
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

                <Button variant={selectedAction.variant} loading={pending} onClick={confirm}>
                  {selectedAction.label}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
