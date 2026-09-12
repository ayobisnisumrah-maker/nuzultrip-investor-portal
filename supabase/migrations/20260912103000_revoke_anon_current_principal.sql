-- =============================================================================
-- Remove anonymous execution from public.current_principal().
--
-- The function resolves the signed-in principal from auth.uid(). Anonymous calls
-- return NULL and no database policy/function depends on invoking it as anon.
-- Keep authenticated and service_role execution for the real session boundary.
-- =============================================================================

revoke all on function public.current_principal() from public, anon;

grant execute on function public.current_principal() to authenticated;
grant execute on function public.current_principal() to service_role;
