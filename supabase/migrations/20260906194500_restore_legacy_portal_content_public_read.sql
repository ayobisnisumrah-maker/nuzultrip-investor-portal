-- Reconcile the legacy portal_content table with the existing anonymous RLS contract.
-- The table already has portal_content_public_read, which only exposes rows whose
-- status is 'published'. Restoring SELECT does not expose draft/private rows; it
-- only lets anon reach the policy-protected published compatibility surface.

begin;

grant select on table public.portal_content to anon;

commit;
