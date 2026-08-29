-- app.has_permission() is intentionally used by RLS policies throughout the
-- application. It is SECURITY DEFINER so it can safely evaluate the current
-- principal without exposing the underlying RBAC tables directly.
--
-- The security-hardening migration revoked EXECUTE from authenticated, which
-- breaks every RLS policy that calls app.has_permission(...).
--
-- Keep anon denied. Only authenticated principals need this helper.

REVOKE ALL ON FUNCTION app.has_permission(text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION app.has_permission(text)
TO authenticated;
