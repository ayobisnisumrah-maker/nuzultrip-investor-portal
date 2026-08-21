-- Trigger functions are invoked by PostgreSQL triggers, not through PostgREST.
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_profit_distribution_payment_proof() FROM PUBLIC, anon, authenticated;
