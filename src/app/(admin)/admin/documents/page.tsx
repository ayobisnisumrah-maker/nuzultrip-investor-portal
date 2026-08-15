import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, Search } from 'lucide-react'
import { PUBLICATION_STATUSES, PUBLICATION_STATUS_LABELS, VISIBILITIES, VISIBILITY_LABELS, type PublicationStatus, type Visibility } from '@/core/documents/publication'
import { topics } from '@/core/realtime/events'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'
import { requireAdminPage } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatDateTime } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { DataTable, type Column } from '@/ui/table'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'
import { PublicationBadge, VisibilityBadge } from '@/ui/status'

export const metadata: Metadata = { title: 'Dokumen' }
const PAGE_SIZE = 20
type Kind = 'investment_proposal' | 'pitch_deck' | 'investor_report' | 'business_update' | 'supporting'
const kinds: Record<Kind, string> = { investment_proposal: 'Proposal investasi', pitch_deck: 'Pitch deck', investor_report: 'Laporan investor', business_update: 'Pembaruan bisnis', supporting: 'Pendukung' }
function valid<T extends string>(value: string | undefined, values: readonly T[]) { return value && values.includes(value as T) ? value as T : undefined }

export default async function AdminDocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; kind?: string; visibility?: string; page?: string }> }) {
  const principal = await requireAdminPage('/admin/documents')
  if (!principal.permissions.has('documents.view')) return <Alert tone="info" title="Akses terbatas">Peran Anda tidak memiliki izin untuk melihat dokumen.</Alert>
  const params = await searchParams; const q = params.q?.trim() ?? ''; const status = valid(params.status, PUBLICATION_STATUSES); const visibility = valid(params.visibility, VISIBILITIES); const kind = valid(params.kind, Object.keys(kinds) as Kind[]); const candidate = Number.parseInt(params.page ?? '1', 10); const page = Number.isFinite(candidate) && candidate > 0 ? candidate : 1
  const supabase = await getServerSupabase(); let query = supabase.from('documents').select('id, title, kind, status, visibility, created_at, updated_at', { count: 'exact' }).order('updated_at', { ascending: false })
  if (q) query = query.ilike('title', `%${q.replace(/[%_]/g, '\\$&')}%`)
  if (status) query = query.eq('status', status); if (visibility) query = query.eq('visibility', visibility); if (kind) query = query.eq('kind', kind)
  const { data, count, error } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  if (error) return <Alert tone="danger" title="Dokumen tidak dapat dimuat">Sistem gagal mengambil daftar dokumen. Silakan coba lagi.</Alert>
  const rows = data ?? []; const total = count ?? 0; const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE)); const queryString = (next: number) => { const p = new URLSearchParams(); if (q) p.set('q', q); if (status) p.set('status', status); if (kind) p.set('kind', kind); if (visibility) p.set('visibility', visibility); if (next > 1) p.set('page', String(next)); return p.toString() ? `?${p}` : '' }
  const columns: Column<(typeof rows)[number]>[] = [{ id: 'title', header: 'Dokumen', primary: true, cell: (row) => <Link className="font-medium text-fg hover:underline" href={`/admin/documents/${row.id}`}>{row.title}</Link> }, { id: 'kind', header: 'Tipe', cell: (row) => kinds[row.kind as Kind] }, { id: 'status', header: 'Status', cell: (row) => <PublicationBadge status={row.status as PublicationStatus} /> }, { id: 'visibility', header: 'Visibilitas', cell: (row) => <VisibilityBadge visibility={row.visibility as Visibility} /> }, { id: 'updated', header: 'Diperbarui', cell: (row) => formatDateTime(row.updated_at) }]
  return <Stack gap={8}><RealtimeRefresher topic={topics.admin()} kinds={['document.state_changed']} /><PageHeader eyebrow="Investor Relations" title="Dokumen" description="Kelola lifecycle publikasi dan akses dokumen investor secara terkontrol." /><Card><CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-5" aria-hidden="true" />Daftar dokumen</CardTitle></CardHeader><CardBody><form method="get" className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem_11rem_auto]"><label className="relative"><span className="sr-only">Cari dokumen</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" /><input name="q" defaultValue={q} placeholder="Cari judul dokumen..." className="h-10 w-full rounded-lg border border-border bg-canvas pl-9 pr-3 text-body-sm" /></label><select name="status" defaultValue={status ?? ''} className="h-10 rounded-lg border border-border bg-canvas px-3 text-body-sm"><option value="">Semua status</option>{PUBLICATION_STATUSES.map((item) => <option key={item} value={item}>{PUBLICATION_STATUS_LABELS[item]}</option>)}</select><select name="kind" defaultValue={kind ?? ''} className="h-10 rounded-lg border border-border bg-canvas px-3 text-body-sm"><option value="">Semua tipe</option>{Object.entries(kinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select name="visibility" defaultValue={visibility ?? ''} className="h-10 rounded-lg border border-border bg-canvas px-3 text-body-sm"><option value="">Semua visibilitas</option>{VISIBILITIES.map((item) => <option key={item} value={item}>{VISIBILITY_LABELS[item]}</option>)}</select><button className="h-10 rounded-lg bg-primary px-4 text-body-sm font-medium text-on-primary">Terapkan</button></form><DataTable rows={rows} columns={columns} rowKey={(row) => row.id} caption="Daftar dokumen" empty={<EmptyState title="Tidak ada dokumen" description={q || status || kind || visibility ? 'Tidak ada dokumen yang cocok dengan filter saat ini.' : 'Belum ada dokumen yang tersedia di sistem.'} />} />{totalPages > 1 ? <div className="mt-5 flex items-center justify-between"><p className="text-caption text-fg-subtle">Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total} dokumen</p><div className="flex gap-2">{page > 1 ? <Link className="rounded-lg border border-border px-3 py-2 text-body-sm" href={`/admin/documents${queryString(page - 1)}`}>Sebelumnya</Link> : null}{page < totalPages ? <Link className="rounded-lg border border-border px-3 py-2 text-body-sm" href={`/admin/documents${queryString(page + 1)}`}>Berikutnya</Link> : null}</div></div> : null}</CardBody></Card></Stack>
}
