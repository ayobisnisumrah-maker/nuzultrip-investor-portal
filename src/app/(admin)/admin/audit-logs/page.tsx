import type { Metadata } from 'next'
import Link from 'next/link'
import { Activity, ChevronLeft, ChevronRight, Search } from 'lucide-react'

import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatDateTime } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { DataTable, type Column } from '@/ui/table'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = {
  title: 'Audit Log',
}

const PAGE_SIZE = 20

type SearchParams = {
  q?: string
  action?: string
  actorType?: string
  entityType?: string
  page?: string
}

type AuditRow = {
  id: string
  actor_id: string | null
  actor_type: string
  actor_label: string | null
  action: string
  entity_type: string
  entity_id: string | null
  summary: string
  changes: Record<string, unknown>
  correlation_id: string | null
  created_at: string
}

function validPage(value: string | undefined) {
  const candidate = Number.parseInt(value ?? '1', 10)

  return Number.isFinite(candidate) && candidate > 0
    ? candidate
    : 1
}

function buildQuery(params: SearchParams) {
  const query = new URLSearchParams()

  if (params.q) query.set('q', params.q)
  if (params.action) query.set('action', params.action)
  if (params.actorType) query.set('actorType', params.actorType)
  if (params.entityType) query.set('entityType', params.entityType)

  if (params.page && params.page !== '1') {
    query.set('page', params.page)
  }

  const value = query.toString()

  return value ? `?${value}` : ''
}

