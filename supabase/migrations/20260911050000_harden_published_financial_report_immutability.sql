-- Official financial report parent records become immutable once published or archived.
-- Published version figures/KPIs are already protected separately; this closes the
-- remaining direct-table path that could alter report metadata after publication.

create or replace function app.guard_financial_report_parent_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status in ('published', 'archived') then
      raise exception
        'Published or archived financial reports cannot be deleted.'
        using errcode = '42501';
    end if;
    return old;
  end if;

  if old.status in ('published', 'archived') then
    raise exception
      'Published or archived financial reports cannot be modified. Issue a new report/version instead.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function app.guard_financial_report_parent_mutation() from public;
revoke all on function app.guard_financial_report_parent_mutation() from anon;
revoke all on function app.guard_financial_report_parent_mutation() from authenticated;

drop trigger if exists financial_reports_guard_mutation on public.financial_reports;
create trigger financial_reports_guard_mutation
before update or delete on public.financial_reports
for each row execute function app.guard_financial_report_parent_mutation();
