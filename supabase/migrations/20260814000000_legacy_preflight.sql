-- =============================================================================
-- Legacy preflight bridge
--
-- Purpose:
--   Move legacy relations out of canonical names before the new schema
--   creates those canonical relations.
--
-- Safety:
--   - No data is deleted.
--   - Existing FK relationships remain attached to the renamed relations.
--   - Idempotent: safe if a rename has already happened.
-- =============================================================================

begin;

alter table if exists public.investors
  rename to legacy_investors;

alter table if exists public.investor_status_history
  rename to legacy_investor_status_history;

alter table if exists public.audit_logs
  rename to legacy_audit_logs;

commit;
