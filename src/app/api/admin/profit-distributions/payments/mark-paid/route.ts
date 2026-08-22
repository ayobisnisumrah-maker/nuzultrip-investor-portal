import 'server-only'

import { NextResponse } from 'next/server'

import { hasPermission } from '@/core/auth/principal'
import { getPrincipal } from '@/server/auth/session'
import { getServiceRoleClient } from '@/server/admin/service-client'
import { markProfitDistributionAllocationPaid } from '@/server/ownership/profit-distribution-service'

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
    !hasPermission(principal, 'profit_distribution_payments.mark_paid')
  ) {
    return NextResponse.json(
      {
        error: 'Anda tidak memiliki izin menandai pembayaran sebagai paid.',
      },
      {
        status: 403,
      },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        error: 'Request JSON tidak valid.',
      },
      {
        status: 400,
      },
    )
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      {
        error: 'Payload pembayaran tidak valid.',
      },
      {
        status: 400,
      },
    )
  }

  const payload = body as Record<string, unknown>

  const allocationId = payload.allocationId

  if (typeof allocationId !== 'string' || allocationId.trim().length === 0) {
    return NextResponse.json(
      {
        error: 'Allocation pembayaran wajib dipilih.',
      },
      {
        status: 400,
      },
    )
  }

  let paymentReference: string | null = null

  if (payload.paymentReference !== undefined) {
    if (payload.paymentReference !== null && typeof payload.paymentReference !== 'string') {
      return NextResponse.json(
        {
          error: 'Referensi pembayaran tidak valid.',
        },
        {
          status: 400,
        },
      )
    }

    if (typeof payload.paymentReference === 'string') {
      const normalizedReference = payload.paymentReference.trim()

      if (normalizedReference.length > 200) {
        return NextResponse.json(
          {
            error: 'Referensi pembayaran terlalu panjang.',
          },
          {
            status: 400,
          },
        )
      }

      paymentReference = normalizedReference.length > 0 ? normalizedReference : null
    }
  }

  try {
    const supabase = getServiceRoleClient()

    const allocation = await markProfitDistributionAllocationPaid(
      supabase,
      allocationId.trim(),
      paymentReference,
    )

    return NextResponse.json(
      {
        ok: true,
        allocation,
      },
      {
        status: 200,
      },
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Gagal menandai pembayaran sebagai paid.'

    const status = message === 'Allocation pembayaran tidak ditemukan.' ? 404 : 400

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
      },
    )
  }
}
