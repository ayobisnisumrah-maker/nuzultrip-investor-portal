-- Private Realtime channel authorization evaluates these helpers as the
-- authenticated subscriber. The blanket SECURITY DEFINER hardening migration
-- revoked them, causing every admin and investor channel policy that uses them
-- to fail with "permission denied for function ..." rather than return false.
--
-- They remain unavailable to anon. Both helpers derive their result solely
-- from auth.uid(), so granting EXECUTE does not let callers inspect another
-- principal or choose an investor id.

REVOKE ALL ON FUNCTION app.is_admin()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION app.is_admin()
TO authenticated;

REVOKE ALL ON FUNCTION app.current_investor_id()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION app.current_investor_id()
TO authenticated;

REVOKE ALL ON FUNCTION app.is_investor()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION app.is_investor()
TO authenticated;

-- current_investor_id() intentionally returns NULL until an investor has data
-- access. A submitted investor still needs their own lifecycle channel so an
-- approval can reach the open portal without a reload. Identity, not data
-- access, is the correct predicate for this topic; row data is still fetched
-- separately through its normal RLS policies.
ALTER POLICY realtime_investor_own
ON realtime.messages
USING (
  (
    realtime.topic() = app.topic_investor((SELECT auth.uid()))
    AND app.is_investor()
  )
  OR (
    realtime.topic() LIKE 'investor:%'
    AND app.has_permission('investors.view')
  )
);
