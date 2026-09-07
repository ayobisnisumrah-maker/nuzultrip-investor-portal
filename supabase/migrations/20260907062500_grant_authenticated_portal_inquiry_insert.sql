-- The public contact page is intentionally accessible both before and after login.
-- Its INSERT RLS policy already permits anon and authenticated callers, but the
-- authenticated role was missing the table-level INSERT grant. That caused
-- /hubungi to return HTTP 500 whenever a signed-in user submitted the form.

grant insert on table public.portal_inquiries to authenticated;
