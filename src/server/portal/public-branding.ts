import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export async function getPublicBrandLogo(): Promise<string | null> {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'brand.logo')
    .eq('is_public', true)
    .maybeSingle()

  if (error || !data?.value || typeof data.value !== 'object' || Array.isArray(data.value)) {
    return null
  }

  const url = (data.value as Record<string, unknown>).public_url
  return typeof url === 'string' && url.trim() ? url.trim() : null
}
