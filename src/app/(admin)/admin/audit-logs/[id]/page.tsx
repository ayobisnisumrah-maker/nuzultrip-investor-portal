import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileJson, ShieldCheck } from 'lucide-react'
import { z } from 'zod'

import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatDateTime } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Button } from '@/ui/button'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { DetailList, DetailRow } from '@/ui/data'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = {
  title: 'Detail Audit Log',
}

const uuidSchema = z.string().uuid()

type AuditLogRow = {
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

function actorTypeLabel(value: string) {
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

function displayValue(value: string | null) {
  return value?.trim() || '—'
}

export default async function AdminAuditLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!uuidSchema.safeParse(id).success) {
    notFound()
  }

  const principal = await requireAdminPage(`/admin/audit-logs/${id}`)

  if (!principal.permissions.has('audit_logs.view')) {
    return (
      <Alert
        tone="info"
        title="Akses terbatas"
      >
        Peran Anda tidak memiliki izin untuk melihat detail log audit.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()

  const { data, error } = await supabase
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
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return (
      <Stack gap={6}>
        <PageHeader
          eyebrow="Security"
          title="Detail Audit Log"
          description="Detail aktivitas dan perubahan yang tercatat dalam sistem."
          actions={
            <Button
              asChild
              variant="secondary"
            >
              <Link href="/admin/audit-logs">
                <ArrowLeft
                  aria-hidden="true"
                />
                Kembali ke Audit Log
              </Link>
            </Button>
          }
        />

        <Alert
          tone="danger"
          title="Audit log tidak dapat dimuat"
        >
          Sistem gagal mengambil detail log audit. Silakan coba lagi.
        </Alert>
      </Stack>
    )
  }

  if (!data) {
    notFound()
  }

  const audit = data as AuditLogRow

  return (
    <Stack gap={8}>
      <PageHeader
        className="motion-safe:animate-rise"
        eyebrow="Security"
        title="Detail Audit Log"
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <code className="rounded bg-surface-muted px-1.5 py-1 font-mono text-caption text-fg">
              {audit.action}
            </code>

            <span>
              {actorTypeLabel(audit.actor_type)}
            </span>

            <span>
              {formatDateTime(audit.created_at)}
            </span>
          </span>
        }
        actions={
          <Button
            asChild
            variant="secondary"
          >
            <Link href="/admin/audit-logs">
              <ArrowLeft
                aria-hidden="true"
              />
              Kembali ke Audit Log
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Stack gap={6}>
          <Card className="motion-safe:animate-rise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-5"
                />
                Informasi Aktivitas
              </CardTitle>
            </CardHeader>

            <CardBody>
              <DetailList>
                <DetailRow label="Waktu">
                  {formatDateTime(audit.created_at)}
                </DetailRow>

                <DetailRow label="Action">
                  <code className="rounded bg-surface-muted px-1.5 py-1 font-mono text-caption text-fg">
                    {audit.action}
                  </code>
                </DetailRow>

                <DetailRow label="Actor">
                  <div className="flex flex-col gap-1">
                    <span className="text-body-sm text-fg">
                      {audit.actor_label || actorTypeLabel(audit.actor_type)}
                    </span>

                    <span className="text-caption text-fg-subtle">
                      {actorTypeLabel(audit.actor_type)}
                    </span>
                  </div>
                </DetailRow>

                <DetailRow label="Actor ID">
                  <span className="break-all font-mono text-caption">
                    {displayValue(audit.actor_id)}
                  </span>
                </DetailRow>

                <DetailRow label="Entity">
                  <div className="flex flex-col gap-1">
                    <span className="text-body-sm text-fg">
                      {audit.entity_type}
                    </span>

                    {audit.entity_id ? (
                      <span className="break-all font-mono text-caption text-fg-subtle">
                        {audit.entity_id}
                      </span>
                    ) : null}
                  </div>
                </DetailRow>

                <DetailRow label="Correlation ID">
                  <span className="break-all font-mono text-caption">
                    {displayValue(audit.correlation_id)}
                  </span>
                </DetailRow>

                <DetailRow label="Ringkasan">
                  <span className="whitespace-pre-wrap">
                    {audit.summary || '—'}
                  </span>
                </DetailRow>
              </DetailList>
            </CardBody>
          </Card>

          <Card className="motion-safe:animate-rise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson
                  aria-hidden="true"
                  className="size-5"
                />
                Perubahan Data
              </CardTitle>
            </CardHeader>

            <CardBody>
              {audit.changes &&
              Object.keys(audit.changes).length > 0 ? (
                <pre className="overflow-x-auto rounded-lg border border-border bg-sunken p-4 font-mono text-caption leading-relaxed text-fg">
                  {JSON.stringify(audit.changes, null, 2)}
                </pre>
              ) : (
                <EmptyState
                  title="Tidak ada perubahan data"
                  description="Aktivitas ini tidak menyimpan detail perubahan data."
                />
              )}
            </CardBody>
          </Card>
        </Stack>

        <aside className="h-fit xl:sticky xl:top-6">
          <Card
            variant="raised"
            className="motion-safe:animate-rise"
          >
            <CardHeader>
              <CardTitle>Identitas Log</CardTitle>
            </CardHeader>

            <CardBody>
              <DetailList>
                <DetailRow label="Log ID">
                  <span className="break-all font-mono text-caption">
                    {audit.id}
                  </span>
                </DetailRow>

                <DetailRow label="Entity">
                  {audit.entity_type}
                </DetailRow>

                <DetailRow label="Actor">
                  {actorTypeLabel(audit.actor_type)}
                </DetailRow>

                <DetailRow label="Tercatat">
                  {formatDateTime(audit.created_at)}
                </DetailRow>
              </DetailList>
            </CardBody>
          </Card>
        </aside>
      </div>
    </Stack>
  )
}
