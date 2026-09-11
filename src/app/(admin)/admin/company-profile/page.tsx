import type { Metadata } from 'next'
import { Building2, FileText, ImageIcon } from 'lucide-react'

import { CompanyLogoEditor } from '@/features/admin/company-logo-editor'
import { CompanyProfileIdentityEditor } from '@/features/admin/company-profile-identity-editor'
import { CompanyProfileVersionEditor } from '@/features/admin/company-profile-version-editor'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getServerSupabase } from '@/server/supabase/server'
import { formatDateTime } from '@/lib/format'
import { Alert } from '@/ui/alert'
import { Card, CardBody, CardHeader, CardTitle } from '@/ui/card'
import { DetailList, DetailRow } from '@/ui/data'
import { PageHeader, Stack } from '@/ui/layout'

export const metadata: Metadata = { title: 'Profil Perusahaan' }

type BrandLogoSetting = {
  public_url?: string
  original_filename?: string
  updated_at?: string
}

type ContentBlock = {
  text?: string
}

const EMPTY_BLOCKS = {
  legal_information: '',
  history: '',
  vision: '',
  mission: '',
  leadership: '',
  business_overview: '',
  business_ecosystem: '',
  strategic_direction: '',
  milestones: '',
  achievements: '',
  statistics: '',
  contact: '',
}

function blockText(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  const text = (value as ContentBlock).text
  return typeof text === 'string' ? text : ''
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

  const canUpdate = principal.permissions.has('company_profile.update')
  const canPublish = principal.permissions.has('company_profile.publish')
  const logo = logoSetting?.value && typeof logoSetting.value === 'object' && !Array.isArray(logoSetting.value)
    ? (logoSetting.value as BrandLogoSetting)
    : null
  const rows = profiles ?? []
  const versionIds = [...new Set(rows.flatMap((item) => [item.current_version_id, item.published_version_id]).filter((id): id is string => Boolean(id)))]
  const { data: versions } = versionIds.length
    ? await supabase
        .from('company_profile_versions')
        .select('id, company_profile_id, version_number, status, change_note, approved_at, published_at, created_at, legal_information, history, vision, mission, leadership, business_overview, business_ecosystem, strategic_direction, milestones, achievements, statistics, contact')
        .in('id', versionIds)
    : { data: [] }
  const versionMap = new Map((versions ?? []).map((item) => [item.id, item]))

  return (
    <Stack gap={8}>
      <PageHeader
        eyebrow="Perusahaan"
        title="Profil Perusahaan"
        description="Kelola identitas, logo, dan konten profil perusahaan dari satu tempat. Identitas dan logo tetap menjadi sumber kanonik; konten naratif memakai versi Draf → Ditinjau → Disetujui → Terbit agar perubahan publik dapat diaudit."
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
            canUpdate={canUpdate}
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
            <CompanyProfileIdentityEditor
              value={{ id: null, displayName: '', legalName: '', slug: 'nuzultrip' }}
              canUpdate={canUpdate}
            />
          ) : (
            <div className="grid gap-5">
              {rows.map((profile) => {
                const current = profile.current_version_id ? versionMap.get(profile.current_version_id) : undefined
                const published = profile.published_version_id ? versionMap.get(profile.published_version_id) : undefined
                return (
                  <div key={profile.id} className="border-border bg-canvas rounded-xl border p-5">
                    <CompanyProfileIdentityEditor
                      value={{
                        id: profile.id,
                        displayName: profile.display_name,
                        legalName: profile.legal_name,
                        slug: profile.slug,
                      }}
                      canUpdate={canUpdate}
                    />

                    <div className="border-border mt-6 border-t pt-5">
                      <DetailList>
                        <DetailRow label="Status">{profile.status}</DetailRow>
                        <DetailRow label="Versi aktif">{current ? `v${current.version_number} · ${current.status}` : '—'}</DetailRow>
                        <DetailRow label="Versi terbit">{published ? `v${published.version_number} · ${published.status}` : 'Belum diterbitkan'}</DetailRow>
                        <DetailRow label="Diperbarui">{formatDateTime(profile.updated_at)}</DetailRow>
                      </DetailList>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {rows.map((profile) => {
        const current = profile.current_version_id ? versionMap.get(profile.current_version_id) : undefined
        const published = profile.published_version_id ? versionMap.get(profile.published_version_id) : undefined
        const blocks = current
          ? {
              legal_information: blockText(current.legal_information),
              history: blockText(current.history),
              vision: blockText(current.vision),
              mission: blockText(current.mission),
              leadership: blockText(current.leadership),
              business_overview: blockText(current.business_overview),
              business_ecosystem: blockText(current.business_ecosystem),
              strategic_direction: blockText(current.strategic_direction),
              milestones: blockText(current.milestones),
              achievements: blockText(current.achievements),
              statistics: blockText(current.statistics),
              contact: blockText(current.contact),
            }
          : EMPTY_BLOCKS

        return (
          <Card key={`version-${profile.id}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" aria-hidden="true" />
                Konten profil berversi · {profile.display_name}
              </CardTitle>
            </CardHeader>
            <CardBody>
              <CompanyProfileVersionEditor
                profileId={profile.id}
                status={profile.status}
                versionNumber={current?.version_number ?? null}
                publishedVersionNumber={published?.version_number ?? null}
                initialBlocks={blocks}
                canUpdate={canUpdate}
                canPublish={canPublish}
              />
            </CardBody>
          </Card>
        )
      })}

      {!rows.length ? (
        <Alert tone="info" title="Konten berversi belum tersedia">
          Simpan identitas perusahaan terlebih dahulu. Setelah profil dibuat, blok legalitas, sejarah, visi, misi, bisnis, pencapaian, statistik, dan kontak dapat dikelola di halaman ini.
        </Alert>
      ) : null}
    </Stack>
  )
}
