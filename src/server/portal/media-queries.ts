import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export async function listPortalMediaAssets() {
  const supabase = await getServerSupabase()

  const { data, error } = await supabase
    .from('media_assets')
    .select(
      'id, original_filename, mime_type, byte_size, visibility, alt_text, caption, width, height, finalized_at, created_at',
    )
    .not('finalized_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    throw new Error(`Gagal memuat pustaka media: ${error.message}`)
  }

  return data ?? []
}
