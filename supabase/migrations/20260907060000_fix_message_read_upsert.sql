-- Allow the existing authenticated upsert path to refresh read_at for the
-- current user's own read receipt while preserving RLS ownership checks.

grant update (read_at) on public.message_reads to authenticated;

drop policy if exists message_reads_update_own on public.message_reads;
create policy message_reads_update_own
  on public.message_reads for update to authenticated
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());
