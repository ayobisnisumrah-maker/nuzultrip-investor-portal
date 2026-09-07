drop policy if exists profit_distributions_select_self on public.profit_distributions;
create policy profit_distributions_select_self on public.profit_distributions
for select to authenticated
using (
  app.current_investor_id() is not null
  and status in ('payable'::public.profit_distribution_status, 'paid'::public.profit_distribution_status)
  and exists (
    select 1
    from public.profit_distribution_allocations a
    where a.distribution_id = profit_distributions.id
      and a.investor_id = app.current_investor_id()
      and a.status in ('payable','paid')
  )
);

grant insert, update, delete on table public.profit_distribution_allocations to authenticated;

drop policy if exists profit_distribution_allocations_insert_admin on public.profit_distribution_allocations;
create policy profit_distribution_allocations_insert_admin on public.profit_distribution_allocations
for insert to authenticated
with check (app.has_permission('profit_distributions.update'));

drop policy if exists profit_distribution_allocations_update_admin on public.profit_distribution_allocations;
create policy profit_distribution_allocations_update_admin on public.profit_distribution_allocations
for update to authenticated
using (
  app.has_permission('profit_distributions.update')
  or app.has_permission('profit_distributions.publish')
  or app.has_permission('profit_distribution_payments.mark_paid')
)
with check (
  app.has_permission('profit_distributions.update')
  or app.has_permission('profit_distributions.publish')
  or app.has_permission('profit_distribution_payments.mark_paid')
);

drop policy if exists profit_distribution_allocations_delete_admin on public.profit_distribution_allocations;
create policy profit_distribution_allocations_delete_admin on public.profit_distribution_allocations
for delete to authenticated
using (app.has_permission('profit_distributions.update'));

create or replace function app.create_profit_distribution(
  p_offering_id uuid,
  p_period_start date,
  p_period_end date,
  p_revenue_amount numeric,
  p_opex_amount numeric,
  p_company_share_bps integer default 6000,
  p_investor_pool_bps integer default 4000,
  p_notes text default null
)
returns public.profit_distributions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.profit_distributions%rowtype;
  v_profit numeric;
begin
  if not app.has_permission('profit_distributions.create') then
    raise exception 'Missing permission: profit_distributions.create' using errcode='42501';
  end if;
  if p_period_start is null or p_period_end is null or p_period_end < p_period_start then
    raise exception 'Invalid distribution period.' using errcode='23514';
  end if;
  if coalesce(p_revenue_amount,-1) < 0 or coalesce(p_opex_amount,-1) < 0 then
    raise exception 'Revenue and OPEX must be nonnegative.' using errcode='23514';
  end if;
  if p_company_share_bps < 0 or p_investor_pool_bps < 0 or p_company_share_bps + p_investor_pool_bps <> 10000 then
    raise exception 'Company and investor pool shares must total 10000 bps.' using errcode='23514';
  end if;
  perform 1 from public.ownership_offerings where id=p_offering_id and status <> 'archived' for share;
  if not found then
    raise exception 'Ownership offering not found or archived.' using errcode='P0002';
  end if;
  if exists (
    select 1 from public.profit_distributions
    where offering_id=p_offering_id
      and status <> 'cancelled'
      and daterange(period_start, period_end, '[]') && daterange(p_period_start,p_period_end,'[]')
  ) then
    raise exception 'Distribution period overlaps an existing distribution for this offering.' using errcode='23505';
  end if;

  v_profit := greatest(p_revenue_amount - p_opex_amount, 0);
  insert into public.profit_distributions(
    offering_id,period_start,period_end,revenue_amount,opex_amount,profit_amount,
    company_share_bps,investor_pool_bps,investor_pool_amount,status,notes,created_by,updated_by
  ) values (
    p_offering_id,p_period_start,p_period_end,p_revenue_amount,p_opex_amount,v_profit,
    p_company_share_bps,p_investor_pool_bps,(v_profit*p_investor_pool_bps/10000.0),
    'draft',nullif(btrim(coalesce(p_notes,'')),''),auth.uid(),auth.uid()
  ) returning * into v_row;
  return v_row;
end;
$$;
grant execute on function app.create_profit_distribution(uuid,date,date,numeric,numeric,integer,integer,text) to authenticated;

create or replace function app.regenerate_profit_distribution_allocations(p_distribution_id uuid)
returns setof public.profit_distribution_allocations
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_distribution public.profit_distributions%rowtype;
  v_total_ownership integer;
  v_pool numeric;
