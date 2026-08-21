-- Trigger functions are invoked by PostgreSQL triggers, not through PostgREST.
-- The shared updated_at trigger is defined in the internal `app` schema.
REVOKE EXECUTE ON FUNCTION app.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_profit_distribution_payment_proof() FROM PUBLIC, anon, authenticated;
