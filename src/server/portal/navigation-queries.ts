import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export type PortalNavigationItem = {
  id: string
  label: string
  href: string
  target: string
  location: 'header' | 'footer' | 'legal' | 'social'
  parent_id: string | null
  position: number
  icon: string | null
  is_visible: boolean
  created_at: string
  updated_at: string
}

export async function getPortalNavigationItems() {
  const supabase = await getServerSupabase()

  const { data, error } = await supabase
    .from('portal_navigation')
    .select(
      `
        id,
        label,
        href,
        target,
        location,
        parent_id,
        position,
        icon,
        is_visible,
        created_at,
        updated_at
      `,
    )
    .order('location', { ascending: true })
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Gagal memuat navigation portal: ${error.message}`)
  }

  return (data ?? []) as PortalNavigationItem[]
}
