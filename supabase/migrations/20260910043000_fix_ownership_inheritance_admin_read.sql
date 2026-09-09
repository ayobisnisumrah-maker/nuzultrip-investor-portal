-- Allow authorized admins to read ownership inheritance requests through the
-- authenticated Supabase client used by the admin server component.
--
-- The foundation migration enabled RLS on ownership_inheritance but deliberately
-- created no direct authenticated policies. The admin page later queried this
-- table directly, so production returned a permission/RLS error even for a
-- principal that passed the ownership_inheritance.view page guard.
--
-- This is read-only and permission-scoped. Mutation access remains closed and
-- must continue through explicit application workflows/RPCs.

GRANT SELECT ON TABLE public.ownership_inheritance TO authenticated;

DROP POLICY IF EXISTS ownership_inheritance_admin_read
ON public.ownership_inheritance;

CREATE POLICY ownership_inheritance_admin_read
ON public.ownership_inheritance
FOR SELECT
TO authenticated
USING (app.has_permission('ownership_inheritance.view'));
