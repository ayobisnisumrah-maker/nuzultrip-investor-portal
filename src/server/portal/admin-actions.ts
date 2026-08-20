'use server'

import { z } from 'zod'

import { ForbiddenError, NotFoundError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'

const sectionKind = z.enum([
  'hero_3d', 'intro', 'vision_mission', 'business_overview', 'growth_story',
  'ecosystem', 'investment_info', 'milestones', 'strategic_direction',
  'financial_highlights', 'investor_updates', 'documents', 'contact_cta',
  'legal_notice', 'rich_content', 'stat_grid', 'logo_wall', 'faq',
])

const contentSchema = z.object({
  kind: sectionKind,
}).passthrough().refine((value) => JSON.stringify(value).length <= 100_000, 'Konten section terlalu besar.')

const createSectionSchema = z.object({
  pageId: z.uuid(),
  sectionKind,
})

const saveSectionSchema = z.object({
  sectionId: z.uuid(),
  content: contentSchema,
  changeNote: z.string().trim().max(500).optional().or(z.literal('')),
})

const pageTransitionSchema = z.object({
  pageId: z.uuid(),
})

export const createPortalSection = defineAction({
  access: { permission: 'portal.update' },
  input: createSectionSchema,
  audit: { action: 'portal.section.create', entityType: 'portal_section' },
  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') throw new ForbiddenError('Admin principal required.')

    const { data: page, error: pageError } = await supabase
      .from('portal_pages').select('id, title').eq('id', input.pageId).maybeSingle()
    if (pageError || !page) throw new NotFoundError('Halaman portal')

    const { data: last } = await supabase
      .from('portal_sections').select('position').eq('page_id', input.pageId)
      .order('position', { ascending: false }).limit(1).maybeSingle()

    const { data: section, error } = await supabase
      .from('portal_sections')
      .insert({ page_id: input.pageId, section_kind: input.sectionKind, position: (last?.position ?? -1) + 1 })
      .select('id, section_kind, position, status, is_visible')
      .single()

    if (error || !section) throw new Error(`Gagal membuat section: ${error?.message ?? 'unknown error'}`)

    const { data: version, error: versionError } = await supabase
      .from('portal_section_versions')
      .insert({ section_id: section.id, version_number: 1, status: 'draft', content: { kind: input.sectionKind } })
      .select('id, version_number, status')
      .single()

    if (versionError || !version) throw new Error(`Gagal membuat versi section: ${versionError?.message ?? 'unknown error'}`)

    const { error: linkError } = await supabase
      .from('portal_sections').update({ current_version_id: version.id }).eq('id', section.id)
    if (linkError) throw new Error(`Gagal menghubungkan versi section: ${linkError.message}`)

    audit({ entityId: section.id, summary: `Section ${input.sectionKind} dibuat pada halaman ${page.title}.` })
    return { sectionId: section.id }
  },
})

export const savePortalSection = defineAction({
  access: { permission: 'portal.update' },
  input: saveSectionSchema,
  audit: { action: 'portal.section.save', entityType: 'portal_section' },
  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') throw new ForbiddenError('Admin principal required.')

    const { data: section, error: sectionError } = await supabase
      .from('portal_sections')
      .select('id, page_id, section_kind, current_version_id')
      .eq('id', input.sectionId).maybeSingle()
    if (sectionError || !section) throw new NotFoundError('Section portal')

    if (input.content.kind !== section.section_kind) {
      throw new ForbiddenError('Jenis konten tidak sesuai dengan jenis section.')
    }

    const { data: latest } = await supabase
      .from('portal_section_versions').select('version_number')
      .eq('section_id', input.sectionId).order('version_number', { ascending: false }).limit(1).maybeSingle()

    const nextVersion = (latest?.version_number ?? 0) + 1
    const { data: version, error: versionError } = await supabase
      .from('portal_section_versions')
      .insert({ section_id: input.sectionId, version_number: nextVersion, status: 'draft', content: input.content, change_note: input.changeNote || null, created_by: principal.adminId })
      .select('id, version_number').single()

    if (versionError || !version) throw new Error(`Gagal menyimpan section: ${versionError?.message ?? 'unknown error'}`)

    const { error: linkError } = await supabase.from('portal_sections').update({ current_version_id: version.id }).eq('id', input.sectionId)
    if (linkError) throw new Error(`Gagal mengaktifkan draft terbaru: ${linkError.message}`)

    audit({ entityId: input.sectionId, summary: `Draft section disimpan sebagai versi ${version.version_number}.` })
    return { versionId: version.id, versionNumber: version.version_number }
  },
})

export const setPortalSectionVisibility = defineAction({
  access: { permission: 'portal.update' },
  input: z.object({ sectionId: z.uuid(), isVisible: z.boolean() }),
  audit: { action: 'portal.section.visibility', entityType: 'portal_section' },
  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') throw new ForbiddenError('Admin principal required.')
    const { error } = await supabase.from('portal_sections').update({ is_visible: input.isVisible }).eq('id', input.sectionId)
    if (error) throw new Error(`Gagal mengubah visibilitas section: ${error.message}`)
    audit({ entityId: input.sectionId, summary: `Visibilitas section diubah menjadi ${input.isVisible ? 'aktif' : 'nonaktif'}.` })
    return { ok: true }
  },
})

async function transitionPortalPage(
  pageId: string,
  target: 'review' | 'approved' | 'published' | 'archived' | 'draft',
  supabase: Parameters<Parameters<typeof defineAction>[0]['handler']>[0]['supabase'],
) {
  const { data, error } = await (supabase.schema('app') as typeof supabase).rpc('transition_portal_page' as never, {
    p_page_id: pageId,
    p_to_status: target,
  } as never)

  if (error) {
    throw new Error(`Gagal mengubah status portal: ${error.message}`)
  }

  const result = Array.isArray(data) ? data[0] : data
  if (!result) throw new Error('Perubahan status portal tidak menghasilkan data.')
  return result as { page_id: string; page_title: string; previous_status: string; status: string }
}

function definePortalTransitionAction(
  target: 'review' | 'approved' | 'published' | 'archived' | 'draft',
  action: string,
  summary: (title: string, from: string, to: string) => string,
) {
  return defineAction({
    access: { permission: target === 'draft' ? 'portal.update' : 'portal.publish' },
    input: pageTransitionSchema,
    audit: { action, entityType: 'portal_page' },
    handler: async ({ input, supabase, audit }) => {
      const result = await transitionPortalPage(input.pageId, target, supabase)
      audit({
        entityId: result.page_id,
        summary: summary(result.page_title, result.previous_status, result.status),
        changes: { status: { before: result.previous_status, after: result.status } },
      })
      return result
    },
  })
}

export const submitPortalPageForReview = definePortalTransitionAction(
  'review',
  'portal.page.review_started',
  (title) => `Halaman portal ${title} dikirim untuk peninjauan.`,
)

export const approvePortalPage = definePortalTransitionAction(
  'approved',
  'portal.page.approved',
  (title) => `Halaman portal ${title} disetujui.`,
)

export const publishPortalPage = definePortalTransitionAction(
  'published',
  'portal.page.published',
  (title) => `Halaman portal ${title} diterbitkan.`,
)

export const archivePortalPage = definePortalTransitionAction(
  'archived',
  'portal.page.archived',
  (title) => `Halaman portal ${title} diarsipkan.`,
)

export const returnPortalPageToDraft = definePortalTransitionAction(
  'draft',
  'portal.page.returned_to_draft',
  (title, from) => `Halaman portal ${title} dikembalikan dari ${from} menjadi draf.`,
)
