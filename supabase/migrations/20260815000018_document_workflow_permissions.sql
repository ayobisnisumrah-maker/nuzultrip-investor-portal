-- =============================================================================
-- Document workflow permissions
--
-- The original document RLS policy correctly protected ordinary edits with
-- documents.update, but did not allow the dedicated review/approve/publish/
-- archive permissions to perform their own lifecycle step. This migration
-- makes the database enforce those separate authorities as well as the state
-- machine; Server Actions remain the application entry point, never the sole
-- control.
-- =============================================================================

create or replace function app.document_workflow_permission_allowed(
  p_target public.publication_status
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_target
    when 'review' then app.has_permission('documents.review')
    when 'approved' then app.has_permission('documents.approve')
    when 'published' then app.has_permission('documents.publish')
    when 'archived' then app.has_permission('documents.archive')
    else false
  end;
$$;

grant execute on function app.document_workflow_permission_allowed(public.publication_status)
  to authenticated;

create or replace function app.guard_document_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if not app.publication_transition_allowed(old.status, new.status) then
      raise exception 'Document status cannot move from % to %.', old.status, new.status
        using errcode = '23514';
    end if;
    if not app.document_workflow_permission_allowed(new.status) then
      raise exception 'Missing permission for document transition to %.', new.status
        using errcode = '42501';
    end if;
    if new.status = 'published' and new.published_version_id is distinct from new.current_version_id then
      raise exception 'A published document must publish its current version.' using errcode = '23514';
    end if;
    if new.status = 'archived' then
      new.archived_at := coalesce(new.archived_at, now());
    end if;
  elsif to_jsonb(new) is distinct from to_jsonb(old)
    and not app.has_permission('documents.update') then
    raise exception 'Missing documents.update permission.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger documents_guard_update
  before update on public.documents
  for each row execute function app.guard_document_update();

create or replace function app.guard_document_version_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
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

  if new.status = 'published' then new.published_at := coalesce(new.published_at, now()); end if;
  return new;
end;
$$;

drop policy documents_update_admin on public.documents;
create policy documents_update_admin
  on public.documents for update to authenticated
  using (
    app.has_permission('documents.update')
    or app.has_permission('documents.review')
    or app.has_permission('documents.approve')
    or app.has_permission('documents.publish')
    or app.has_permission('documents.archive')
  )
  with check (
    app.has_permission('documents.update')
    or app.has_permission('documents.review')
    or app.has_permission('documents.approve')
    or app.has_permission('documents.publish')
    or app.has_permission('documents.archive')
  );

drop policy document_versions_update_admin on public.document_versions;
create policy document_versions_update_admin
  on public.document_versions for update to authenticated
  using (
    app.has_permission('documents.update')
    or app.has_permission('documents.review')
    or app.has_permission('documents.approve')
    or app.has_permission('documents.publish')
  )
  with check (
    app.has_permission('documents.update')
    or app.has_permission('documents.review')
    or app.has_permission('documents.approve')
    or app.has_permission('documents.publish')
  );
