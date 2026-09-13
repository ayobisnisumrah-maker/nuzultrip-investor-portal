// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'

import { closeDb, db } from './helpers/db'

afterAll(async () => {
  await closeDb()
})

const squash = (value: string | null) => (value ?? '').replace(/\s+/g, ' ').toLowerCase()

describe('canonical investor profit-distribution RLS', () => {
  it('binds the canonical helper to the signed-in investor and official published finance', async () => {
    const [row] = await db()<{ definition: string }[]>`
      select pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private'
        and p.proname = 'investor_can_read_canonical_distribution'
        and pg_get_function_identity_arguments(p.oid) = 'p_distribution_id uuid, p_investor_id uuid, p_allocation_id uuid'
    `

    expect(row).toBeDefined()
    const definition = squash(row!.definition)

    expect(definition).toContain('security definer')
    expect(definition).toContain("set search_path to ''")
    expect(definition).toContain('p_investor_id = app.current_investor_id()')
    expect(definition).toContain('public.financial_report_versions')
    expect(definition).toContain('public.financial_reports')
    expect(definition).toContain('r.published_version_id = v.id')
    expect(definition).toContain('public.financial_periods')
    expect(definition).toContain("v.status = 'published'::public.publication_status")
    expect(definition).toContain("r.status = 'published'::public.publication_status")
    expect(definition).toContain("'closed'::public.period_status")
    expect(definition).toContain("'locked'::public.period_status")
    expect(definition).toContain('d.period_start = fp.starts_on')
    expect(definition).toContain('d.period_end = fp.ends_on')
    expect(definition).toContain('d.financial_report_version_id is not null')
    expect(definition).toContain('public.profit_distribution_allocations')
    expect(definition).toContain('own.status')
    expect(definition).toContain("'payable'")
    expect(definition).toContain("'paid'")
  })

  it('keeps the helper private from anonymous clients', async () => {
    const [row] = await db()<
      { anon_can_execute: boolean; authenticated_can_execute: boolean; service_can_execute: boolean }[]
    >`
      select
        has_function_privilege(
          'anon',
          'private.investor_can_read_canonical_distribution(uuid,uuid,uuid)',
          'EXECUTE'
        ) as anon_can_execute,
        has_function_privilege(
          'authenticated',
          'private.investor_can_read_canonical_distribution(uuid,uuid,uuid)',
          'EXECUTE'
        ) as authenticated_can_execute,
        has_function_privilege(
          'service_role',
          'private.investor_can_read_canonical_distribution(uuid,uuid,uuid)',
          'EXECUTE'
        ) as service_can_execute
    `

    expect(row).toEqual({
      anon_can_execute: false,
      authenticated_can_execute: true,
      service_can_execute: true,
    })
  })

  it('routes all three investor self-read policies through the non-recursive helper', async () => {
    const rows = await db()<
      { tablename: string; policyname: string; qual: string }[]
    >`
      select tablename, policyname, qual
      from pg_policies
      where schemaname = 'public'
        and policyname in (
          'profit_distributions_select_self',
          'profit_distribution_allocations_select_self',
          'profit_distribution_payment_proofs_select_self'
        )
      order by policyname
    `

    expect(rows).toHaveLength(3)

    const byPolicy = new Map(rows.map((row) => [row.policyname, squash(row.qual)]))
    const distribution = byPolicy.get('profit_distributions_select_self') ?? ''
    const allocation = byPolicy.get('profit_distribution_allocations_select_self') ?? ''
    const proof = byPolicy.get('profit_distribution_payment_proofs_select_self') ?? ''

    for (const qual of [distribution, allocation, proof]) {
      expect(qual).toContain('private.investor_can_read_canonical_distribution')
    }

    expect(distribution).toContain('app.current_investor_id()')
    expect(allocation).toContain('investor_id = app.current_investor_id()')
    expect(allocation).toContain("status = any (array['payable'::text, 'paid'::text])")
    expect(proof).toContain('investor_id = app.current_investor_id()')

    // The policy bodies themselves must not walk parent/child distribution
    // tables. That traversal lives in the SECURITY DEFINER helper so PostgreSQL
    // cannot recurse profit_distributions <-> allocations while evaluating RLS.
    expect(distribution).not.toContain('select 1 from profit_distribution_allocations')
    expect(allocation).not.toContain('select 1 from profit_distributions')
    expect(proof).not.toContain('select 1 from profit_distributions')
  })
})
