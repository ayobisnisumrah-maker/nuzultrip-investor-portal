-- =============================================================================
-- Rate limiting
--
-- In Postgres rather than in process memory, because an in-memory counter is
-- per-instance: it resets on deploy and is trivially bypassed by any deployment
-- with more than one server. A limit that only sometimes applies is not a limit.
--
-- The table and the function are reachable **only** by the service role. They
-- are not exposed to `anon` or `authenticated` at all, so a client cannot burn
-- another caller's quota by guessing a bucket name.
--
-- See docs/SECURITY.md §10.
-- =============================================================================

create table public.rate_limits (
  bucket text primary key,
  hits integer not null default 0,
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rate_limits_hits_non_negative check (hits >= 0)
);

-- Lets the sweeper find expired windows without scanning the whole table.
create index rate_limits_window_idx on public.rate_limits (window_started_at);

comment on table public.rate_limits is
  'Fixed-window counters. Service-role only; never exposed to clients.';

-- Atomic consume-and-report. The upsert is a single statement, so two
-- concurrent requests cannot both read "0 hits" and both proceed.
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  window_length interval := make_interval(secs => p_window_seconds);
  current_hits integer;
  started timestamptz;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit configuration.' using errcode = '22023';
  end if;

  insert into public.rate_limits as rl (bucket, hits, window_started_at, updated_at)
  values (p_bucket, 1, now(), now())
  on conflict (bucket) do update
    set
      -- Reset the counter when the previous window has elapsed, otherwise
      -- increment within it.
      hits = case
        when rl.window_started_at + window_length < now() then 1
        else rl.hits + 1
      end,
      window_started_at = case
        when rl.window_started_at + window_length < now() then now()
        else rl.window_started_at
      end,
      updated_at = now()
  returning rl.hits, rl.window_started_at into current_hits, started;

  return query
  select
    current_hits <= p_limit,
    greatest(p_limit - current_hits, 0),
    case
      when current_hits <= p_limit then 0
      else greatest(ceil(extract(epoch from (started + window_length - now())))::integer, 1)
    end;
end;
$$;

-- Removes windows that have long since expired. Called by scheduled maintenance.
create or replace function public.prune_rate_limits(p_older_than_seconds integer default 86400)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from public.rate_limits
  where updated_at < now() - make_interval(secs => p_older_than_seconds);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

alter table public.rate_limits enable row level security;
alter table public.rate_limits force row level security;

revoke all on public.rate_limits from anon, authenticated;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.prune_rate_limits(integer) from public, anon, authenticated;

grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.prune_rate_limits(integer) to service_role;

-- No policy for anon or authenticated: the table is deliberately unreachable
-- by any client.
