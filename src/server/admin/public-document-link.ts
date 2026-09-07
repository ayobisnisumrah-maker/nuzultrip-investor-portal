import 'server-only'

import { getServiceRoleClient } from '@/server/admin/service-client'

/**
 * Mint a short-lived URL for an already-authorised public document asset.
 *
 * IMPORTANT: this function bypasses RLS only for the storage-signing step. The
 * caller must first prove access to the owning published document with the
 * request-scoped client and write an audit record before calling this broker.
 */
export async function createPublicDocumentSignedUrl(fileAssetId: string): Promise<string | null> {
  const service = getServiceRoleClient()

  // RLS cannot mint a signed URL for our private document buckets. This lookup
  // is intentionally service-role only after the owning document/version has
  // already been authorised by the caller.
  const { data: asset, error: assetError } = await service
    .from('media_assets')
    .select('bucket, path, finalized_at')
    .eq('id', fileAssetId)
    .maybeSingle()

  if (assetError) {
    throw new Error(`Failed to resolve public document asset: ${assetError.message}`)
  }

  if (!asset || !asset.finalized_at) return null

  const { data, error } = await service.storage.from(asset.bucket).createSignedUrl(asset.path, 60)

  if (error) {
    throw new Error(`Failed to create public document signed URL: ${error.message}`)
  }

  return data.signedUrl
}
