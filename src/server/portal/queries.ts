import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export async function listPortalPages() {
  const supabase = await getServerSupabase()

  const { data, error } = await supabase
    .from('portal_pages')
    .select(
      'id, slug, title, page_kind, status, position, is_system, published_at, created_at, updated_at',
    )
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to load portal pages: ${error.message}`)
  }

  return data ?? []
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
    throw new Error(`Failed to load portal page: ${error.message}`)
  }

  return data
}
