'use client'

import { useState } from 'react'
import { Building2, Download, FileText, Plus, Trash2, Users } from 'lucide-react'
import { INVESTOR_STATUSES } from '@/core/investors/status'
import { PUBLICATION_STATUSES, VISIBILITIES } from '@/core/documents/publication'
import { FINANCIAL_SOURCES } from '@/core/financials/provenance'
import { SEMANTIC_ROLES } from '@/ui/tokens/palette'
import { Alert } from '@/ui/alert'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/card'
import { Checkbox, ChoiceRow, Radio, RadioGroup, Switch } from '@/ui/checkbox'
import { DeltaValue, DetailList, DetailRow, MoneyValue, StatCard } from '@/ui/data'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/dialog'
import { Field } from '@/ui/field'
import { GeometricField, KhatimSpinner, KhatimStar, TessellationBand } from '@/ui/geometry/khatim'
import { Input, SearchInput, Textarea } from '@/ui/input'
import { Container, Grid, Inline, PageHeader, Stack } from '@/ui/layout'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/ui/menu'
import { Breadcrumb, Pagination } from '@/ui/navigation'
import { Avatar, Kbd, Overline, Separator, Skeleton } from '@/ui/primitives'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select'
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
  NoResultsState,
  OfflineBanner,
  TableSkeleton,
} from '@/ui/states'
import { InvestorStatusPill, ProvenanceTag, PublicationBadge, VisibilityBadge } from '@/ui/status'
import { DataTable, type Column } from '@/ui/table'
import { ToastProvider, useToast } from '@/ui/toast'

/* -------------------------------------------------------------------------- */

