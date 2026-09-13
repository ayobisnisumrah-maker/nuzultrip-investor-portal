import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260913143500_former_investor_historical_read_access.sql'),
  'utf8',
)

describe('former investor historical read-only boundary', () => {
  it('introduces an internal read helper without broadening current_investor_id', () => {
    expect(sql).toContain('create or replace function private.current_historical_investor_id()')
    expect(sql).toContain("i.status in ('approved', 'active', 'inactive')")
    expect(sql).not.toContain('create or replace function app.current_investor_id()')
  })

  it('keeps ownership history readable for the same investor identity', () => {
    expect(sql).toContain('alter policy ownership_holdings_select_self')
    expect(sql).toContain('investor_id = private.current_historical_investor_id()')
  })

  it('keeps old message history readable while writes require active investor identity', () => {
    expect(sql).toContain('private.current_historical_investor_id() is not null')
    expect(sql).toContain('alter policy messages_insert_participant')
    expect(sql).toContain('app.current_investor_id() is not null')
    expect(sql).toContain('alter policy message_threads_insert_investor')
    expect(sql).toContain('investor_id = app.current_investor_id()')
  })

  it('does not grant historical access to anonymous callers', () => {
    expect(sql).toContain(
      'revoke all on function private.current_historical_investor_id() from public, anon;',
    )
  })
})
