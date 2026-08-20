-- =============================================================================
-- Expose app schema to Supabase Data API
-- =============================================================================

grant usage on schema app to authenticated, service_role;

grant execute on all routines in schema app to authenticated, service_role;

alter default privileges for role postgres in schema app
grant execute on routines to authenticated, service_role;