begin
  if not app.has_permission('profit_distributions.update') then
    raise exception 'Missing permission: profit_distributions.update' using errcode='42501';
  end if;
  select * into v_distribution from public.profit_distributions where id=p_distribution_id for update;
  if v_distribution.id is null then raise exception 'Distribution not found.' using errcode='P0002'; end if;
  if v_distribution.status not in ('draft','review') then
    raise exception 'Allocations can only be generated for draft or review distributions.' using errcode='42501';
  end if;
  if exists(select 1 from public.profit_distribution_allocations where distribution_id=p_distribution_id and status in ('payable','paid')) then
    raise exception 'Locked allocations already exist.' using errcode='42501';
  end if;

  perform 1 from public.ownership_holdings where offering_id=v_distribution.offering_id and status='active' for share;
  select coalesce(sum(ownership_bps),0)::integer into v_total_ownership
  from public.ownership_holdings
  where offering_id=v_distribution.offering_id and status='active' and units>0 and ownership_bps>0;
  if v_distribution.investor_pool_amount > 0 and v_total_ownership <= 0 then
    raise exception 'No active ownership holdings are available for allocation.' using errcode='23514';
  end if;

  delete from public.profit_distribution_allocations where distribution_id=p_distribution_id;
  v_pool := v_distribution.profit_amount * v_distribution.investor_pool_bps / 10000.0;
  update public.profit_distributions set investor_pool_amount=v_pool,updated_by=auth.uid() where id=p_distribution_id;

  if v_pool > 0 then
    insert into public.profit_distribution_allocations(
      distribution_id,holding_id,investor_id,ownership_bps,investor_pool_share_bps,allocation_amount,status
    )
    with eligible as (
      select h.*,
        row_number() over(order by h.id) rn,
        count(*) over() cnt,
        round(h.ownership_bps::numeric*10000/v_total_ownership)::integer share_bps,
        v_pool*h.ownership_bps/v_total_ownership amount
      from public.ownership_holdings h
      where h.offering_id=v_distribution.offering_id and h.status='active' and h.units>0 and h.ownership_bps>0
    ), apportioned as (
      select e.*,
        coalesce(sum(share_bps) over(order by id rows between unbounded preceding and 1 preceding),0)::integer prior_share,
        coalesce(sum(amount) over(order by id rows between unbounded preceding and 1 preceding),0) prior_amount
      from eligible e
    )
    select p_distribution_id,id,investor_id,ownership_bps,
      case when rn=cnt then 10000-prior_share else share_bps end,
      case when rn=cnt then v_pool-prior_amount else amount end,
      'pending'
    from apportioned;
  end if;
  return query select * from public.profit_distribution_allocations where distribution_id=p_distribution_id order by created_at,id;
end;
$$;
grant execute on function app.regenerate_profit_distribution_allocations(uuid) to authenticated;

create or replace function app.transition_profit_distribution(
  p_distribution_id uuid,
  p_target public.profit_distribution_status
)
returns public.profit_distributions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row public.profit_distributions%rowtype;
  v_required text;
  v_now timestamptz:=now();
begin
  select * into v_row from public.profit_distributions where id=p_distribution_id for update;
  if v_row.id is null then raise exception 'Distribution not found.' using errcode='P0002'; end if;

  if v_row.status='draft' and p_target='review' then v_required:='profit_distributions.update';
  elsif v_row.status='review' and p_target='approved' then v_required:='profit_distributions.approve';
  elsif v_row.status='approved' and p_target='payable' then v_required:='profit_distributions.publish';
  else raise exception 'Invalid distribution transition: % -> %',v_row.status,p_target using errcode='42501';
  end if;
  if not app.has_permission(v_required) then raise exception 'Missing permission: %',v_required using errcode='42501'; end if;

  if p_target='review' and v_row.investor_pool_amount>0 and not exists(select 1 from public.profit_distribution_allocations where distribution_id=v_row.id and status='pending') then
    raise exception 'Investor allocations must be generated before review.' using errcode='23514';
  end if;
  if p_target='payable' then
    if v_row.investor_pool_amount>0 and not exists(select 1 from public.profit_distribution_allocations where distribution_id=v_row.id and status='pending') then
      raise exception 'Pending investor allocations are required before publication.' using errcode='23514';
    end if;
    update public.profit_distribution_allocations set status='payable',updated_at=v_now
    where distribution_id=v_row.id and status='pending';
  end if;

  update public.profit_distributions set
    status=p_target,
    approved_at=case when p_target='approved' then v_now else approved_at end,
    approved_by=case when p_target='approved' then auth.uid() else approved_by end,
    updated_by=auth.uid()
  where id=v_row.id returning * into v_row;
  return v_row;
end;
$$;
grant execute on function app.transition_profit_distribution(uuid,public.profit_distribution_status) to authenticated;
