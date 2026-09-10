-- These SECURITY DEFINER functions require an authenticated user context or are only
-- meaningful for authenticated messaging/RLS flows. They must not be callable by anon.
-- Keep authenticated EXECUTE intact because the application and/or RLS policies rely on it.

REVOKE EXECUTE ON FUNCTION app.create_investor_message_request(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION app.thread_accepts_investor_reply(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_principal() FROM anon;
