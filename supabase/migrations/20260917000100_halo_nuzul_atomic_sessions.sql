-- Halo Nuzul server-owned session quota.
-- Browser cookies contain only an opaque random session id. Only its SHA-256
-- digest is persisted. Product quota is reserved and committed atomically so
-- concurrent requests cannot exceed the ten-successful-answer limit.

create table public.halo_nuzul_sessions (
  session_id text primary key,
  committed_questions integer not null default 0,
  reserved_questions integer not null default 0,
  window_started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  updated_at timestamptz not null default now(),
  constraint halo_nuzul_session_hash_format check (session_id ~ '^[0-9a-f]{64}$'),
  constraint halo_nuzul_committed_range check (committed_questions between 0 and 10),
  constraint halo_nuzul_reserved_range check (reserved_questions between 0 and 10),
  constraint halo_nuzul_total_range check (committed_questions + reserved_questions <= 10)
);

create table public.halo_nuzul_reservations (
  reservation_id uuid primary key,
  session_id text not null references public.halo_nuzul_sessions(session_id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  committed_at timestamptz,
  released_at timestamptz,
  constraint halo_nuzul_reservation_terminal_once check (not (committed_at is not null and released_at is not null))
);

create index halo_nuzul_sessions_expiry_idx on public.halo_nuzul_sessions(expires_at);
create index halo_nuzul_reservations_session_idx on public.halo_nuzul_reservations(session_id);
create index halo_nuzul_reservations_expiry_idx on public.halo_nuzul_reservations(expires_at) where committed_at is null and released_at is null;

alter table public.halo_nuzul_sessions enable row level security;
alter table public.halo_nuzul_sessions force row level security;
alter table public.halo_nuzul_reservations enable row level security;
alter table public.halo_nuzul_reservations force row level security;

revoke all on public.halo_nuzul_sessions from public, anon, authenticated;
revoke all on public.halo_nuzul_reservations from public, anon, authenticated;

create or replace function public.reserve_halo_nuzul_question(
  p_session_id text,
  p_reservation_id uuid,
  p_window_seconds integer default 86400,
  p_reservation_seconds integer default 120
)
returns table (allowed boolean, questions_remaining integer, session_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.halo_nuzul_sessions%rowtype;
  stale_count integer;
begin
  if p_session_id !~ '^[0-9a-f]{64}$' or p_window_seconds < 60 or p_reservation_seconds < 10 then
    raise exception 'Invalid Halo Nuzul session parameters.' using errcode = '22023';
  end if;

  insert into public.halo_nuzul_sessions(session_id, expires_at)
  values (p_session_id, now() + make_interval(secs => p_window_seconds))
  on conflict (session_id) do nothing;

  select * into s from public.halo_nuzul_sessions where session_id = p_session_id for update;

  if s.expires_at <= now() then
    delete from public.halo_nuzul_reservations where session_id = p_session_id;
    update public.halo_nuzul_sessions
      set committed_questions = 0, reserved_questions = 0,
          window_started_at = now(), expires_at = now() + make_interval(secs => p_window_seconds), updated_at = now()
      where session_id = p_session_id
      returning * into s;
  end if;

  with released as (
    update public.halo_nuzul_reservations
      set released_at = now()
      where session_id = p_session_id and committed_at is null and released_at is null and expires_at <= now()
      returning 1
  ) select count(*)::integer into stale_count from released;

  if stale_count > 0 then
    update public.halo_nuzul_sessions
      set reserved_questions = greatest(reserved_questions - stale_count, 0), updated_at = now()
      where session_id = p_session_id
      returning * into s;
  end if;

  if s.committed_questions + s.reserved_questions >= 10 then
    return query select false, 0, s.expires_at;
    return;
  end if;

  insert into public.halo_nuzul_reservations(reservation_id, session_id, expires_at)
  values (p_reservation_id, p_session_id, now() + make_interval(secs => p_reservation_seconds));

  update public.halo_nuzul_sessions
    set reserved_questions = reserved_questions + 1, updated_at = now()
    where session_id = p_session_id
    returning * into s;

  return query select true, greatest(10 - s.committed_questions - s.reserved_questions, 0), s.expires_at;
end;
$$;

create or replace function public.commit_halo_nuzul_question(p_session_id text, p_reservation_id uuid)
returns table (committed boolean, questions_remaining integer, session_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.halo_nuzul_sessions%rowtype;
  changed integer;
begin
  if p_session_id !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid Halo Nuzul session parameters.' using errcode = '22023';
  end if;
  select * into s from public.halo_nuzul_sessions where session_id = p_session_id for update;
  if not found then return query select false, 0, now(); return; end if;

  update public.halo_nuzul_reservations
    set committed_at = now()
    where reservation_id = p_reservation_id and session_id = p_session_id
      and committed_at is null and released_at is null and expires_at > now();
  get diagnostics changed = row_count;
  if changed <> 1 then
    return query select false, greatest(10 - s.committed_questions - s.reserved_questions, 0), s.expires_at;
    return;
  end if;

  update public.halo_nuzul_sessions
    set committed_questions = committed_questions + 1,
        reserved_questions = greatest(reserved_questions - 1, 0), updated_at = now()
    where session_id = p_session_id
    returning * into s;

  return query select true, greatest(10 - s.committed_questions - s.reserved_questions, 0), s.expires_at;
end;
$$;

create or replace function public.release_halo_nuzul_question(p_session_id text, p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare changed integer;
begin
  if p_session_id !~ '^[0-9a-f]{64}$' then return false; end if;
  perform 1 from public.halo_nuzul_sessions where session_id = p_session_id for update;
  if not found then return false; end if;

  update public.halo_nuzul_reservations set released_at = now()
    where reservation_id = p_reservation_id and session_id = p_session_id
      and committed_at is null and released_at is null;
  get diagnostics changed = row_count;
  if changed = 1 then
    update public.halo_nuzul_sessions
      set reserved_questions = greatest(reserved_questions - 1, 0), updated_at = now()
      where session_id = p_session_id;
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.reserve_halo_nuzul_question(text, uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.commit_halo_nuzul_question(text, uuid) from public, anon, authenticated;
revoke all on function public.release_halo_nuzul_question(text, uuid) from public, anon, authenticated;
grant execute on function public.reserve_halo_nuzul_question(text, uuid, integer, integer) to service_role;
grant execute on function public.commit_halo_nuzul_question(text, uuid) to service_role;
grant execute on function public.release_halo_nuzul_question(text, uuid) to service_role;
