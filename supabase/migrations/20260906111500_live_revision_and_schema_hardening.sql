-- =============================================================================
-- Live revision invariant + schema hardening
-- =============================================================================
-- A published portal page may temporarily re-enter draft/review/approved while
-- its last published snapshot stays public. In that state, published_at is the
-- marker that a public snapshot exists, so it must remain populated.
-- =============================================================================

begin;

alter table public.portal_pages
  drop constraint if exists portal_pages_publication_timestamp_consistency;

alter table public.portal_pages
  add constraint portal_pages_publication_timestamp_consistency
  check (
    (status = 'published' and published_at is not null)
    or (status = 'archived' and published_at is null)
    or status in ('draft', 'review', 'approved')
  );

comment on constraint portal_pages_publication_timestamp_consistency
  on public.portal_pages is
  'Published pages require published_at; archived pages clear it; editorial states may retain it only to represent a previously published live snapshot.';

-- Database-owner maintenance and migration fixtures must be able to construct a
-- valid historical document lifecycle without impersonating an application
-- principal. Normal application roles (anon/authenticated/service_role) remain
-- subject to the workflow guard.
create or replace function app.guard_document_version_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'postgres' then
    if new.status = 'published' then
      new.published_at := coalesce(new.published_at, now());
    end if;
    return new;
  end if;

  if old.status = 'published' then
    if app.published_change_is_referential(to_jsonb(old), to_jsonb(new)) then
      return new;
    end if;
    raise exception
      'Version % of document % is published and cannot be modified. Create a new version instead.',
      old.version_number, old.document_id using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not app.publication_transition_allowed(old.status, new.status) then
      raise exception 'Publication status cannot move from % to %.', old.status, new.status
        using errcode = '23514';
    end if;
    if not app.document_workflow_permission_allowed(new.status) then
      raise exception 'Missing permission for document version transition to %.', new.status
        using errcode = '42501';
    end if;
  elsif to_jsonb(new) is distinct from to_jsonb(old)
    and not app.has_permission('documents.update') then
    raise exception 'Missing documents.update permission.' using errcode = '42501';
  end if;

  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

-- Force RLS uniformly across the public schema. BYPASSRLS service roles are
-- unaffected, while direct table owners no longer accidentally bypass policy
-- checks in ordinary owner sessions.
do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', r.relname);
    execute format('alter table public.%I force row level security', r.relname);
  end loop;
end;
$$;

-- Foreign-key indexes used by policy joins and operational lookups.
create index if not exists data_room_documents_category_id_idx
  on public.data_room_documents(category_id);
create index if not exists meetings_investor_id_idx
  on public.meetings(investor_id);
create index if not exists ownership_holdings_created_by_idx
  on public.ownership_holdings(created_by);
create index if not exists ownership_holdings_updated_by_idx
  on public.ownership_holdings(updated_by);
create index if not exists ownership_inheritance_approved_by_idx
  on public.ownership_inheritance(approved_by);
create index if not exists ownership_offerings_created_by_idx
  on public.ownership_offerings(created_by);
create index if not exists ownership_offerings_updated_by_idx
  on public.ownership_offerings(updated_by);
create index if not exists ownership_transfers_approved_by_idx
  on public.ownership_transfers(approved_by);
create index if not exists ownership_transfers_completed_by_idx
  on public.ownership_transfers(completed_by);
create index if not exists ownership_transfers_processing_by_idx
  on public.ownership_transfers(processing_by);
create index if not exists profit_distribution_allocations_holding_id_idx
  on public.profit_distribution_allocations(holding_id);
create index if not exists profit_distributions_approved_by_idx
  on public.profit_distributions(approved_by);
create index if not exists profit_distributions_created_by_idx
  on public.profit_distributions(created_by);
create index if not exists profit_distributions_updated_by_idx
  on public.profit_distributions(updated_by);

commit;
