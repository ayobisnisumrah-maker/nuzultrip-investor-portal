-- app.participates_in_thread(uuid) is intentionally called by the messaging
-- SELECT/INSERT RLS policies. The blanket SECURITY DEFINER hardening migration
-- revoked EXECUTE from authenticated, which makes browser-side message refetches
-- fail even for a real thread participant.
--
-- Keep the helper unavailable to anon/PUBLIC. It derives membership only from
-- auth.uid() and the requested thread id; table RLS remains authoritative.

REVOKE ALL ON FUNCTION app.participates_in_thread(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION app.participates_in_thread(uuid)
TO authenticated;
