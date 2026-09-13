import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260913142500_atomic_full_sale_investor_exit.sql'),
  'utf8',
)

const lifecycle = readFileSync(join(process.cwd(), 'docs/FULL_INVESTOR_LIFECYCLE.md'), 'utf8')

describe('full ownership sale exit lifecycle contract', () => {
  it('keeps sale completion as one atomic database workflow', () => {
    expect(migration).toContain('create or replace function app.complete_ownership_sale')
    expect(migration).toContain("status = 'transferred'")
    expect(migration).toContain("status = 'completed'")
    expect(migration).toContain("'SALE-' || v_transfer.id::text")
    expect(migration).toContain('v_seller_fully_exited')
  })

  it('deactivates only a seller with no active holdings remaining', () => {
    expect(migration).toContain("h.status = 'active'")
    expect(migration).toContain('h.units > 0')
    expect(migration).toContain("set status = 'inactive'")
    expect(migration).toContain("and status = 'active'")
  })

  it('closes communication without deleting seller history', () => {
    expect(migration).toContain('update public.message_threads')
    expect(migration).toContain('set is_closed = true')
    expect(migration).toContain('closed_at = coalesce(closed_at, now())')
    expect(migration).not.toMatch(/delete\s+from\s+public\.message_threads/i)
    expect(migration).not.toMatch(/delete\s+from\s+public\.messages/i)
  })

  it('reactivates an inactive buyer after a legal acquisition', () => {
    expect(migration).toContain('where id = v_transfer.to_investor_id')
    expect(migration).toContain("and status = 'inactive'")
  })

  it('documents historical read-only seller and buyer privacy invariants', () => {
    expect(lifecycle).toContain('historical read-only investor mode')
    expect(lifecycle).toContain('Buyer does not inherit seller-private messages')
    expect(lifecycle).toContain('partial sale must **not** deactivate the seller')
    expect(lifecycle).toContain('CI, database/RLS integration tests, and Browser E2E 7/7')
  })
})
