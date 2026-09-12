-- =============================================================================
-- Revoke anonymous/public execution from investor messaging SECURITY DEFINER RPCs.
--
-- Both functions require an authenticated investor context. The reply helper is
-- only referenced by an authenticated INSERT policy on public.messages.
-- Keep authenticated execution intact while removing the unnecessary anon/API
-- surface that Supabase's database linter flags.
-- =============================================================================

revoke all on function app.create_investor_message_request(text, text)
  from public, anon;
grant execute on function app.create_investor_message_request(text, text)
  to authenticated;

revoke all on function app.thread_accepts_investor_reply(uuid)
  from public, anon;
grant execute on function app.thread_accepts_investor_reply(uuid)
  to authenticated;
