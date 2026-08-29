import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export type PortalPageStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'published'
  | 'archived'

export async function listPortalPages(options?: {
  status?: PortalPageStatus
}) {
  const supabase = await getServerSupabase()

  let query = supabase
    .from('portal_pages')
    .select(
      'id, slug, title, page_kind, status, position, is_system, published_at, created_at, updated_at',
    )
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Gagal memuat halaman portal: ${error.message}`)
  }

  return data ?? []
}

export async function listArchivedPortalPages() {
  return listPortalPages({ status: 'archived' })
}

export async function getPortalPage(id: string) {
  const supabase = await getServerSupabase()

  const { data, error } = await supabase
    .from('portal_pages')
    .select(
      'id, slug, title, page_kind, status, position, is_system, seo, published_at, created_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal memuat halaman portal: ${error.message}`)
  }

  return data
}

export async function listPortalPageSections(pageId: string) {
  const supabase = await getServerSupabase()

  const { data: sections, error } = await supabase
    .from('portal_sections')
    .select(
      'id, section_kind, position, is_visible, anchor_id, status, current_version_id, published_version_id',
    )
    .eq('page_id', pageId)
    .order('position', { ascending: true })

  if (error) {
    throw new Error(`Gagal memuat bagian portal: ${error.message}`)
  }

  if (!sections?.length) {
    return []
  }

  const versionIds = sections
    .map((section) => section.current_version_id)
    .filter((id): id is string => Boolean(id))

  const { data: versions, error: versionError } = versionIds.length
    ? await supabase
        .from('portal_section_versions')
        .select(
          'id, version_number, status, content, change_note, created_at',
        )
        .in('id', versionIds)
    : { data: [], error: null }

  if (versionError) {
    throw new Error(
      `Gagal memuat versi bagian portal: ${versionError.message}`,
    )
  }

  const byId = new Map(
    (versions ?? []).map((version) => [version.id, version]),
  )

  return sections.map((section) => ({
    ...section,
    current_version: section.current_version_id
      ? (byId.get(section.current_version_id) ?? null)
      : null,
  }))
}
