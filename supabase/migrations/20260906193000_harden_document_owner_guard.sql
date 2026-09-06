-- =============================================================================
-- Harden document publication guards for direct owner/fixture sessions
-- =============================================================================
-- Migration 20260906111500 introduced a narrow postgres/no-JWT fixture bypass so
-- historical rows can be assembled during migrations and tests. The bypass was
-- too broad for document versions: it also allowed a direct owner session to
-- mutate an already-published version and to skip draft -> review -> approved.
--
-- Keep the fixture convenience, but continue enforcing the two invariants that
-- must hold even for owner sessions:
--   1. published document versions are immutable except referential cleanup;
--   2. publication status transitions must follow the legal lifecycle.
-- =============================================================================

begin;

create or replace function app.guard_document_version_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_fixture_session boolean :=
    current_user = 'postgres'
    and nullif(current_setting('request.jwt.claims', true), '') is null;
begin
  -- Immutability is an invariant of the artefact itself, not merely an
  -- application permission check. Preserve the existing referential-cleanup
  -- exception so staff deletion can still null author references.
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

    -- Direct postgres fixture sessions may construct a legal historical
    -- lifecycle without carrying application permissions. Authenticated API
    -- traffic must still hold the workflow permission for the target state.
    if not v_owner_fixture_session
       and not app.document_workflow_permission_allowed(new.status) then
      raise exception 'Missing permission for document version transition to %.', new.status
        using errcode = '42501';
    end if;
  elsif to_jsonb(new) is distinct from to_jsonb(old)
    and not v_owner_fixture_session
    and not app.has_permission('documents.update') then
    raise exception 'Missing documents.update permission.' using errcode = '42501';
  end if;

  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;

commit;
