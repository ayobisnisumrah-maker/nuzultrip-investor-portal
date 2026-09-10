-- REVOKE FROM anon alone is insufficient when PUBLIC still has EXECUTE because
-- anon inherits PUBLIC privileges. These helpers require an authenticated flow.

REVOKE EXECUTE ON FUNCTION app.create_investor_message_request(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION app.thread_accepts_investor_reply(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION app.create_investor_message_request(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION app.thread_accepts_investor_reply(uuid) TO authenticated;
