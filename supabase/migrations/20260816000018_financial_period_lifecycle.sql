-- -----------------------------------------------------------------------------
-- Financial period lifecycle hardening
--
-- Authorization model:
--   financial_periods.update
--     -> metadata only
--
--   financial_periods.close
--     -> lifecycle transitions only
--
-- Database remains authoritative even if an application/server action is
-- bypassed.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Lifecycle guard
-- -----------------------------------------------------------------------------

create or replace function app.guard_financial_period_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  /*
   * Metadata changes require financial_periods.update.
   *
   * Status changes are handled separately and require
   * financial_periods.close.
   */
  if new.status is distinct from old.status then

    if not app.has_permission('financial_periods.close') then
      raise exception
        'Changing financial period status requires financial_periods.close.'
        using errcode = '42501';
    end if;

    /*
     * Allowed lifecycle:
     *
     * open    -> closed
     * open    -> locked
     * closed  -> locked
     *
     * locked has no outgoing transition.
     */
    if old.status = 'open' and new.status in ('closed', 'locked') then
      return new;
    end if;

    if old.status = 'closed' and new.status = 'locked' then
      return new;
    end if;

    raise exception
      'Financial period status cannot move from % to %.',
      old.status,
      new.status
      using errcode = '23514';
  end if;

  /*
   * If status is unchanged, this is a metadata update.
   *
   * Locked periods are immutable.
   */
  if old.status = 'locked' then
    raise exception
      'Locked financial periods cannot be modified.'
      using errcode = '42501';
  end if;

  if not app.has_permission('financial_periods.update') then
    raise exception
      'Updating financial period metadata requires financial_periods.update.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function app.guard_financial_period_update() is
  'Enforces financial period lifecycle transitions and separates metadata update authorization from close/lock authorization.';

drop trigger if exists financial_periods_guard_update
  on public.financial_periods;

create trigger financial_periods_guard_update
  before update on public.financial_periods
  for each row
  execute function app.guard_financial_period_update();

-- -----------------------------------------------------------------------------
-- RLS
--
-- Both metadata editors and lifecycle operators need UPDATE at the PostgreSQL
-- privilege/RLS layer. The trigger above determines which kind of update each
-- permission is actually allowed to perform.
-- -----------------------------------------------------------------------------

drop policy if exists financial_periods_update_admin
  on public.financial_periods;

create policy financial_periods_update_admin
  on public.financial_periods
  for update
  to authenticated
  using (
    app.has_permission('financial_periods.update')
    or app.has_permission('financial_periods.close')
  )
  with check (
    app.has_permission('financial_periods.update')
    or app.has_permission('financial_periods.close')
  );

-- -----------------------------------------------------------------------------
-- Explicitly preserve existing INSERT authorization.
-- -----------------------------------------------------------------------------

drop policy if exists financial_periods_insert_admin
  on public.financial_periods;

create policy financial_periods_insert_admin
  on public.financial_periods
  for insert
  to authenticated
  with check (app.has_permission('financial_periods.create'));

-- -----------------------------------------------------------------------------
-- Explicitly preserve existing SELECT authorization.
-- -----------------------------------------------------------------------------

drop policy if exists financial_periods_select_admin
  on public.financial_periods;

create policy financial_periods_select_admin
  on public.financial_periods
  for select
  to authenticated
  using (app.has_permission('financial_periods.view'));

