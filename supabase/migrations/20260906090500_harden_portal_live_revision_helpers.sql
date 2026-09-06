-- Trigger helpers execute only through their table triggers.
-- Do not expose SECURITY DEFINER trigger functions as callable API surface.
revoke all on function app.guard_portal_section_version_insert() from public, anon, authenticated;
revoke all on function app.stage_portal_section_visibility() from public, anon, authenticated;
