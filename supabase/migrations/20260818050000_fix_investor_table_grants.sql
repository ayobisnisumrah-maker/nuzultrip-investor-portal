-- =============================================================================
-- FIX INVESTOR TABLE GRANTS
-- =============================================================================
-- RLS remains the authorization boundary.
--
-- GRANT only provides the table-level capability.
-- Actual access is still restricted by the existing RLS policies:
--
--   investors_select_admin
--   investors_select_auth_admin
--   investors_select_self
--   investors_update_admin
--   investors_update_self
--
-- Do not grant DELETE to authenticated.
-- Do not disable RLS.
-- =============================================================================

grant update on table public.investors to authenticated;