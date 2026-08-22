import type { SupabaseClient } from '@supabase/supabase-js'

const PAYMENT_PROOF_BUCKET = 'profit-distribution-proofs'

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const

const MAX_FILE_SIZE = 10 * 1024 * 1024

type PaymentProofRow = {
  id: string
  allocation_id: string
  investor_id: string
  storage_bucket: string
  storage_path: string
  original_file_name: string
  mime_type: string
  file_size_bytes: number
  payment_reference: string | null
  uploaded_by: string | null
  uploaded_at: string
  updated_at: string
}

export type PaymentProof = PaymentProofRow

type AllocationRow = {
  id: string
  investor_id: string
  allocation_amount: number | string
  status: string
}

type DbClient = SupabaseClient

function sanitizeFileName(fileName: string): string {
  const normalized = fileName
    .normalize('NFKC')
    .replace(/[/\\]/g, '-')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || 'payment-proof'
}

function assertAllowedFile(file: File): void {
  if (!ALLOWED_MIME_TYPES.some((mimeType) => mimeType === file.type)) {
    throw new Error('Format bukti transfer harus PDF, JPEG, PNG, atau WebP.')
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    throw new Error('Ukuran bukti transfer harus lebih dari 0 dan maksimal 10 MB.')
  }
}

async function getAllocation(supabase: DbClient, allocationId: string): Promise<AllocationRow> {
  const { data, error } = await supabase
    .from('profit_distribution_allocations')
    .select(
      `
        id,
        investor_id,
        allocation_amount,
        status
      `,
    )
    .eq('id', allocationId)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal mengambil allocation pembayaran: ${error.message}`)
  }

  if (!data) {
    throw new Error('Allocation pembayaran tidak ditemukan.')
  }

  return data
}

export async function getPaymentProof(
  supabase: DbClient,
  allocationId: string,
): Promise<PaymentProof | null> {
  const { data, error } = await supabase
    .from('profit_distribution_payment_proofs')
    .select(
      `
        id,
        allocation_id,
        investor_id,
        storage_bucket,
        storage_path,
        original_file_name,
        mime_type,
        file_size_bytes,
        payment_reference,
        uploaded_by,
        uploaded_at,
        updated_at
      `,
    )
    .eq('allocation_id', allocationId)
    .maybeSingle()

  if (error) {
    throw new Error(`Gagal mengambil bukti transfer: ${error.message}`)
  }

  return data
}

export async function uploadPaymentProof({
  supabase,
  allocationId,
  uploadedBy,
  file,
  paymentReference,
}: {
  supabase: DbClient
  allocationId: string
  uploadedBy: string
  file: File
  paymentReference?: string | null
}): Promise<PaymentProof> {
  assertAllowedFile(file)

  const allocation = await getAllocation(supabase, allocationId)

  if (allocation.status !== 'payable') {
    throw new Error('Bukti transfer hanya dapat diunggah untuk allocation dengan status payable.')
  }

  const existingProof = await getPaymentProof(supabase, allocationId)

  if (existingProof) {
    throw new Error('Bukti transfer untuk investor ini sudah tersedia. Gunakan aksi ganti bukti.')
  }

  const safeFileName = sanitizeFileName(file.name)

  const storagePath = [
    allocation.investor_id,
    allocation.id,
    `${crypto.randomUUID()}-${safeFileName}`,
  ].join('/')

  const { error: uploadError } = await supabase.storage
    .from(PAYMENT_PROOF_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Gagal mengunggah bukti transfer: ${uploadError.message}`)
  }

  const { data, error } = await supabase
    .from('profit_distribution_payment_proofs')
    .insert({
      allocation_id: allocation.id,
      investor_id: allocation.investor_id,
      storage_bucket: PAYMENT_PROOF_BUCKET,
      storage_path: storagePath,
      original_file_name: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
      payment_reference: paymentReference?.trim() || null,
      uploaded_by: uploadedBy,
    })
    .select(
      `
        id,
        allocation_id,
        investor_id,
        storage_bucket,
        storage_path,
        original_file_name,
        mime_type,
        file_size_bytes,
        payment_reference,
        uploaded_by,
        uploaded_at,
        updated_at
      `,
    )
    .single()

  if (error) {
    await supabase.storage.from(PAYMENT_PROOF_BUCKET).remove([storagePath])

    throw new Error(`Gagal menyimpan metadata bukti transfer: ${error.message}`)
  }

  return data
}

export async function createPaymentProofSignedUrl(
  supabase: DbClient,
  proof: PaymentProof,
  expiresInSeconds = 300,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(proof.storage_bucket)
    .createSignedUrl(proof.storage_path, expiresInSeconds)

  if (error || !data?.signedUrl) {
    throw new Error(
      `Gagal membuat URL bukti transfer: ${error?.message ?? 'Signed URL tidak tersedia.'}`,
    )
  }

  return data.signedUrl
}
