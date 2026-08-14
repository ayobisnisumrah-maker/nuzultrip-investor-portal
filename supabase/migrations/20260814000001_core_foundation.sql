-- =============================================================================
-- Core foundation
--
-- The `app` schema (helper functions), shared trigger functions, and the
-- deny-by-default privilege baseline that every later migration relies on.
--
-- See docs/DATABASE.md §1 and docs/SECURITY.md §4.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Helper schema
--
-- Authorisation helpers live here rather than in `public` so they are never
-- exposed through PostgREST. Only `usage` is granted; execute rights are given
-- per function.
-- -----------------------------------------------------------------------------
create schema if not exists app;

revoke all on schema app from public;
grant usage on schema app to anon, authenticated, service_role;

comment on schema app is
  'Internal helper functions (authorisation, event emission). Not exposed via the API.';

-- -----------------------------------------------------------------------------
-- Deny-by-default privileges
--
-- Supabase grants ALL on new public tables to anon and authenticated by
-- default. That is the opposite of what this system wants: a table added in
-- future must be unreachable until someone deliberately grants access to it.
--
-- RLS alone would not be enough here — a table with RLS enabled and no policy
-- is already closed, but a developer who enables RLS and forgets a policy on a
-- *new* table would otherwise still have handed out the table privilege.
-- -----------------------------------------------------------------------------
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- The service role, by contrast, needs privileges on everything.
--
-- `bypassrls` only exempts it from *policies*; table-level GRANTs still apply.
-- Without this the role can bypass RLS and still be told "permission denied for
-- table", which is a confusing failure precisely where it is least welcome —
-- account provisioning and the storage broker.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- -----------------------------------------------------------------------------
-- Shared trigger functions
-- -----------------------------------------------------------------------------

-- `updated_at` is maintained by the database, never by application code, so it
-- cannot be forgotten or spoofed by a client.
create or replace function app.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function app.set_updated_at() is
  'BEFORE UPDATE trigger: stamps updated_at. Attach to every table with that column.';

-- Blocks UPDATE and DELETE outright. Used by append-only tables (audit log,
-- status history, published versions) so immutability is a property of the
-- schema rather than a convention.
create or replace function app.forbid_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception
    'Table %.% is append-only; % is not permitted.',
    tg_table_schema, tg_table_name, tg_op
    using errcode = '42501';
end;
$$;

comment on function app.forbid_mutation() is
  'BEFORE UPDATE OR DELETE trigger: raises. For append-only tables.';

-- Prevents a client from writing columns the server owns (created_by,
-- published_at, and similar). Compares OLD and NEW for the named columns.
create or replace function app.forbid_column_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  col text;
  old_value text;
  new_value text;
begin
  foreach col in array tg_argv loop
    execute format('select ($1).%I::text, ($2).%I::text', col, col)
      into old_value, new_value
      using old, new;
    if old_value is distinct from new_value then
      raise exception 'Column %.% is immutable.', tg_table_name, col
        using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

comment on function app.forbid_column_change() is
  'BEFORE UPDATE trigger taking column names as arguments; raises if any change.';

-- Distinguishes a genuine edit of a published artefact from the database's own
-- referential housekeeping.
--
-- Version tables reference the staff who authored and approved them with
-- `on delete set null`, so that removing an account does not erase history.
-- That nulling is an UPDATE, and a naive immutability guard would reject it —
-- which would make staff accounts undeletable and, worse, would tie a person's
-- identity permanently to a record they can no longer be removed from.
--
-- Returns true when the only difference is an actor reference being nulled.
create or replace function app.published_change_is_referential(p_old jsonb, p_new jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    (p_old - 'created_by' - 'approved_by') = (p_new - 'created_by' - 'approved_by')
    and (p_new -> 'created_by' = 'null'::jsonb or p_new -> 'created_by' = p_old -> 'created_by')
    and (p_new -> 'approved_by' = 'null'::jsonb or p_new -> 'approved_by' = p_old -> 'approved_by');
$$;

comment on function app.published_change_is_referential(jsonb, jsonb) is
  'True when the only change to a published row is an actor foreign key being set to null.';

-- -----------------------------------------------------------------------------
-- Session helpers
-- -----------------------------------------------------------------------------

-- Every policy uses this rather than calling auth.uid() inline, so the
-- `(select ...)` init-plan optimisation is applied consistently. Without it
-- Postgres re-evaluates the function per row (docs/SECURITY.md §4).
create or replace function app.current_user_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select (select auth.uid());
$$;

grant execute on function app.current_user_id() to anon, authenticated;

comment on function app.current_user_id() is
  'The authenticated user id, or NULL. Stable so it is evaluated once per statement.';
