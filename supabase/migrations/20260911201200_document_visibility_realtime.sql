-- =============================================================================
-- Document visibility realtime invalidation
--
-- A visibility change can remove a published document from a reader's RLS
-- result set without changing its publication status. The original realtime
-- trigger only reacted to status/published-version changes and only sent the
-- generic state_changed event to admins. That left public/investor clients with
-- stale UI until periodic reconciliation.
--
-- Broadcast identifiers only. Clients refetch through their normal RLS-guarded
-- query, so this migration does not widen document access.
-- =============================================================================

create or replace function app.emit_document_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text := app.current_actor_type();
  changed boolean :=
    new.status is distinct from old.status
    or new.published_version_id is distinct from old.published_version_id
    or new.visibility is distinct from old.visibility;
begin
  if not changed then
    return null;
  end if;

  -- Admin surfaces always reconcile document state.
  perform app.emit_event(
    app.topic_admin(), 'document.state_changed', 'document', new.id, actor
  );

  -- Notify every broad audience that could have gained OR lost this document.
  -- The event contains no business data; each client refetches under RLS.
  if (old.status = 'published' and old.visibility = 'public')
     or (new.status = 'published' and new.visibility = 'public') then
    perform app.emit_event(
      app.topic_portal(), 'document.state_changed', 'document', new.id, actor
    );
  end if;

  if (old.status = 'published' and old.visibility = 'investors')
     or (new.status = 'published' and new.visibility = 'investors') then
    perform app.emit_event(
      app.topic_all_investors(), 'document.state_changed', 'document', new.id, actor
    );
  end if;

  -- Restricted documents must not leak even their identifiers to all investors.
  -- Only investors with a live grant receive the invalidation when restricted is
  -- either the old or new published audience.
  if (old.status = 'published' and old.visibility = 'restricted')
     or (new.status = 'published' and new.visibility = 'restricted') then
    perform app.emit_event(
      app.topic_investor(g.investor_id),
      'document.state_changed',
      'document',
      new.id,
      actor
    )
    from public.document_access_grants g
    where g.document_id = new.id
      and g.revoked_at is null;
  end if;

  -- Preserve the existing publication-specific signal for newly/currently
  -- published content. Consumers may use this for badges/notifications while
  -- state_changed handles authoritative list invalidation.
  if new.status = 'published' then
    if new.visibility = 'public' then
      perform app.emit_event(
        app.topic_portal(), 'document.published', 'document', new.id, actor
      );
    elsif new.visibility = 'investors' then
      perform app.emit_event(
        app.topic_all_investors(), 'document.published', 'document', new.id, actor
      );
    elsif new.visibility = 'restricted' then
      perform app.emit_event(
        app.topic_investor(g.investor_id),
        'document.published',
        'document',
        new.id,
        actor
      )
      from public.document_access_grants g
      where g.document_id = new.id
        and g.revoked_at is null;
    end if;
  end if;

  return null;
end;
$$;
