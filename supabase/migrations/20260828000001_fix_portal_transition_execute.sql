-- Restore the intended execution privilege for the portal publication
-- lifecycle RPC. The function itself remains SECURITY DEFINER and performs
-- the application-level permission check internally.

revoke all on function app.transition_portal_page(
  uuid,
  public.publication_status
) from public, anon;

grant execute on function app.transition_portal_page(
  uuid,
  public.publication_status
) to authenticated;

grant usage on schema app to authenticated;
