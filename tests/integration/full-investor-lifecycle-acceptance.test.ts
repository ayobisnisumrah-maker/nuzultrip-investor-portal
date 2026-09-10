// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { as, asCommitted, cleanup, closeDb, db, expectRejected } from './helpers/db'
import { createFixtures, destroyFixtures, type Fixtures } from './helpers/fixtures'
import {
  createPublishedFinancialSnapshot,
  destroyFinancialSnapshot,
  type FinancialSnapshotFixture,
} from './helpers/financial-snapshot'

let fixtures: Fixtures
let offeringId: string | null = null
let sellerHoldingId: string | null = null
let distributionId: string | null = null
let allocationId: string | null = null
let transferId: string | null = null
let buyerHoldingId: string | null = null
let financialSnapshot: FinancialSnapshotFixture | null = null

beforeAll(async () => {
  fixtures = await createFixtures()
}, 60_000)

afterAll(async () => {
  await cleanup(async (tx) => {
    if (transferId) {
      await tx`delete from public.ownership_transfers where id = ${transferId}`
    }
    if (distributionId) {
      await tx`delete from public.profit_distribution_payment_proofs where allocation_id in (
        select id from public.profit_distribution_allocations where distribution_id = ${distributionId}
      )`
      await tx`delete from public.profit_distribution_allocations where distribution_id = ${distributionId}`
      await tx`delete from public.profit_distributions where id = ${distributionId}`
    }
    if (buyerHoldingId) {
      await tx`delete from public.ownership_holdings where id = ${buyerHoldingId}`
    }
    if (sellerHoldingId) {
      await tx`delete from public.ownership_holdings where id = ${sellerHoldingId}`
    }
    if (offeringId) {
      await tx`delete from public.ownership_offerings where id = ${offeringId}`
    }
  })
  await destroyFinancialSnapshot(financialSnapshot)
  await destroyFixtures(fixtures)
  await closeDb()
})