function labelActorType(value: string) {
  switch (value) {
    case 'admin':
      return 'Admin'
    case 'investor':
      return 'Investor'
    case 'system':
      return 'System'
    case 'anonymous':
      return 'Anonymous'
    default:
      return value
  }
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const principal = await requireAdminPage('/admin/audit-logs')

  if (!principal.permissions.has('audit_logs.view')) {
    return (
      <Alert
        tone="info"
        title="Akses terbatas"
      >
        Peran Anda tidak memiliki izin untuk melihat log audit.
      </Alert>
    )
  }

  const params = await searchParams

  const q = params.q?.trim() ?? ''
  const action = params.action?.trim() ?? ''
  const actorType = params.actorType?.trim() ?? ''
  const entityType = params.entityType?.trim() ?? ''
  const page = validPage(params.page)

  const supabase = await getServerSupabase()

  let query = supabase
    .from('audit_logs')
    .select(
      `
        id,
        actor_id,
        actor_type,
        actor_label,
        action,
        entity_type,
        entity_id,
        summary,
        changes,
        correlation_id,
        created_at
      `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })

  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&')

    query = query.or(
      `action.ilike.%${escaped}%,summary.ilike.%${escaped}%,actor_label.ilike.%${escaped}%,entity_type.ilike.%${escaped}%`,
    )
  }

  if (action) {
    query = query.eq('action', action)
  }

  if (actorType) {
    query = query.eq('actor_type', actorType)
  }

  if (entityType) {
    query = query.eq('entity_type', entityType)
  }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const {
    data,
    count,
    error,
  } = await query.range(from, to)

  if (error) {
    return (
      <Stack gap={6}>
        <PageHeader
          eyebrow="Security"
          title="Audit Log"
          description="Jejak aktivitas dan perubahan penting dalam sistem."
        />

        <Alert
          tone="danger"
          title="Audit log tidak dapat dimuat"
        >
          Sistem gagal mengambil log audit. Silakan coba lagi.
        </Alert>
      </Stack>
    )
  }

  const rows = (data ?? []) as AuditRow[]
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const previousQuery =
    page > 1
      ? buildQuery({
          q,
          action,
          actorType,
          entityType,
          page: String(page - 1),
        })
      : ''

  const nextQuery =
    page < totalPages
      ? buildQuery({
          q,
          action,
          actorType,
          entityType,
          page: String(page + 1),
        })
      : ''

  const columns: Column<AuditRow>[] = [
    {
      id: 'created_at',
      header: 'Waktu',
      cell: (row) => (
        <span className="whitespace-nowrap font-mono text-caption text-fg-muted">
          {formatDateTime(row.created_at)}
        </span>
      ),
    },
    {
      id: 'actor',
      header: 'Actor',
      primary: true,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">
            {row.actor_label || labelActorType(row.actor_type)}
          </p>
          <p className="mt-0.5 text-caption text-fg-subtle">
            {labelActorType(row.actor_type)}
          </p>
        </div>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      cell: (row) => (
        <code className="rounded bg-surface-muted px-1.5 py-1 font-mono text-caption text-fg">
          {row.action}
        </code>
      ),
    },
    {
      id: 'entity',
      header: 'Entity',
      cell: (row) => (
        <div className="min-w-0">
          <p className="text-body-sm text-fg">
            {row.entity_type}
          </p>

          {row.entity_id ? (
            <p className="mt-0.5 truncate font-mono text-caption text-fg-subtle">
              {row.entity_id}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'summary',
      header: 'Ringkasan',
      cell: (row) => (
        <span className="text-body-sm text-fg-muted">
          {row.summary || '—'}
        </span>
      ),
    },
    {
      id: 'detail',
      header: 'Detail',
      align: 'right',
      hideOnStack: true,
      cell: (row) => (
        <Link
          href={`/admin/audit-logs/${row.id}`}
          className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-body-sm font-medium text-fg transition hover:bg-surface-muted"
        >
          Detail
        </Link>
      ),
    },
  ]

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Security"
        title="Audit Log"
        description="Jejak aktivitas, perubahan data, dan tindakan penting yang tercatat oleh sistem."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity
              aria-hidden="true"
              className="size-5"
            />
            Aktivitas sistem
          </CardTitle>

          <p className="text-body-sm text-fg-muted">
            Log bersifat append-only dan ditampilkan sesuai permission akun Anda.
          </p>
        </CardHeader>

        <CardBody>
          <form
            method="get"
            className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem_12rem_auto]"
          >
            <label className="relative">
              <span className="sr-only">
                Cari audit log
              </span>

              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
              />

              <input
                name="q"
                defaultValue={q}
                placeholder="Cari action, actor, entity, atau ringkasan..."
                className="h-10 w-full rounded-lg border border-border bg-canvas pl-9 pr-3 text-body-sm text-fg outline-none transition focus:border-accent-solid focus:ring-2 focus:ring-accent-solid/20"
              />
            </label>

            <input
              name="action"
              defaultValue={action}
              placeholder="Action..."
              className="h-10 rounded-lg border border-border bg-canvas px-3 text-body-sm text-fg outline-none focus:border-accent-solid"
            />

            <select
              name="actorType"
              defaultValue={actorType}
              className="h-10 rounded-lg border border-border bg-canvas px-3 text-body-sm text-fg outline-none focus:border-accent-solid"
            >
              <option value="">
                Semua actor
              </option>
              <option value="admin">
                Admin
              </option>
              <option value="investor">
                Investor
              </option>
              <option value="system">
                System
              </option>
              <option value="anonymous">
                Anonymous
              </option>
            </select>

            <input
              name="entityType"
              defaultValue={entityType}
              placeholder="Entity..."
              className="h-10 rounded-lg border border-border bg-canvas px-3 text-body-sm text-fg outline-none focus:border-accent-solid"
            />

            <button
              type="submit"
              className="h-10 rounded-lg bg-primary px-4 text-body-sm font-medium text-on-primary transition hover:opacity-90"
            >
              Terapkan
            </button>
          </form>

          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(row) => row.id}
            caption="Audit log"
            empty={
              <EmptyState
                title="Tidak ada aktivitas"
                description={
                  q || action || actorType || entityType
                    ? 'Tidak ada audit log yang cocok dengan filter saat ini.'
                    : 'Belum ada aktivitas audit yang tercatat.'
                }
              />
            }
          />

          {totalPages > 1 ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-caption text-fg-subtle">
                Menampilkan {from + 1}–
                {Math.min(from + PAGE_SIZE, total)} dari {total} aktivitas
              </p>

              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={`/admin/audit-logs${previousQuery}`}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-body-sm text-fg transition hover:bg-surface-muted"
                  >
                    <ChevronLeft
                      aria-hidden="true"
                      className="size-4"
                    />
                    Sebelumnya
                  </Link>
                ) : null}

                {page < totalPages ? (
                  <Link
                    href={`/admin/audit-logs${nextQuery}`}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-body-sm text-fg transition hover:bg-surface-muted"
                  >
                    Berikutnya
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4"
                    />
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </Stack>
  )
}
