-- SECURITY DEFINER messaging functions below require an authenticated investor/session
-- and must not be callable by anon.
--
-- public.current_principal() intentionally remains executable by anon for compatibility
-- with the existing principal-resolution contract: without auth.uid() it returns null,
-- and the integration suite explicitly verifies that anonymous callers can resolve that null.
-- Authenticated EXECUTE remains intact for application/RLS flows.

REVOKE EXECUTE ON FUNCTION app.create_investor_message_request(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION app.thread_accepts_investor_reply(uuid) FROM anon;
