-- Harden legacy tables that are retained for compatibility/history but are not
-- part of the current public application surface.
--
-- These objects are intentionally optional: some installations no longer
-- contain the legacy tables. Keep this migration replay-safe so a clean
-- database can apply the complete migration history without failing on an
-- absent compatibility table.

DO $$
DECLARE
  table_name text;
  legacy_tables constant text[] := ARRAY[
    'settings',
    'legacy_investors',
    'meetings',
    'contact_messages',
    'legacy_audit_logs',
    'legacy_investor_status_history',
    'investor_requests',
    'meeting_bookings',
    'user_roles'
  ];
BEGIN
  FOREACH table_name IN ARRAY legacy_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE public.%I FROM anon, authenticated',
        table_name
      );

      EXECUTE format(
        'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
        table_name
      );
    END IF;
  END LOOP;
END
$$;
