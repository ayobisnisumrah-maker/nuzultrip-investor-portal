-- =============================================================================
-- Realtime messaging
--
-- Publish new chat rows through Supabase Realtime. RLS remains authoritative:
-- authenticated clients only receive rows they are permitted to select.
-- =============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;
