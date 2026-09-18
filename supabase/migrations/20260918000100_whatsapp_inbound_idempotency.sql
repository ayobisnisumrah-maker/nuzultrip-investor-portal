-- Durable idempotency for inbound WhatsApp Cloud API messages.
create table public.whatsapp_inbound_events (
  wamid text primary key,
  sender_hash text not null check (sender_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'processing' check (status in ('processing','sending','sent','failed')),
  attempts integer not null default 1 check (attempts between 1 and 20),
  lease_expires_at timestamptz not null default (now() + interval '2 minutes'),
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);
create index whatsapp_inbound_events_status_lease_idx on public.whatsapp_inbound_events(status, lease_expires_at);
alter table public.whatsapp_inbound_events enable row level security;
alter table public.whatsapp_inbound_events force row level security;
create policy whatsapp_inbound_events_service_role_all on public.whatsapp_inbound_events for all to service_role using (true) with check (true);
revoke all on public.whatsapp_inbound_events from public, anon, authenticated;

create or replace function public.claim_whatsapp_inbound_event(p_wamid text, p_sender_hash text, p_lease_seconds integer default 120)
returns boolean language plpgsql security definer set search_path = '' as $$
declare claimed boolean := false;
begin
  if length(p_wamid) < 8 or length(p_wamid) > 512 or p_sender_hash !~ '^[0-9a-f]{64}$' or p_lease_seconds < 30 then
    raise exception 'Invalid WhatsApp event claim.' using errcode='22023';
  end if;
  insert into public.whatsapp_inbound_events(wamid, sender_hash, lease_expires_at)
  values (p_wamid, p_sender_hash, now() + make_interval(secs => p_lease_seconds))
  on conflict (wamid) do nothing;
  if found then return true; end if;
  update public.whatsapp_inbound_events
    set status='processing', attempts=attempts+1, lease_expires_at=now()+make_interval(secs => p_lease_seconds), updated_at=now(), last_error=null
    where wamid=p_wamid and status='failed' and attempts < 20
    returning true into claimed;
  if claimed then return true; end if;
  update public.whatsapp_inbound_events
    set attempts=attempts+1, lease_expires_at=now()+make_interval(secs => p_lease_seconds), updated_at=now()
    where wamid=p_wamid and status='processing' and lease_expires_at <= now() and attempts < 20
    returning true into claimed;
  return coalesce(claimed,false);
end; $$;

create or replace function public.begin_whatsapp_inbound_delivery(p_wamid text)
returns boolean language sql security definer set search_path='' as $
  update public.whatsapp_inbound_events set status='sending', updated_at=now(), last_error=null
  where wamid=p_wamid and status='processing' returning true;
$;

create or replace function public.complete_whatsapp_inbound_event(p_wamid text, p_provider_message_id text)
returns boolean language sql security definer set search_path='' as $$
  update public.whatsapp_inbound_events set status='sent', provider_message_id=p_provider_message_id, sent_at=now(), updated_at=now(), last_error=null
  where wamid=p_wamid and status='sending' returning true;
$;
create or replace function public.fail_whatsapp_inbound_event(p_wamid text, p_error text)
returns boolean language sql security definer set search_path='' as $$
  update public.whatsapp_inbound_events set status='failed', last_error=left(coalesce(p_error,'unknown'),500), updated_at=now()
  where wamid=p_wamid and status in ('processing','sending') returning true;
$;
revoke all on function public.claim_whatsapp_inbound_event(text,text,integer) from public,anon,authenticated;
revoke all on function public.begin_whatsapp_inbound_delivery(text) from public,anon,authenticated;
revoke all on function public.complete_whatsapp_inbound_event(text,text) from public,anon,authenticated;
revoke all on function public.fail_whatsapp_inbound_event(text,text) from public,anon,authenticated;
grant execute on function public.claim_whatsapp_inbound_event(text,text,integer) to service_role;
grant execute on function public.begin_whatsapp_inbound_delivery(text) to service_role;
grant execute on function public.complete_whatsapp_inbound_event(text,text) to service_role;
grant execute on function public.fail_whatsapp_inbound_event(text,text) to service_role;
