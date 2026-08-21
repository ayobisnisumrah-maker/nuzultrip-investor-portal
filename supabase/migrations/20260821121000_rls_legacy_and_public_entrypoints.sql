-- Public intake tables: allow submissions, but only admins can read/manage them.
-- These tables are optional legacy/public-surface objects, so clean-schema
-- rebuilds must not fail when one is absent.
DO $$
BEGIN
  IF to_regclass('public.contact_messages') IS NOT NULL THEN
    DROP POLICY IF EXISTS contact_messages_public_insert ON public.contact_messages;
    CREATE POLICY contact_messages_public_insert ON public.contact_messages
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

    DROP POLICY IF EXISTS contact_messages_admin_manage ON public.contact_messages;
    CREATE POLICY contact_messages_admin_manage ON public.contact_messages
    FOR ALL TO authenticated
    USING (app.is_admin())
    WITH CHECK (app.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.investor_requests') IS NOT NULL THEN
    DROP POLICY IF EXISTS investor_requests_public_insert ON public.investor_requests;
    CREATE POLICY investor_requests_public_insert ON public.investor_requests
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

    DROP POLICY IF EXISTS investor_requests_admin_manage ON public.investor_requests;
    CREATE POLICY investor_requests_admin_manage ON public.investor_requests
    FOR ALL TO authenticated
    USING (app.is_admin())
    WITH CHECK (app.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.meeting_bookings') IS NOT NULL THEN
    DROP POLICY IF EXISTS meeting_bookings_public_insert ON public.meeting_bookings;
    CREATE POLICY meeting_bookings_public_insert ON public.meeting_bookings
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

    DROP POLICY IF EXISTS meeting_bookings_admin_manage ON public.meeting_bookings;
    CREATE POLICY meeting_bookings_admin_manage ON public.meeting_bookings
    FOR ALL TO authenticated
    USING (app.is_admin())
    WITH CHECK (app.is_admin());
  END IF;
END $$;

-- Legacy/internal tables: explicitly deny client roles. Service-role/server
-- operations continue to bypass RLS and preserve existing backend workflows.
-- Some legacy objects may not exist in a clean schema, so only create the
-- policy when the corresponding table is present.
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
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I_client_deny ON public.%I', t, t);
      EXECUTE format('CREATE POLICY %I_client_deny ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', t, t);
    END IF;
  END LOOP;
END $$;
