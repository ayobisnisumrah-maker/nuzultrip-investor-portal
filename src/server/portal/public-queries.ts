import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export type PublicPortalSection = {
  id: string
  section_kind: string
  position: number
  anchor_id: string | null
  content: Record<string, unknown>
}

export async function getPublishedHomePage() {
  const supabase = await getServerSupabase()

  const { data: page, error: pageError } = await supabase
    .from('portal_pages')
    .select('id, slug, title, seo, published_at')
    .eq('slug', 'home')
    .eq('status', 'published')
    .maybeSingle()

  if (pageError) {
    throw new Error(`Failed to load published portal home: ${pageError.message}`)
  }

  if (!page) return null

  const { data: sections, error: sectionError } = await supabase
    .from('portal_sections')
    .select('id, section_kind, position, anchor_id, published_version_id')
    .eq('page_id', page.id)
    .eq('status', 'published')
    .eq('is_visible', true)
    .order('position', { ascending: true })

  if (sectionError) {
    throw new Error(`Failed to load published portal sections: ${sectionError.message}`)
  }

  const versionIds = (sections ?? [])
    .map((section) => section.published_version_id)
    .filter((id): id is string => Boolean(id))

  if (versionIds.length === 0) {
    return { page, sections: [] as PublicPortalSection[] }
  }

  const { data: versions, error: versionError } = await supabase
    .from('portal_section_versions')
    .select('id, content')
    .in('id', versionIds)

  if (versionError) {
    throw new Error(`Failed to load published portal content: ${versionError.message}`)
  }

  const contentById = new Map(
    (versions ?? []).map((version) => [version.id, version.content as Record<string, unknown>]),
  )

  return {
    page,
    sections: (sections ?? [])
      .filter(
        (section) => section.published_version_id && contentById.has(section.published_version_id),
      )
      .map((section) => ({
        id: section.id,
        section_kind: section.section_kind,
        position: section.position,
        anchor_id: section.anchor_id,
        content: contentById.get(section.published_version_id!) ?? {},
      })),
  }
}

export type PublicPortalNavigationItem = {
  id: string
  location: 'header' | 'footer' | 'legal' | 'social'
  label: string
  href: string
  target: string
  position: number
  parent_id: string | null
}

export async function getPublishedNavigation(): Promise<PublicPortalNavigationItem[]> {
  const supabase = await getServerSupabase()

  const { data, error } = await supabase
    .from('portal_navigation')
    .select('id, location, label, href, target, position, parent_id')
    .eq('is_visible', true)
    .order('location', { ascending: true })
    .order('position', { ascending: true })

  if (error) {
    throw new Error(`Failed to load portal navigation: ${error.message}`)
  }

  return data ?? []
}

export async function getActivePortalTheme() {
  const supabase = await getServerSupabase()

  const { data, error } = await supabase
    .from('portal_theme')
    .select(
      'name, logo_asset_id, logo_dark_asset_id, favicon_asset_id, og_image_asset_id, default_color_scheme',
    )
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load active portal theme: ${error.message}`)
  }

  return data
}
