'use server'

import { z } from 'zod'

import { canTransitionFinancialPeriod, financialPeriodInputSchema } from '@/core/financials/periods'
import { ConflictError, ForbiddenError, NotFoundError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'

const changeStatusSchema = z.object({
  periodId: z.string().uuid(),
  status: z.enum(['open', 'closed', 'locked']),
})

/**
 * Create a financial period.
 *
 * Authorization:
 * financial_periods.create
 *
 * Database RLS remains authoritative.
 */
export const createFinancialPeriod = defineAction({
  access: { permission: 'financial_periods.create' },
  input: financialPeriodInputSchema,
  audit: {
    action: 'financial_period.created',
    entityType: 'financial_period',
  },
  handler: async ({ input, supabase, audit }) => {
    const { data, error } = await supabase
      .from('financial_periods')
      .insert({
        period_type: input.periodType,
        fiscal_year: input.fiscalYear,
        period_index: input.periodIndex,
        starts_on: input.startsOn,
        ends_on: input.endsOn,
        currency: input.currency,
        status: 'open',
      })
      .select('id, period_type, fiscal_year, period_index, starts_on, ends_on, currency, status')
      .single()

    if (error) {
      throw new ConflictError(
        `Failed to create financial period: ${error.message}`,
        'Periode keuangan tidak dapat dibuat. Pastikan periode tersebut belum tersedia.',
      )
    }

    audit({
      entityId: data.id,
      summary: `Periode keuangan ${data.period_type} ${data.fiscal_year}/${data.period_index} dibuat.`,
      changes: {
        status: {
          before: null,
          after: data.status,
        },
      },
    })

    return data
  },
})

/**
 * Update financial period metadata.
 *
 * Only OPEN periods can be edited.
 * Status changes are handled by changeFinancialPeriodStatus().
 */
export const updateFinancialPeriod = defineAction({
  access: { permission: 'financial_periods.update' },
  input: financialPeriodInputSchema.extend({
    periodId: z.string().uuid(),
  }),
  audit: {
    action: 'financial_period.updated',
    entityType: 'financial_period',
  },
  handler: async ({ input, supabase, audit }) => {
    const { data: current, error: readError } = await supabase
      .from('financial_periods')
      .select('id, period_type, fiscal_year, period_index, starts_on, ends_on, currency, status')
      .eq('id', input.periodId)
      .maybeSingle()

    if (readError) {
      throw new ConflictError(
        `Failed to read financial period: ${readError.message}`,
        'Periode keuangan tidak dapat dibaca saat ini.',
      )
    }

    if (!current) {
      throw new NotFoundError('Financial period')
    }

    if (current.status !== 'open') {
      throw new ForbiddenError(
        `Financial period ${current.id} is not editable in status ${current.status}.`,
        {
          periodId: current.id,
          status: current.status,
          reason: 'financial_period_not_editable',
        },
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('financial_periods')
      .update({
        period_type: input.periodType,
        fiscal_year: input.fiscalYear,
        period_index: input.periodIndex,
        starts_on: input.startsOn,
        ends_on: input.endsOn,
        currency: input.currency,
      })
      .eq('id', input.periodId)
      .eq('status', 'open')
      .select('id, period_type, fiscal_year, period_index, starts_on, ends_on, currency, status')
      .maybeSingle()

    if (updateError) {
      throw new ConflictError(
        `Failed to update financial period: ${updateError.message}`,
        'Periode keuangan tidak dapat diperbarui.',
      )
    }

    if (!updated) {
      throw new ConflictError(
        'Financial period changed before update completed.',
        'Periode keuangan berubah sebelum pembaruan selesai. Silakan coba lagi.',
      )
    }

    audit({
      entityId: updated.id,
      summary: `Periode keuangan ${updated.id} diperbarui.`,
      changes: {
        period: {
          before: {
            periodType: current.period_type,
            fiscalYear: current.fiscal_year,
            periodIndex: current.period_index,
            startsOn: current.starts_on,
            endsOn: current.ends_on,
            currency: current.currency,
          },
          after: {
            periodType: updated.period_type,
            fiscalYear: updated.fiscal_year,
            periodIndex: updated.period_index,
            startsOn: updated.starts_on,
            endsOn: updated.ends_on,
            currency: updated.currency,
          },
        },
      },
    })

    return updated
  },
})

/**
 * Change lifecycle status.
 *
 * Authorization:
 * financial_periods.close
 *
 * Legal transitions are enforced by the domain layer and must also be
 * enforced by PostgreSQL in the database layer.
 */
export const changeFinancialPeriodStatus = defineAction({
  access: { permission: 'financial_periods.close' },
  input: changeStatusSchema,
  audit: {
    action: 'financial_period.status_changed',
    entityType: 'financial_period',
  },
  handler: async ({ input, supabase, audit }) => {
    const { data: current, error: readError } = await supabase
      .from('financial_periods')
      .select('id, period_type, fiscal_year, period_index, status')
      .eq('id', input.periodId)
      .maybeSingle()

    if (readError) {
      throw new ConflictError(
        `Failed to read financial period: ${readError.message}`,
        'Status periode keuangan tidak dapat dibaca saat ini.',
      )
    }

    if (!current) {
      throw new NotFoundError('Financial period')
    }

    const currentStatus = current.status
    const nextStatus = input.status

    if (currentStatus === nextStatus) {
      throw new ConflictError(
        `Financial period is already ${currentStatus}.`,
        'Periode keuangan sudah berada pada status tersebut.',
      )
    }

    if (!canTransitionFinancialPeriod(currentStatus, nextStatus)) {
      throw new ForbiddenError(
        `Invalid financial period transition: ${currentStatus} -> ${nextStatus}.`,
        {
          from: currentStatus,
          to: nextStatus,
          reason: 'invalid_financial_period_transition',
        },
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('financial_periods')
      .update({
        status: nextStatus,
      })
      .eq('id', input.periodId)
      .eq('status', currentStatus)
      .select('id, period_type, fiscal_year, period_index, status')
      .maybeSingle()

    if (updateError) {
      throw new ConflictError(
        `Failed to change financial period status: ${updateError.message}`,
        'Status periode keuangan tidak dapat diubah.',
      )
    }

    if (!updated) {
      throw new ConflictError(
        'Financial period changed before status update completed.',
        'Status periode berubah sebelum proses selesai. Silakan coba lagi.',
      )
    }

    audit({
      entityId: updated.id,
      summary: `Status periode keuangan ${updated.id} berubah dari ${currentStatus} menjadi ${nextStatus}.`,
      changes: {
        status: {
          before: currentStatus,
          after: nextStatus,
        },
      },
    })

    return {
      id: updated.id,
      previousStatus: currentStatus,
      status: updated.status,
    }
  },
})

export type CreateFinancialPeriodInput = z.input<typeof financialPeriodInputSchema>

export type UpdateFinancialPeriodInput = z.input<typeof financialPeriodInputSchema> & {
  periodId: string
}

export type ChangeFinancialPeriodStatusInput = z.infer<typeof changeStatusSchema>
