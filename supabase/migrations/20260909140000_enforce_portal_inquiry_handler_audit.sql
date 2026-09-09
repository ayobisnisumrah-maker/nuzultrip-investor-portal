-- Preserve a reliable handler identity on portal inquiry lifecycle changes.
-- Admin clients already require inquiries.handle via application guards/RLS,
-- but the row itself previously stored handled_at without handled_by.

create or replace function app.set_portal_inquiry_handler()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if new.status is distinct from old.status then
    if new.status = 'new'::public.inquiry_status then
      new.handled_at := null;
      new.handled_by := null;
    else
      if v_actor is null then
        raise exception 'Authenticated actor required to handle portal inquiry.' using errcode = '42501';
      end if;

      new.handled_at := coalesce(new.handled_at, now());
      new.handled_by := v_actor;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists portal_inquiries_set_handler on public.portal_inquiries;
create trigger portal_inquiries_set_handler
before update of status on public.portal_inquiries
for each row
execute function app.set_portal_inquiry_handler();

-- Backfill cannot safely infer the historical actor. Leave handled_by NULL for
-- legacy handled rows; audit_logs remains the authoritative historical source.
comment on column public.portal_inquiries.handled_by is
  'Admin auth.uid() that most recently moved the inquiry out of new; legacy handled rows may be null.';
