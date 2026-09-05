import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export type PublicPortalSection = {
  id: string
  section_kind: string
  position: number
  anchor_id: string | null
  content: Record<string, unknown>
}

function isNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

function isNonEmptyArray(value: unknown) {
  return Array.isArray(value) && value.length > 0
}

function hasMeaningfulContent(sectionKind: string, content: Record<string, unknown>) {
  if (sectionKind === 'hero_3d') {
    return isNonEmptyString(content.title) || isNonEmptyString(content.description)
  }

  if (sectionKind === 'intro') {
    return isNonEmptyString(content.title) || isNonEmptyString(content.description)
  }

  if (sectionKind === 'vision_mission') {
    return isNonEmptyString(content.vision) || isNonEmptyArray(content.mission)
  }

  if (sectionKind === 'business_overview' || sectionKind === 'ecosystem' || sectionKind === 'investor_updates') {
    return (
      isNonEmptyString(content.title) ||
      isNonEmptyString(content.description) ||
      isNonEmptyArray(content.items)
    )
  }

  if (sectionKind === 'growth_story') {
    return (
      isNonEmptyString(content.title) ||
      isNonEmptyString(content.description) ||
      isNonEmptyArray(content.milestones)
    )
  }

  if (sectionKind === 'milestones') {
    return isNonEmptyString(content.title) || isNonEmptyArray(content.items)
  }

  if (sectionKind === 'strategic_direction') {
    return (
      isNonEmptyString(content.title) ||
      isNonEmptyString(content.description) ||
      isNonEmptyArray(content.pillars)
    )
  }

  if (sectionKind === 'financial_highlights' || sectionKind === 'stat_grid') {
    return (
      isNonEmptyString(content.title) ||
      isNonEmptyString(content.description) ||
      isNonEmptyArray(content.metrics)
    )
  }

  if (sectionKind === 'documents' || sectionKind === 'faq') {
    return isNonEmptyString(content.title) || isNonEmptyArray(content.items)
  }

  if (sectionKind === 'logo_wall') {
    return isNonEmptyString(content.title) || isNonEmptyArray(content.logos)
  }

  if (sectionKind === 'contact_cta') {
    return (
      isNonEmptyString(content.title) ||
      isNonEmptyString(content.description) ||
      isNonEmptyString(content.primary_cta_label)
    )
  }

  if (sectionKind === 'legal_notice' || sectionKind === 'rich_content') {
    return isNonEmptyString(content.title) || isNonEmptyString(content.content)
  }

  if (sectionKind === 'investment_info') {
    return (
      isNonEmptyString(content.title) ||
      isNonEmptyString(content.description) ||
      isNonEmptyString(content.funding_target) ||
      isNonEmptyArray(content.use_of_funds)
    )
  }

  return Object.keys(content).some((key) => key !== 'kind')
}

async function loadPublishedPortalPage(slug: string) {
  const supabase = await getServerSupabase()

  /*
   * A page that has already been published remains publicly available while a
   * replacement revision moves through draft/review/approval. `published_at`
   * is retained by the live-revision lifecycle and cleared only on archive.
   */
  const { data: page, error: pageError } = await supabase
    .from('portal_pages')
    .select('id, slug, title, seo, published_at, status')
    .eq('slug', slug)
    .not('published_at', 'is', null)
    .neq('status', 'archived')
    .maybeSingle()

  if (pageError) {
    throw new Error(`Failed to load published portal page: ${pageError.message}`)
  }

  if (!page) return null

  const { data: sections, error: sectionError } = await supabase
    .from('portal_sections')
    .select('id, section_kind, position, anchor_id, published_version_id')
    .eq('page_id', page.id)
    .eq('status', 'published')
    .eq('published_is_visible', true)
    .order('position', { ascending: true })

  if (sectionError) {
    throw new Error(`Failed to load published portal sections: ${sectionError.message}`)
  }

  const versionIds = (sections ?? [])
    .map((section) => section.published_version_id)
    .filter((id): id is string => Boolean(id))

  if (versionIds.length === 0) {
    return {
      page,
      sections: [] as PublicPortalSection[],
    }
  }

  const { data: versions, error: versionError } = await supabase
    .from('portal_section_versions')
    .select('id, content')
    .in('id', versionIds)

  if (versionError) {
    throw new Error(`Failed to load published portal content: ${versionError.message}`)
  }

  const contentById = new Map(
    (versions ?? []).map((version) => [
      version.id,
      version.content as Record<string, unknown>,
    ]),
  )

  const publishedSections = (sections ?? [])
    .filter(
      (section) =>
        section.published_version_id &&
        contentById.has(section.published_version_id),
    )
    .map((section) => ({
      id: section.id,
      section_kind: section.section_kind,
      position: section.position,
      anchor_id: section.anchor_id,
      content: contentById.get(section.published_version_id!) ?? {},
    }))
    .filter((section) => hasMeaningfulContent(section.section_kind, section.content))

  return {
    page,
    sections: publishedSections,
  }
}

export async function getPublishedHomePage() {
  return loadPublishedPortalPage('home')
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

export async function getPublishedPortalPageBySlug(slug: string) {
  return loadPublishedPortalPage(slug)
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
