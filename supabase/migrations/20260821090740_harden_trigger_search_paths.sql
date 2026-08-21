-- Harden mutable trigger function search paths.
-- These functions only touch their target row and must not inherit a role-controlled search_path.

ALTER FUNCTION public.set_updated_at()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.touch_profit_distribution_payment_proof()
  SET search_path = pg_catalog, public;
