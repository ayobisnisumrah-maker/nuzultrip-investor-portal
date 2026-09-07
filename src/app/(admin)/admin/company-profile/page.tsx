import type { Metadata } from 'next'
import { Building2, History, ImageIcon } from 'lucide-react'

import { CompanyLogoEditor } from '@/features/admin/company-logo-editor'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatDateTime } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { DetailList, DetailRow } from '@/ui/data'
import { PageHeader, Stack } from '@/ui/layout'
import { EmptyState } from '@/ui/states'

export const metadata: Metadata = { title: 'Profil Perusahaan' }

type BrandLogoSetting = {
  public_url?: string
  original_filename?: string
  updated_at?: string
}

export default async function CompanyProfilePage() {
  const principal = await adminWithPermission('company_profile.view', '/admin/company-profile')
  if (!principal) {
    return (
      <Alert tone="info" title="Akses terbatas">
        Anda tidak memiliki izin untuk melihat Profil Perusahaan.
      </Alert>
    )
  }

  const supabase = await getServerSupabase()
  const [{ data: profiles, error: profileError }, { data: logoSetting }] = await Promise.all([
    supabase
      .from('company_profiles')
      .select('id, slug, legal_name, display_name, status, current_version_id, published_version_id, created_at, updated_at')
      .order('updated_at', { ascending: false }),
    supabase
      .from('site_settings')
      .select('value, updated_at')
      .eq('key', 'brand.logo')
      .maybeSingle(),
  ])

  if (profileError) {
    return (
      <Alert tone="danger" title="Profil perusahaan tidak dapat dimuat">
        Sistem gagal mengambil data profil perusahaan.
      </Alert>
    )
  }

  const logo = logoSetting?.value && typeof logoSetting.value === 'object' && !Array.isArray(logoSetting.value)
    ? (logoSetting.value as BrandLogoSetting)
    : null
  const rows = profiles ?? []
  const versionIds = [...new Set(rows.flatMap((item) => [item.current_version_id, item.published_version_id]).filter((id): id is string => Boolean(id)))]
  const { data: versions } = versionIds.length
    ? await supabase
        .from('company_profile_versions')
        .select('id, company_profile_id, version_number, status, change_note, approved_at, published_at, created_at')
        .in('id', versionIds)
    : { data: [] }
  const versionMap = new Map((versions ?? []).map((item) => [item.id, item]))

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Perusahaan"
        title="Profil Perusahaan"
        description="Kelola identitas brand perusahaan dan pantau lifecycle profil yang digunakan oleh portal investor. Logo resmi dapat diganti langsung dari halaman ini."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="size-5" aria-hidden="true" />
            Logo perusahaan
          </CardTitle>
        </CardHeader>
        <CardBody>
          <CompanyLogoEditor
            initialUrl={logo?.public_url ?? null}
            initialFileName={logo?.original_filename ?? null}
            canUpdate={principal.permissions.has('company_profile.update')}
          />
          {logoSetting?.updated_at ? (
            <p className="text-caption text-fg-subtle mt-4">Terakhir diperbarui {formatDateTime(logoSetting.updated_at)}</p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5" aria-hidden="true" />
            Identitas perusahaan
          </CardTitle>
        </CardHeader>
        <CardBody>
          {!rows.length ? (
            <EmptyState
              title="Belum ada profil perusahaan berversi"
              description="Database profil perusahaan belum memiliki record. Logo tetap dapat dikelola secara terpisah tanpa membuat data profil contoh."
            />
          ) : (
            <div className="grid gap-4">
              {rows.map((profile) => {
                const current = profile.current_version_id ? versionMap.get(profile.current_version_id) : undefined
                const published = profile.published_version_id ? versionMap.get(profile.published_version_id) : undefined
                return (
                  <div key={profile.id} className="border-border bg-canvas rounded-xl border p-5">
                    <DetailList>
                      <DetailRow label="Nama tampilan">{profile.display_name}</DetailRow>
                      <DetailRow label="Nama legal">{profile.legal_name}</DetailRow>
                      <DetailRow label="Slug"><span className="font-mono">{profile.slug}</span></DetailRow>
                      <DetailRow label="Status">{profile.status}</DetailRow>
                      <DetailRow label="Versi aktif">{current ? `v${current.version_number} · ${current.status}` : '—'}</DetailRow>
                      <DetailRow label="Versi terbit">{published ? `v${published.version_number} · ${published.status}` : 'Belum diterbitkan'}</DetailRow>
                      <DetailRow label="Diperbarui">{formatDateTime(profile.updated_at)}</DetailRow>
                    </DetailList>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-5" aria-hidden="true" />
            Lifecycle profil
          </CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-body-sm text-fg-muted">
            Perubahan identitas perusahaan yang bersifat konten tetap mengikuti mekanisme versi, review, approval, dan publish. Asset logo dikelola langsung agar penggantian brand tidak memerlukan perubahan source code.
          </p>
        </CardBody>
      </Card>
    </Stack>
  )
}
