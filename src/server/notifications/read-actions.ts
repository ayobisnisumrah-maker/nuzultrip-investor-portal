'use server'

import { revalidatePath } from 'next/cache'

import { getPrincipal } from '@/server/auth/session'
import { getServerSupabase } from '@/server/supabase/server'

export async function markAllNotificationsRead() {
  const principal = await getPrincipal()

  if (principal.kind !== 'investor') {
    throw new Error('Akses investor diperlukan.')
  }

  const supabase = await getServerSupabase()
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', principal.userId)
    .is('read_at', null)

  if (error) {
    throw new Error(`Gagal menandai notifikasi sebagai dibaca: ${error.message}`)
  }

  revalidatePath('/investor/notifications')
}
