'use server'

import { z } from 'zod'

import { ForbiddenError, NotFoundError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'

import {
  createPaymentProofSignedUrl,
  getPaymentProof,
  uploadPaymentProof,
} from './payment-proof-service'

const allocationIdSchema = z.object({
  allocationId: z.uuid('Allocation pembayaran tidak valid.'),
})

const uploadPaymentProofSchema = z.object({
  allocationId: z.uuid('Allocation pembayaran tidak valid.'),
  paymentReference: z
    .string()
    .trim()
    .max(200, 'Referensi pembayaran terlalu panjang.')
    .nullable()
    .optional(),
  file: z.instanceof(File, { error: 'File bukti pembayaran wajib dipilih.' }),
})

export const getProfitDistributionPaymentProof =
  defineAction({
    access: {
      permission: 'profit_distributions.view',
    },

    input: allocationIdSchema,

    audit: {
      action: 'profit_distribution_payment_proof.view',
      entityType: 'profit_distribution_payment_proof',
    },

    handler: async ({
      principal,
      input,
      supabase,
    }) => {
      if (principal.kind !== 'admin') {
        throw new ForbiddenError(
          'Admin principal required.',
        )
      }

      const proof = await getPaymentProof(
        supabase,
        input.allocationId,
      )

      if (!proof) {
        throw new NotFoundError(
          'Bukti transfer pembayaran',
        )
      }

      return proof
    },
  })

export const uploadProfitDistributionPaymentProof =
  defineAction({
    access: {
      permission: 'profit_distribution_payments.upload_proof',
    },

    input: uploadPaymentProofSchema,

    audit: {
      action: 'profit_distribution_payment_proof.upload',
      entityType: 'profit_distribution_payment_proof',
    },

    handler: async ({
      principal,
      input,
      supabase,
      audit,
    }) => {
      if (principal.kind !== 'admin') {
        throw new ForbiddenError(
          'Admin principal required.',
        )
      }

      const paymentReference =
        input.paymentReference?.trim() || null

      const proof = await uploadPaymentProof({
        supabase,
        allocationId: input.allocationId,
        uploadedBy: principal.adminId,
        file: input.file,
        paymentReference,
      })

      audit({
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

      return proof
    },
  })

export const createProfitDistributionPaymentProofUrl =
  defineAction({
    access: {
      permission: 'profit_distributions.view',
    },

    input: allocationIdSchema,

    audit: {
      action: 'profit_distribution_payment_proof.open',
      entityType: 'profit_distribution_payment_proof',
    },

    handler: async ({
      principal,
      input,
      supabase,
    }) => {
      if (principal.kind !== 'admin') {
        throw new ForbiddenError(
          'Admin principal required.',
        )
      }

      const proof = await getPaymentProof(
        supabase,
        input.allocationId,
      )

      if (!proof) {
        throw new NotFoundError(
          'Bukti transfer pembayaran',
        )
      }

      const signedUrl =
        await createPaymentProofSignedUrl(
          supabase,
          proof,
        )

      return {
        signedUrl,
        expiresInSeconds: 300,
        fileName: proof.original_file_name,
      }
    },
  })

