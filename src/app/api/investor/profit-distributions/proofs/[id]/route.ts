import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getPrincipal } from '@/server/auth/session'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { getServerSupabase } from '@/server/supabase/server'

const idSchema = z.string().uuid()

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const principal = await getPrincipal()
  if (principal.kind !== 'investor' || !principal.hasDataAccess) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
  }

  const { id } = await params
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: 'Bukti pembayaran tidak valid.' }, { status: 400 })
  }

  const supabase = await getServerSupabase()
  const { data: proof, error } = await supabase
    .from('profit_distribution_payment_proofs')
    .select('id, investor_id, storage_bucket, storage_path, original_file_name')
    .eq('id', id)
    .eq('investor_id', principal.investorId)
    .maybeSingle()

  if (error || !proof) {
    return NextResponse.json({ error: 'Bukti pembayaran tidak ditemukan.' }, { status: 404 })
  }

  const serviceClient = getServiceRoleClient()
  const { data: signed, error: signedError } = await serviceClient.storage
    .from(proof.storage_bucket)
    .createSignedUrl(proof.storage_path, 60, {
      download: proof.original_file_name,
    })

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Bukti pembayaran tidak dapat dibuka.' }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}
