-- =============================================================================
-- Ownership Offerings Access
-- =============================================================================
--
-- The ownership_offerings domain is accessed through the server authorization
-- layer. The authenticated database session still needs the minimum SQL
-- privileges and RLS policies required by the authorized server action.
--
-- Permission checks remain enforced by:
--   ownership_offerings.view
--   ownership_offerings.create
--   ownership_offerings.update
--   ownership_offerings.publish
--
-- No DELETE policy is intentionally provided.
-- Ownership offerings are lifecycle-managed, not hard-deleted.
-- =============================================================================

revoke all on public.ownership_offerings from anon;

grant select on public.ownership_offerings to authenticated;
grant insert on public.ownership_offerings to authenticated;
grant update on public.ownership_offerings to authenticated;

-- ---------------------------------------------------------------------------
-- SELECT
-- ---------------------------------------------------------------------------

drop policy if exists ownership_offerings_select_admin
  on public.ownership_offerings;

create policy ownership_offerings_select_admin
  on public.ownership_offerings
  for select
  to authenticated
  using (
    app.has_permission('ownership_offerings.view')
  );

-- ---------------------------------------------------------------------------
-- INSERT
-- ---------------------------------------------------------------------------

drop policy if exists ownership_offerings_insert_admin
  on public.ownership_offerings;

create policy ownership_offerings_insert_admin
  on public.ownership_offerings
  for insert
  to authenticated
  with check (
    app.has_permission('ownership_offerings.create')
  );

-- ---------------------------------------------------------------------------
-- UPDATE
-- ---------------------------------------------------------------------------

drop policy if exists ownership_offerings_update_admin
  on public.ownership_offerings;

create policy ownership_offerings_update_admin
  on public.ownership_offerings
  for update
  to authenticated
  using (
    app.has_permission('ownership_offerings.update')
  )
  with check (
    app.has_permission('ownership_offerings.update')
  );
