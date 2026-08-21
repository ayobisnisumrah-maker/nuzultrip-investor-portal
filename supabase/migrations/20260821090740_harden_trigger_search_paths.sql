-- Harden mutable trigger function search paths.
-- These functions only touch their target row and must not inherit a role-controlled search_path.

-- The shared updated_at trigger is defined in the internal `app` schema.
ALTER FUNCTION app.set_updated_at()
  SET search_path = pg_catalog, public;

-- The payment-proof trigger function is intentionally public because it is
-- attached to a public table, so harden its search_path as well.
ALTER FUNCTION public.touch_profit_distribution_payment_proof()
  SET search_path = pg_catalog, public;
