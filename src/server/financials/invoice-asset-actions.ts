'use server'

import { revalidatePath } from 'next/cache'

import { hasPermission } from '@/core/auth/principal'
import { getPrincipal } from '@/server/auth/session'
import { getServerSupabase } from '@/server/supabase/server'

const BUCKET = 'finance-document-assets'
const MAX_BYTES = 5 * 1024 * 1024
const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

type InvoiceAssetKind = 'logo' | 'stamp' | 'signature'

function isInvoiceAssetKind(value: FormDataEntryValue | null): value is InvoiceAssetKind {
  return value === 'logo' || value === 'stamp' || value === 'signature'
}

export async function uploadInvoiceDocumentAsset(formData: FormData) {
  const principal = await getPrincipal()
  if (principal.kind !== 'admin' || !hasPermission(principal, 'financial_reports.update')) {
    return { ok: false as const, error: 'Anda tidak memiliki izin untuk mengubah aset invoice.' }
  }

  const kind = formData.get('kind')
  const file = formData.get('file')
  if (!isInvoiceAssetKind(kind) || !(file instanceof File)) {
    return { ok: false as const, error: 'Jenis aset atau file tidak valid.' }
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return { ok: false as const, error: 'Ukuran file harus lebih dari 0 dan maksimal 5 MB.' }
  }

  const extension = MIME_EXTENSION[file.type]
  if (!extension) {
    return { ok: false as const, error: 'Format file harus JPG, PNG, atau WebP.' }
  }

  const supabase = await getServerSupabase()
  const { data: settings, error: settingsError } = await supabase
    .from('finance_settings')
    .select('id, logo_asset_id, stamp_asset_id, signature_asset_id')
    .eq('singleton', true)
    .maybeSingle()

  if (settingsError || !settings) {
    return { ok: false as const, error: 'Simpan Pengaturan Invoice & Kasir terlebih dahulu.' }
  }

  const path = `invoice-assets/${kind}/${crypto.randomUUID()}.${extension}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  })
  if (uploadError) {
    return { ok: false as const, error: `Upload gagal: ${uploadError.message}` }
  }

  const { data: asset, error: assetError } = await supabase
    .from('media_assets')
    .insert({
      bucket: BUCKET,
      path,
      original_filename: file.name.slice(0, 255),
      mime_type: file.type,
      byte_size: file.size,
      visibility: 'internal',
      uploaded_by: principal.userId,
      finalized_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (assetError || !asset) {
    await supabase.storage.from(BUCKET).remove([path])
    return { ok: false as const, error: `Metadata aset gagal disimpan: ${assetError?.message ?? 'unknown error'}` }
  }

  const oldAssetId =
    kind === 'logo'
      ? settings.logo_asset_id
      : kind === 'stamp'
        ? settings.stamp_asset_id
        : settings.signature_asset_id

  const updatePayload =
    kind === 'logo'
      ? { logo_asset_id: asset.id }
      : kind === 'stamp'
        ? { stamp_asset_id: asset.id }
        : { signature_asset_id: asset.id }

  const { error: updateError } = await supabase
    .from('finance_settings')
    .update(updatePayload)
    .eq('id', settings.id)

  if (updateError) {
    await supabase.from('media_assets').delete().eq('id', asset.id)
    await supabase.storage.from(BUCKET).remove([path])
    return { ok: false as const, error: `Pengaturan aset gagal diperbarui: ${updateError.message}` }
  }

  if (oldAssetId && oldAssetId !== asset.id) {
    const { data: oldAsset } = await supabase
      .from('media_assets')
      .select('id, bucket, path, uploaded_by')
      .eq('id', oldAssetId)
      .maybeSingle()

    if (oldAsset?.bucket === BUCKET && oldAsset.uploaded_by === principal.userId) {
      await supabase.storage.from(BUCKET).remove([oldAsset.path])
      await supabase.from('media_assets').delete().eq('id', oldAsset.id)
    }
  }

  revalidatePath('/admin/financials/cashier')
  return { ok: true as const, assetId: asset.id }
}
