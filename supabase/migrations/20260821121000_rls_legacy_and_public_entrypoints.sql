-- Public intake tables: allow submissions, but only admins can read/manage them.
DROP POLICY IF EXISTS contact_messages_public_insert ON public.contact_messages;
CREATE POLICY contact_messages_public_insert ON public.contact_messages
FOR INSERT TO anon, authenticated
WITH CHECK (true);
DROP POLICY IF EXISTS contact_messages_admin_manage ON public.contact_messages;
CREATE POLICY contact_messages_admin_manage ON public.contact_messages
FOR ALL TO authenticated
USING (app.is_admin())
WITH CHECK (app.is_admin());

DROP POLICY IF EXISTS investor_requests_public_insert ON public.investor_requests;
CREATE POLICY investor_requests_public_insert ON public.investor_requests
FOR INSERT TO anon, authenticated
WITH CHECK (true);
DROP POLICY IF EXISTS investor_requests_admin_manage ON public.investor_requests;
CREATE POLICY investor_requests_admin_manage ON public.investor_requests
FOR ALL TO authenticated
USING (app.is_admin())
WITH CHECK (app.is_admin());

DROP POLICY IF EXISTS meeting_bookings_public_insert ON public.meeting_bookings;
CREATE POLICY meeting_bookings_public_insert ON public.meeting_bookings
FOR INSERT TO anon, authenticated
WITH CHECK (true);
DROP POLICY IF EXISTS meeting_bookings_admin_manage ON public.meeting_bookings;
CREATE POLICY meeting_bookings_admin_manage ON public.meeting_bookings
FOR ALL TO authenticated
USING (app.is_admin())
WITH CHECK (app.is_admin());

-- Legacy/internal tables: explicitly deny client roles. Service-role/server
-- operations continue to bypass RLS and preserve existing backend workflows.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'data_room_access_logs',
    'data_room_categories',
    'data_room_documents',
    'investor_tokens',
    'kv_store_b620c355',
    'legacy_audit_logs',
    'legacy_investor_status_history',
    'legacy_investors',
    'meetings',
    'notification_deliveries',
    'ownership_inheritance',
    'ownership_transfers',
    'rate_limits',
    'settings',
    'user_profiles',
    'user_roles'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_client_deny ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_client_deny ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', t, t);
  END LOOP;
END $$;
