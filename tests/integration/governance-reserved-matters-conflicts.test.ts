import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260914010000_governance_reserved_matters_conflicts.sql',
  ),
  'utf8',
)

describe('D05 Reserved Matters + D04 Conflict of Interest governance foundation', () => {
  it('does not invent active governance thresholds', () => {
    expect(migration).toContain("status text not null default 'draft'")
    expect(migration).toContain('quorum_count integer')
    expect(migration).toContain('required_approvals integer')
    expect(migration).toContain('approval_ratio_pct numeric(5,2)')
    expect(migration).toContain(
      'Threshold quorum, jumlah approval, dan rasio approval wajib disahkan sebelum aktivasi.',
    )
  })

  it('keeps governance history and decisions immutable', () => {
    expect(migration).toContain('create or replace function app.guard_governance_rule_history()')
    expect(migration).toContain('create trigger governance_rules_history_guard')
    expect(migration).toContain('create trigger reserved_matter_decisions_append_only')
    expect(migration).toContain('execute function app.forbid_mutation()')
  })

  it('requires independent conflict review and enforces recusal', () => {
    expect(migration).toContain('reviewed_by <> admin_id')
    expect(migration).toContain("restriction = 'recused'")
    expect(migration).toContain(
      'Pihak yang mengungkapkan konflik tidak boleh meninjau konfliknya sendiri.',
    )
    expect(migration).toContain(
      'Administrator dengan konflik yang belum cleared atau telah dikonfirmasi tidak boleh memberikan keputusan.',
    )
  })

  it('prevents proposers from deciding or finalising their own matter', () => {
    expect(migration).toContain('if v_matter.requested_by = v_actor then')
    expect(migration).toContain(
      'Pengusul Reserved Matter tidak boleh memberikan keputusan pada perkaranya sendiri.',
    )
    expect(migration).toContain(
      'Pengusul Reserved Matter tidak boleh memfinalkan perkaranya sendiri.',
    )
  })

  it('fails closed when the controlled action has no active rule or approval', () => {
    expect(migration).toContain('create or replace function app.require_reserved_matter_authorization')
    expect(migration).toContain("and gr.status = 'active'")
    expect(migration).toContain("and rm.status = 'approved'")
    expect(migration).toContain('eksekusi ditolak')
    expect(migration).toContain('Persetujuan Reserved Matters yang valid belum tersedia')
  })

  it('keeps direct authenticated mutation closed', () => {
    expect(migration).toContain('revoke all on public.governance_rules from anon, authenticated')
    expect(migration).toContain('revoke all on public.reserved_matters from anon, authenticated')
    expect(migration).toContain('revoke all on public.conflict_disclosures from anon, authenticated')
    expect(migration).toContain(
      'revoke all on public.reserved_matter_decisions from anon, authenticated',
    )
  })

  it('exposes only audited permission-checked lifecycle RPCs', () => {
    expect(migration).toContain("app.has_permission('reserved_matters.configure')")
    expect(migration).toContain("app.has_permission('reserved_matters.decide')")
    expect(migration).toContain("app.has_permission('conflicts.resolve')")
    expect(migration).toContain("'reserved_matters.execute'")
    expect(migration).toContain("'conflicts.resolve'")
  })
})
