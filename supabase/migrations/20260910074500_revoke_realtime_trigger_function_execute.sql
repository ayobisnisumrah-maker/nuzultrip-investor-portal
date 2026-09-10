-- Realtime/audit emitter functions below are PostgreSQL trigger functions.
-- They must not be callable directly through PostgREST RPC by anon or signed-in users.
-- Revoking EXECUTE does not disable the database triggers that own these functions.

REVOKE EXECUTE ON FUNCTION app.emit_admin_account_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_document_version_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_financial_period_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_financial_report_child_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_ownership_holding_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_ownership_transfer_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_profit_distribution_allocation_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_profit_distribution_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_profit_distribution_proof_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_public_brand_profile_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_public_brand_setting_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_rbac_events() FROM PUBLIC, anon, authenticated;
