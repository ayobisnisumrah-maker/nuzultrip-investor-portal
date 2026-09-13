-- =============================================================================
-- Harden Reserved Matters execution boundary.
--
-- An approval must never be consumable as a standalone client action. The
-- require/consume helpers are transaction primitives for controlled SECURITY
-- DEFINER business RPCs. A business RPC must:
--   1. check the caller's domain + reserved_matters.execute permissions;
--   2. call app.require_reserved_matter_authorization(...);
--   3. perform the canonical business mutation;
--   4. call app.consume_reserved_matter_authorization(...);
-- in the SAME database transaction.
--
-- Keeping both helpers internal prevents a permitted administrator from marking
-- an approval as executed without the corresponding canonical action.
-- =============================================================================

revoke execute on function app.require_reserved_matter_authorization(text,text,uuid)
  from public, anon, authenticated;
revoke execute on function app.consume_reserved_matter_authorization(uuid)
  from public, anon, authenticated;

grant execute on function app.require_reserved_matter_authorization(text,text,uuid)
  to service_role;
grant execute on function app.consume_reserved_matter_authorization(uuid)
  to service_role;

comment on function app.require_reserved_matter_authorization(text,text,uuid) is
  'Internal fail-closed governance gate. Controlled SECURITY DEFINER business RPCs call this inside the same transaction as the canonical mutation.';

comment on function app.consume_reserved_matter_authorization(uuid) is
  'Internal governance transaction primitive. Must only be called by a controlled business RPC after its canonical mutation succeeds in the same transaction.';