function Block({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-heading-lg text-fg">{title}</h2>
        {description ? <p className="text-body-sm text-fg-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

/* -------------------------------------------------------------------------- */

type DemoRow = {
  id: string
  name: string
  reference: string
  status: (typeof INVESTOR_STATUSES)[number]
  amount: string
}

/**
 * Gallery fixtures. Clearly fictional, confined to this development-only
 * component, and never presented as real records anywhere in the product.
 */
const DEMO_ROWS: readonly DemoRow[] = [
  { id: '1', name: 'Contoh Investor Satu', reference: 'NTI-2026-0001', status: 'active', amount: '250000000' },
  { id: '2', name: 'Contoh Investor Dua', reference: 'NTI-2026-0002', status: 'under_review', amount: '0' },
  { id: '3', name: 'Contoh Institusi Tiga', reference: 'NTI-2026-0003', status: 'approved', amount: '1750000000' },
]

const DEMO_COLUMNS: ReadonlyArray<Column<DemoRow>> = [
  { id: 'name', header: 'Nama', cell: (row) => row.name, primary: true },
  {
    id: 'reference',
    header: 'Kode',
    cell: (row) => <span className="font-mono text-caption">{row.reference}</span>,
  },
  { id: 'status', header: 'Status', cell: (row) => <InvestorStatusPill status={row.status} size="sm" /> },
  {
    id: 'amount',
    header: 'Komitmen',
    align: 'right',
    numeric: true,
    cell: (row) => <MoneyValue amount={row.amount} />,
  },
]

/* -------------------------------------------------------------------------- */

export function DesignSystemGallery() {
  return (
    <ToastProvider>
      <TooltipProvider delayDuration={200}>
        <GalleryBody />
      </TooltipProvider>
    </ToastProvider>
  )
}

function GalleryBody() {
  const { push } = useToast()
  const [loading, setLoading] = useState(false)

  return (
    <Container width="content" as="main" className="py-10">
      <PageHeader
        eyebrow="Design System"
        title="Mizan"
        description="Setiap komponen dirender di sini dalam tema terang dan gelap. Halaman ini hanya tersedia di lingkungan pengembangan."
        breadcrumb={<Breadcrumb items={[{ label: 'Internal' }, { label: 'Design System' }]} />}
        actions={<Button variant="secondary">Dokumentasi</Button>}
      />

      <Stack gap={10}>
        {/* ------------------------------------------------------------ colour */}
        <Block
          title="Warna"
          description="Komponen hanya memakai peran semantik, tidak pernah langsung memakai tangga warna primitif."
        >
          <Grid min="11rem" gap={3}>
            {SEMANTIC_ROLES.filter((role) => role !== 'overlay').map((role) => (
              <div key={role} className="flex items-center gap-3 rounded-md border border-border p-2">
                <span
                  className="size-9 shrink-0 rounded-sm border border-border"
                  style={{ background: `var(--c-${role})` }}
                />
                <code className="min-w-0 truncate text-caption text-fg-muted">{role}</code>
              </div>
            ))}
          </Grid>
        </Block>

        {/* -------------------------------------------------------- typography */}
        <Block title="Tipografi" description="Newsreader untuk display, Plus Jakarta Sans untuk antarmuka, JetBrains Mono untuk angka.">
          <Stack gap={3}>
            <Overline tone="accent">Overline · eyebrow</Overline>
            <p className="font-display text-display-2xl text-fg">Display 2XL</p>
            <p className="font-display text-display-xl text-fg">Display XL</p>
            <p className="font-display text-display-lg text-fg">Display LG</p>
            <p className="text-heading-xl text-fg">Heading XL</p>
            <p className="text-heading-lg text-fg">Heading LG</p>
            <p className="text-heading-md text-fg">Heading MD</p>
            <p className="text-body-lg text-fg">Body LG — teks pengantar yang lebih besar.</p>
            <p className="max-w-prose text-body text-fg-muted">
              Body — Nuzultrip membangun hubungan jangka panjang dengan investor melalui informasi
              yang transparan dan terukur. Berjalan bersama dan berkembang bersama.
            </p>
            <p className="text-body-sm text-fg-muted">Body SM — teks pendukung.</p>
            <p className="text-caption text-fg-subtle">Caption — metadata dan keterangan.</p>
            <p className="font-mono tabular text-body-sm text-fg">1.234.567,89 · NTI-2026-0142</p>
          </Stack>
        </Block>

        {/* ----------------------------------------------------------- buttons */}
        <Block title="Tombol" description="Emas tidak pernah menjadi isian tombol aksi biasa.">
          <Stack gap={4}>
            <Inline>
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="link">Link</Button>
            </Inline>
            <Inline>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Tambah">
                <Plus aria-hidden="true" />
              </Button>
            </Inline>
            <Inline>
              <Button>
                <Plus aria-hidden="true" />
                Dengan ikon
              </Button>
              <Button loading>Menyimpan</Button>
              <Button disabled>Nonaktif</Button>
              <Button
                variant="secondary"
                loading={loading}
                onClick={() => {
                  setLoading(true)
                  setTimeout(() => setLoading(false), 1200)
                }}
              >
                Coba status memuat
              </Button>
            </Inline>
          </Stack>
        </Block>

        {/* ------------------------------------------------------------- forms */}
        <Block title="Formulir" description="Label, petunjuk, dan pesan galat selalu terhubung ke kontrolnya.">
          <Grid min="18rem" gap={5}>
            <Field label="Nama lengkap" hint="Sesuai dokumen identitas." required>
              <Input placeholder="Nama lengkap" />
            </Field>
            <Field label="Surel" error="Format surel tidak valid.">
              <Input type="email" defaultValue="bukan-surel" />
            </Field>
            <Field label="Jumlah komitmen" hint="Dalam rupiah.">
              <Input inputMode="numeric" defaultValue="250000000" />
            </Field>
            <Field label="Jenis investor">
              <Select defaultValue="individual">
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Perorangan</SelectItem>
                  <SelectItem value="institution">Institusi</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Catatan" hint="Opsional." className="sm:col-span-2">
              <Textarea placeholder="Sampaikan hal yang perlu kami ketahui…" />
            </Field>
            <Field label="Pencarian">
              <SearchInput placeholder="Cari investor…" />
            </Field>
            <Field label="Nonaktif" disabled>
              <Input defaultValue="Tidak dapat diubah" />
            </Field>
          </Grid>

          <Separator className="my-2" />

          <Stack gap={1}>
            <ChoiceRow
              htmlFor="ds-check"
              control={<Checkbox id="ds-check" defaultChecked />}
              label="Kirim pemberitahuan surel"
              hint="Untuk laporan dan pembaruan penting."
            />
            <ChoiceRow
              htmlFor="ds-check-2"
              control={<Checkbox id="ds-check-2" checked="indeterminate" />}
              label="Sebagian terpilih"
            />
            <RadioGroup defaultValue="quarterly" className="flex flex-col">
              <ChoiceRow
                htmlFor="ds-radio-1"
                control={<Radio id="ds-radio-1" value="monthly" />}
                label="Bulanan"
              />
              <ChoiceRow
                htmlFor="ds-radio-2"
                control={<Radio id="ds-radio-2" value="quarterly" />}
                label="Kuartalan"
              />
            </RadioGroup>
            <ChoiceRow
              htmlFor="ds-switch"
              control={<Switch id="ds-switch" defaultChecked />}
              label="Aktifkan sinkronisasi langsung"
            />
          </Stack>
        </Block>

        {/* ------------------------------------------------------------ status */}
        <Block title="Status domain" description="Warna selalu disertai label — makna tidak pernah bergantung pada warna saja.">
          <Stack gap={4}>
            <Inline gap={2}>
              {INVESTOR_STATUSES.map((status) => (
                <InvestorStatusPill key={status} status={status} />
              ))}
            </Inline>
            <Inline gap={2}>
              {PUBLICATION_STATUSES.map((status) => (
                <PublicationBadge key={status} status={status} />
              ))}
            </Inline>
            <Inline gap={2}>
              {VISIBILITIES.map((visibility) => (
                <VisibilityBadge key={visibility} visibility={visibility} />
              ))}
            </Inline>
            <Inline gap={2}>
              {FINANCIAL_SOURCES.map((source) => (
                <ProvenanceTag key={source} source={source} />
              ))}
            </Inline>
            <Inline gap={2}>
              <Badge>Neutral</Badge>
              <Badge tone="primary">Primary</Badge>
              <Badge tone="accent">Accent</Badge>
              <Badge tone="success">Success</Badge>
              <Badge tone="warning">Warning</Badge>
              <Badge tone="danger">Danger</Badge>
              <Badge tone="info">Info</Badge>
            </Inline>
          </Stack>
        </Block>

        {/* ------------------------------------------------------------ alerts */}
        <Block title="Peringatan dan notifikasi">
          <Stack gap={3}>
            <Alert tone="info" title="Informasi">
              Laporan keuangan kuartalan diterbitkan setiap tanggal 15.
            </Alert>
            <Alert tone="success" title="Berhasil disimpan">
              Perubahan profil perusahaan telah tersimpan sebagai draf.
            </Alert>
            <Alert tone="warning" title="Menunggu peninjauan">
              Dokumen ini belum disetujui dan tidak terlihat oleh investor.
            </Alert>
            <Alert
              tone="danger"
              title="Gagal menerbitkan"
              action={
                <Button size="sm" variant="secondary">
                  Coba lagi
                </Button>
              }
            >
              Versi ini belum disetujui oleh peninjau kedua.
            </Alert>
            <Inline>
              <Button
                variant="secondary"
                onClick={() => push({ tone: 'success', title: 'Tersimpan', description: 'Draf diperbarui.' })}
              >
                Toast sukses
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  push({ tone: 'danger', title: 'Gagal memuat', description: 'Kode referensi: 8f3c-21ab.' })
                }
              >
                Toast galat
              </Button>
            </Inline>
            <OfflineBanner />
          </Stack>
        </Block>

        {/* ------------------------------------------------------------- cards */}
        <Block title="Kartu dan data">
          <Grid min="15rem" gap={4}>
            <StatCard
              label="Investor aktif"
              value="128"
              context="per 14 Agu 2026"
              delta={<DeltaValue ratio={0.062} />}
              icon={<Users aria-hidden="true" className="size-4" />}
            />
            <StatCard
              label="Menunggu peninjauan"
              value="7"
              context="antrean persetujuan"
              icon={<FileText aria-hidden="true" className="size-4" />}
            />
            <StatCard
              label="Dokumen terbit"
              value="42"
              context="seluruh kategori"
              delta={<DeltaValue ratio={-0.014} invertSentiment />}
              icon={<Building2 aria-hidden="true" className="size-4" />}
            />
          </Grid>

          <Grid min="18rem" gap={4}>
            <Card>
              <CardHeader>
                <CardTitle>Kartu standar</CardTitle>
                <CardDescription>Permukaan dengan garis tepi setebal satu piksel.</CardDescription>
              </CardHeader>
              <CardBody>
                <DetailList>
                  <DetailRow label="Kode investor">
                    <span className="font-mono">NTI-2026-0142</span>
                  </DetailRow>
                  <DetailRow label="Status">
                    <InvestorStatusPill status="active" />
                  </DetailRow>
                  <DetailRow label="Komitmen">
                    <MoneyValue amount="250000000" />
                  </DetailRow>
                  <DetailRow label="Selisih">
                    <MoneyValue amount="-12500000" />
                  </DetailRow>
                </DetailList>
              </CardBody>
              <CardFooter>
                <Button size="sm">Lihat profil</Button>
                <Button size="sm" variant="ghost">
                  <Download aria-hidden="true" />
                  Unduh
                </Button>
              </CardFooter>
            </Card>

            <Card variant="raised">
              <CardHeader>
                <CardTitle>Kartu terangkat</CardTitle>
                <CardDescription>Dipakai untuk panel fokus dan lapisan atas.</CardDescription>
              </CardHeader>
              <CardBody>
                <Inline>
                  <Avatar name="Aisyah Rahmawati" />
                  <div className="flex flex-col">
                    <span className="text-body-sm text-fg">Aisyah Rahmawati</span>
                    <span className="text-caption text-fg-subtle">Hubungan Investor</span>
                  </div>
                </Inline>
              </CardBody>
            </Card>
          </Grid>
        </Block>

        {/* ------------------------------------------------------------- table */}
        <Block title="Tabel" description="Di bawah breakpoint md tabel berubah menjadi kartu bertumpuk, bukan tabel yang bergeser ke samping.">
          <DataTable
            columns={DEMO_COLUMNS}
            rows={DEMO_ROWS}
            rowKey={(row) => row.id}
            caption="Contoh daftar investor"
            empty={<EmptyState title="Belum ada investor" />}
          />
          <Pagination page={3} pageCount={12} totalItems={238} buildHref={(page) => `?page=${page}`} />
        </Block>

        {/* ------------------------------------------------------------ states */}
        <Block title="Keadaan" description="Setiap layar memiliki keadaan kosong, memuat, galat, dan tanpa akses yang dirancang.">
          <Grid min="20rem" gap={4}>
            <EmptyState
              title="Belum ada laporan keuangan"
              description="Laporan akan muncul di sini setelah tim keuangan menerbitkannya untuk periode berjalan."
              action={<Button size="sm">Buat laporan</Button>}
            />
            <NoResultsState
              query="kuartal"
              onReset={
                <Button size="sm" variant="secondary">
                  Hapus filter
                </Button>
              }
            />
            <ErrorState
              correlationId="8f3c-21ab-77de"
              action={
                <Button size="sm" variant="secondary">
                  Muat ulang
                </Button>
              }
            />
            <ForbiddenState />
            <Card padding="none">
              <LoadingState />
            </Card>
            <Card>
              <TableSkeleton rows={3} />
            </Card>
          </Grid>
          <Inline gap={4}>
            <Skeleton className="h-10 w-40" />
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 w-64" />
          </Inline>
        </Block>

        {/* ----------------------------------------------------------- overlay */}
        <Block title="Lapisan dan navigasi">
          <Inline>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Buka dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nonaktifkan investor</DialogTitle>
                  <DialogDescription>
                    Investor tidak akan dapat mengakses materi apa pun. Riwayat dan dokumen tetap
                    tersimpan dan dapat diaktifkan kembali.
                  </DialogDescription>
                </DialogHeader>
                <Field label="Alasan" required>
                  <Textarea rows={3} />
                </Field>
                <DialogFooter>
                  <Button variant="secondary">Batal</Button>
                  <Button variant="danger">
                    <Trash2 aria-hidden="true" />
                    Nonaktifkan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">Menu tindakan</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Tindakan</DropdownMenuLabel>
                <DropdownMenuItem>
                  <FileText aria-hidden="true" />
                  Lihat detail
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download aria-hidden="true" />
                  Unduh dokumen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive>
                  <Trash2 aria-hidden="true" />
                  Nonaktifkan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost">Arahkan kursor</Button>
              </TooltipTrigger>
              <TooltipContent>Angka internal, belum diaudit.</TooltipContent>
            </Tooltip>

            <span className="text-caption text-fg-subtle">
              Palet perintah: <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>
            </span>
          </Inline>

          <Tabs defaultValue="ringkasan">
            <TabsList>
              <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
              <TabsTrigger value="dokumen">Dokumen</TabsTrigger>
              <TabsTrigger value="riwayat">Riwayat</TabsTrigger>
              <TabsTrigger value="pesan">Pesan</TabsTrigger>
            </TabsList>
            <TabsContent value="ringkasan">
              <p className="text-body-sm text-fg-muted">Konten tab ringkasan.</p>
            </TabsContent>
            <TabsContent value="dokumen">
              <p className="text-body-sm text-fg-muted">Konten tab dokumen.</p>
            </TabsContent>
            <TabsContent value="riwayat">
              <p className="text-body-sm text-fg-muted">Konten tab riwayat.</p>
            </TabsContent>
            <TabsContent value="pesan">
              <p className="text-body-sm text-fg-muted">Konten tab pesan.</p>
            </TabsContent>
          </Tabs>
        </Block>

        {/* ---------------------------------------------------------- geometry */}
        <Block
          title="Sistem geometri"
          description="Identitas Islami diungkapkan melalui struktur — proporsi, tesselasi, dan simetri radial — bukan melalui ikonografi tempel."
        >
          <Inline gap={6}>
            <KhatimStar className="size-10 text-primary" />
            <KhatimStar variant="filled" className="size-10 text-accent-solid" />
            <KhatimSpinner className="text-primary" />
          </Inline>
          <TessellationBand />
          <div className="relative overflow-hidden rounded-lg bg-inverse p-10">
            <GeometricField className="text-fg-inverse" />
            <div className="relative flex flex-col gap-2">
              <Overline tone="accent">Permukaan gelap</Overline>
              <p className="font-display text-display-lg text-fg-inverse">
                Berjalan bersama dan berkembang bersama.
              </p>
            </div>
          </div>
        </Block>
      </Stack>
    </Container>
  )
}
