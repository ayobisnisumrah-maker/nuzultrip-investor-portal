import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export const DEFAULT_BRAND_NAME = 'Nuzultrip Equity Relations'

export type BrandSettings = {
  name: string
}

export async function getBrandSettings(): Promise<BrandSettings> {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'brand.name')
    .eq('is_public', true)
    .maybeSingle()

  if (error) throw new Error(`Gagal memuat nama aplikasi: ${error.message}`)

  const value = data?.value
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { name: DEFAULT_BRAND_NAME }
  }

  const name = (value as Record<string, unknown>).name
  return {
    name: typeof name === 'string' && name.trim() ? name.trim() : DEFAULT_BRAND_NAME,
  }
}

export async function getPublicBrandName(): Promise<string> {
  return (await getBrandSettings()).name
}
