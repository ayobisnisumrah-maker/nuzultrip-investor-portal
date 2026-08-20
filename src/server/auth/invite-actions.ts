'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { getServerSupabase } from '@/server/supabase/server'

const acceptInviteSchema = z.object({
  tokenHash: z.string().min(1).max(1024),
})

export async function acceptInvite(formData: FormData) {
  const parsed = acceptInviteSchema.safeParse({
    tokenHash: formData.get('tokenHash'),
  })

  if (!parsed.success) {
    redirect('/masuk?galat=tautan_tidak_valid')
  }

  const supabase = await getServerSupabase()

  const { error } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.tokenHash,
    type: 'invite',
  })

  if (error) {
    redirect(
      `/masuk?galat=${encodeURIComponent(
        'Tautan undangan sudah kedaluwarsa atau tidak valid. Silakan minta undangan baru.',
      )}`,
    )
  }

  redirect('/atur-sandi')
}