-- Enforce calendar-aligned financial periods for new definitions without
-- rewriting or invalidating historical legacy rows already stored in production.

create or replace function app.validate_financial_period_calendar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_expected_start date;
  v_expected_end date;
  v_expected_month integer;
begin
  -- UPDATE OF fires when a column is named even when its value is unchanged.
  -- Preserve legacy rows unless the structural period definition actually changes.
  if tg_op = 'UPDATE'
     and new.period_type is not distinct from old.period_type
     and new.fiscal_year is not distinct from old.fiscal_year
     and new.period_index is not distinct from old.period_index
     and new.starts_on is not distinct from old.starts_on
     and new.ends_on is not distinct from old.ends_on then
    return new;
  end if;

  if new.period_type is null
     or new.fiscal_year is null
     or new.period_index is null
     or new.starts_on is null
     or new.ends_on is null then
    raise exception 'Financial period definition fields must not be null'
      using errcode = '23514';
  end if;

  case new.period_type
    when 'monthly' then
      if new.period_index not between 1 and 12 then
        raise exception 'Invalid monthly financial period index: %', new.period_index
          using errcode = '23514';
      end if;

      begin
        v_expected_start := pg_catalog.make_date(new.fiscal_year, new.period_index, 1);
      exception
        when datetime_field_overflow then
          raise exception 'Invalid fiscal year for financial period: %', new.fiscal_year
            using errcode = '23514';
      end;

      v_expected_end := (v_expected_start + interval '1 month - 1 day')::date;

    when 'quarterly' then
      if new.period_index not between 1 and 4 then
        raise exception 'Invalid quarterly financial period index: %', new.period_index
          using errcode = '23514';
      end if;

      v_expected_month := ((new.period_index - 1) * 3) + 1;

      begin
        v_expected_start := pg_catalog.make_date(new.fiscal_year, v_expected_month, 1);
      exception
        when datetime_field_overflow then
          raise exception 'Invalid fiscal year for financial period: %', new.fiscal_year
            using errcode = '23514';
      end;

      v_expected_end := (v_expected_start + interval '3 months - 1 day')::date;

    when 'yearly' then
      if new.period_index <> 1 then
        raise exception 'Invalid yearly financial period index: %', new.period_index
          using errcode = '23514';
      end if;

      begin
        v_expected_start := pg_catalog.make_date(new.fiscal_year, 1, 1);
        v_expected_end := pg_catalog.make_date(new.fiscal_year, 12, 31);
      exception
        when datetime_field_overflow then
          raise exception 'Invalid fiscal year for financial period: %', new.fiscal_year
            using errcode = '23514';
      end;

    else
      raise exception 'Unsupported financial period type: %', new.period_type
        using errcode = '23514';
  end case;

  if new.starts_on is distinct from v_expected_start
     or new.ends_on is distinct from v_expected_end then
    raise exception
      'Financial period % FY% index % must span % to %; got % to %',
      new.period_type,
      new.fiscal_year,
      new.period_index,
      v_expected_start,
      v_expected_end,
      new.starts_on,
      new.ends_on
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_financial_period_semantic_guard on public.financial_periods;

create trigger trg_financial_period_semantic_guard
before insert or update of period_type, fiscal_year, period_index, starts_on, ends_on
on public.financial_periods
for each row
execute function app.validate_financial_period_calendar();