describe('full investor ownership lifecycle acceptance', () => {
  it('covers acquisition, distribution, lock rejection, sale, transfer, and new owner', async () => {
    const snapshot = await createPublishedFinancialSnapshot({
      suffix: fixtures.suffix,
      fiscalYear: 2198,
      revenue: 1_000_000_000,
      expenses: 100_000_000,
    })
    financialSnapshot = snapshot
    const acquisition = await asCommitted(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      async (tx) => {
        const [offering] = await tx<{ id: string }[]>`
          insert into public.ownership_offerings (
            name, code, status, total_offered_bps, unit_ownership_bps, unit_price,
            total_units, distribution_cadence_months, transfer_lock_months,
            effective_from, created_by, updated_by
          ) values (
            'Lifecycle Acceptance Offering',
            ${`lifecycle-${fixtures.suffix}`},
            'open', 4000, 80, 100000000, 50, 1, 36, now(),
            ${fixtures.superAdmin.userId}, ${fixtures.superAdmin.userId}
          ) returning id
        `
        if (!offering) throw new Error('Failed to create offering.')
        offeringId = offering.id

        const [holding] = await tx<
          {
            id: string
            investor_id: string
            units: number
            ownership_bps: number
            status: string
            acquisition_reference: string | null
            transfer_eligible_at: string
          }[]
        >`
          select id, investor_id, units, ownership_bps, status, acquisition_reference,
                 transfer_eligible_at::text
          from app.allocate_ownership_holding(
            ${offering.id},
            ${fixtures.investorA.userId},
            1,
            ${`BANK-ACQ-${fixtures.suffix}`},
            'Pembelian satu unit telah dikonfirmasi.'
          )
        `
        if (!holding) throw new Error('Failed to allocate holding.')
        sellerHoldingId = holding.id
        return holding
      },
    )

    expect(acquisition.investor_id).toBe(fixtures.investorA.userId)
    expect(acquisition.units).toBe(1)
    expect(acquisition.ownership_bps).toBe(80)
    expect(acquisition.status).toBe('active')
    expect(acquisition.acquisition_reference).toContain('BANK-ACQ-')

    const earlySaleError = await expectRejected(() =>
      as({ kind: 'authenticated', userId: fixtures.investorA.userId }, async (tx) => {
        await tx`select app.create_ownership_sale_request(
          ${sellerHoldingId}, 1, 100000000, 'Percobaan jual sebelum lock selesai.'
        )`
      }),
    )
    expect(earlySaleError.code).toBe('22023')
    expect(earlySaleError.message).toContain('belum memenuhi tanggal minimum transfer')

    const distribution = await asCommitted(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      async (tx) => {
        const [created] = await tx<
          {
            id: string
            profit_amount: string
            investor_pool_amount: string
          }[]
        >`
          select id, profit_amount::text, investor_pool_amount::text
          from app.create_profit_distribution(
            ${offeringId},
            ${snapshot.versionId},
            6000,
            4000,
            'Acceptance lifecycle distribution.'
          )
        `
        if (!created) throw new Error('Failed to create distribution.')
        distributionId = created.id

        const [allocation] = await tx<
          {
            id: string
            investor_id: string
            ownership_bps: number
            investor_pool_share_bps: number
            allocation_amount: string
            status: string
          }[]
        >`
          select id, investor_id, ownership_bps, investor_pool_share_bps,
                 allocation_amount::text, status
          from app.regenerate_profit_distribution_allocations(${created.id})
        `
        if (!allocation) throw new Error('Failed to generate allocation.')
        allocationId = allocation.id

        await tx`select app.transition_profit_distribution(${created.id}, 'review'::public.profit_distribution_status)`
        await tx`select app.transition_profit_distribution(${created.id}, 'approved'::public.profit_distribution_status)`
        await tx`select app.transition_profit_distribution(${created.id}, 'payable'::public.profit_distribution_status)`

        return { created, allocation }
      },
    )

    expect(Number(distribution.created.profit_amount)).toBe(900_000_000)
    expect(Number(distribution.created.investor_pool_amount)).toBe(360_000_000)
    expect(distribution.allocation.investor_id).toBe(fixtures.investorA.userId)
    expect(distribution.allocation.ownership_bps).toBe(80)
    expect(distribution.allocation.investor_pool_share_bps).toBe(200)
    expect(Number(distribution.allocation.allocation_amount)).toBe(7_200_000)

    await db()`
      insert into public.profit_distribution_payment_proofs (
        allocation_id, investor_id, storage_bucket, storage_path,
        original_file_name, mime_type, file_size_bytes,
        payment_reference, uploaded_by
      ) values (
        ${allocationId},
        ${fixtures.investorA.userId},
        'profit-distribution-proofs',
        ${`acceptance/${fixtures.suffix}.pdf`},
        'bukti-transfer.pdf',
        'application/pdf',
        1024,
        ${`PAY-${fixtures.suffix}`},
        ${fixtures.superAdmin.userId}
      )
    `

    const payment = await asCommitted(
      { kind: 'authenticated', userId: fixtures.superAdmin.userId },
      async (tx) => {
        const [paid] = await tx<
          {
            allocation_status: string
            distribution_status: string
          }[]
        >`
          select allocation_status, distribution_status::text
          from app.mark_profit_distribution_allocation_paid(
            ${allocationId}, ${`PAY-${fixtures.suffix}`}
          )
        `
        if (!paid) throw new Error('Failed to mark allocation paid.')
        return paid
      },
    )

    expect(payment.allocation_status).toBe('paid')
    expect(payment.distribution_status).toBe('paid')

    // Test-only time travel: only after proving the real 36-month guard rejects early sale.
    await db()`
      update public.ownership_holdings
      set acquisition_at = now() - interval '37 months',
          transfer_eligible_at = now() - interval '1 month'
      where id = ${sellerHoldingId}
    `

    transferId = await asCommitted(
      { kind: 'authenticated', userId: fixtures.investorA.userId },
      async (tx) => {
        const [row] = await tx<{ id: string }[]>`
          select app.create_ownership_sale_request(
            ${sellerHoldingId},
            1,
            110000000,
            'Penjualan setelah lock transfer terpenuhi.'
          ) as id
        `
        if (!row) throw new Error('Failed to create sale request.')
        return row.id
      },
    )

    await asCommitted({ kind: 'authenticated', userId: fixtures.superAdmin.userId }, async (tx) => {
      await tx`select app.approve_ownership_sale(${transferId})`
      await tx`select app.process_ownership_sale(
          ${transferId}, ${fixtures.investorB.userId}, 110000000
        )`
      const [row] = await tx<{ buyer_holding_id: string }[]>`
          select app.complete_ownership_sale(${transferId}) as buyer_holding_id
        `
      if (!row) throw new Error('Failed to complete sale.')
      buyerHoldingId = row.buyer_holding_id
    })

    const [sellerHolding] = await db()<
      {
        investor_id: string
        units: number
        ownership_bps: number
        status: string
      }[]
    >`
      select investor_id, units, ownership_bps, status
      from public.ownership_holdings
      where id = ${sellerHoldingId}
    `
    expect(sellerHolding).toBeTruthy()
    expect(sellerHolding!.investor_id).toBe(fixtures.investorA.userId)
    // Full sale preserves the original lot snapshot for history, but it is no longer active ownership.
    expect(sellerHolding!.units).toBe(1)
    expect(sellerHolding!.ownership_bps).toBe(80)
    expect(sellerHolding!.status).toBe('transferred')

    const [buyerHolding] = await db()<
      {
        investor_id: string
        units: number
        ownership_bps: number
        status: string
        acquisition_at: string
        transfer_eligible_at: string
      }[]
    >`
      select investor_id, units, ownership_bps, status,
             acquisition_at::text, transfer_eligible_at::text
      from public.ownership_holdings
      where id = ${buyerHoldingId}
    `
    expect(buyerHolding).toBeTruthy()
    expect(buyerHolding!.investor_id).toBe(fixtures.investorB.userId)
    expect(buyerHolding!.units).toBe(1)
    expect(buyerHolding!.ownership_bps).toBe(80)
    expect(buyerHolding!.status).toBe('active')
    expect(new Date(buyerHolding!.transfer_eligible_at).getTime()).toBeGreaterThan(
      new Date(buyerHolding!.acquisition_at).getTime(),
    )

    const [historicalAllocation] = await db()<
      {
        investor_id: string
        allocation_amount: string
        status: string
      }[]
    >`
      select investor_id, allocation_amount::text, status
      from public.profit_distribution_allocations
      where id = ${allocationId}
    `
    expect(historicalAllocation).toBeTruthy()
    expect(historicalAllocation!.investor_id).toBe(fixtures.investorA.userId)
    expect(Number(historicalAllocation!.allocation_amount)).toBe(7_200_000)
    expect(historicalAllocation!.status).toBe('paid')

    const [transfer] = await db()<
      {
        from_investor_id: string
        to_investor_id: string
        units: number
        status: string
        agreed_unit_price: string
      }[]
    >`
      select from_investor_id, to_investor_id, units, status, agreed_unit_price::text
      from public.ownership_transfers
      where id = ${transferId}
    `
    expect(transfer).toBeTruthy()
    expect(transfer!.from_investor_id).toBe(fixtures.investorA.userId)
    expect(transfer!.to_investor_id).toBe(fixtures.investorB.userId)
    expect(transfer!.units).toBe(1)
    expect(transfer!.status).toBe('completed')
    expect(Number(transfer!.agreed_unit_price)).toBe(110_000_000)
  }, 120_000)
})
