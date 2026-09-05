begin;

create or replace function app.list_my_ownership_sales()
returns setof public.ownership_transfers
language sql
stable
security definer
set search_path = ''
as $$
  select ot.*
  from public.ownership_transfers ot
  where ot.transfer_kind = 'sale'
    and ot.from_investor_id = app.current_user_id()
  order by ot.requested_at desc;
$$;

create or replace function app.list_admin_ownership_sales()
returns setof public.ownership_transfers
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.has_permission('ownership_transfers.view') then
    raise exception 'permission_denied'
      using errcode = '42501';
  end if;

  return query
  select ot.*
  from public.ownership_transfers ot
  where ot.transfer_kind = 'sale'
  order by ot.requested_at desc;
end;
$$;

revoke all on function app.list_my_ownership_sales() from public, anon;
revoke all on function app.list_admin_ownership_sales() from public, anon;

grant execute on function app.list_my_ownership_sales() to authenticated;
grant execute on function app.list_admin_ownership_sales() to authenticated;

commit;
