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
  'Published pages require published_at; archived pages clear it; editorial states may retain the timestamp of the last public snapshot.';

commit;
