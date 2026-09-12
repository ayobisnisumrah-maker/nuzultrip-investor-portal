-- =============================================================================
-- Index foreign keys used by inheritance/reconciliation policies and lifecycle
-- queries. Additive only; no production data is modified.
-- =============================================================================

create index if not exists ownership_inheritance_completed_by_idx
  on public.ownership_inheritance(completed_by);

create index if not exists finance_bank_reconciliations_proof_asset_idx
  on public.finance_bank_reconciliations(proof_asset_id);

create index if not exists finance_bank_reconciliations_reconciled_by_idx
  on public.finance_bank_reconciliations(reconciled_by);
