import 'server-only'

import { NextResponse } from 'next/server'

import { hasPermission } from '@/core/auth/principal'
import { getPrincipal } from '@/server/auth/session'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { writeAudit } from '@/server/audit'
import { uploadPaymentProof } from '@/server/ownership/payment-proof-service'

export async function POST(request: Request) {
  const principal = await getPrincipal()

  if (principal.kind === 'anonymous') {
    return NextResponse.json(
      {
        error: 'Anda harus login.',
      },
      {
        status: 401,
      },
    )
  }

  if (
    principal.kind !== 'admin' ||
    !hasPermission(
      principal,
      'profit_distribution_payments.upload_proof',
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Anda tidak memiliki izin mengunggah bukti pembayaran.',
      },
      {
        status: 403,
      },
    )
  }

  let formData: FormData

  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      {
        error:
          'Request multipart/form-data tidak valid.',
      },
      {
        status: 400,
      },
    )
  }

  const allocationIdValue =
    formData.get('allocationId')

  const paymentReferenceValue =
    formData.get('paymentReference')

  const file = formData.get('file')

  if (
    typeof allocationIdValue !== 'string' ||
    allocationIdValue.trim().length === 0
  ) {
    return NextResponse.json(
      {
        error:
          'Allocation pembayaran wajib dipilih.',
      },
      {
        status: 400,
      },
    )
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        error:
          'File bukti pembayaran wajib dipilih.',
      },
      {
        status: 400,
      },
    )
  }

  let paymentReference: string | null = null

  if (paymentReferenceValue !== null) {
    if (typeof paymentReferenceValue !== 'string') {
      return NextResponse.json(
        {
          error:
            'Referensi pembayaran tidak valid.',
        },
        {
          status: 400,
        },
      )
    }

    const normalizedReference =
      paymentReferenceValue.trim()

    if (normalizedReference.length > 200) {
      return NextResponse.json(
        {
          error:
            'Referensi pembayaran terlalu panjang.',
        },
        {
          status: 400,
        },
      )
    }

    paymentReference =
      normalizedReference.length > 0
        ? normalizedReference
        : null
  }

  try {
    const supabase = getServiceRoleClient()

    const proof = await uploadPaymentProof({
      supabase,
      allocationId:
        allocationIdValue.trim(),
      uploadedBy: principal.adminId,
      file,
      paymentReference,
    })

    await writeAudit(principal, {
      action:
        'profit_distribution_payment_proof.upload',
      entityType:
        'profit_distribution_payment_proof',
      entityId: proof.id,
      summary:
        'Bukti transfer pembayaran distribusi bagi hasil berhasil diunggah.',
      changes: {
        allocation_id: {
          before: null,
          after: proof.allocation_id,
        },
        original_file_name: {
          before: null,
          after: proof.original_file_name,
        },
        mime_type: {
          before: null,
          after: proof.mime_type,
        },
        file_size_bytes: {
          before: null,
          after: proof.file_size_bytes,
        },
        payment_reference: {
          before: null,
          after: proof.payment_reference,
        },
      },
    })

    return NextResponse.json(
      {
        ok: true,
        proof,
      },
      {
        status: 201,
      },
    )
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Gagal mengunggah bukti pembayaran.'

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      },
    )
  }
}
