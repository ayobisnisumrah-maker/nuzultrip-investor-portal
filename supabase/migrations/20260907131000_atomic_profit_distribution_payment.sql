drop policy if exists profit_distributions_update_admin on public.profit_distributions;
create policy profit_distributions_update_admin on public.profit_distributions
for update to authenticated
using (
  app.has_permission('profit_distributions.update')
  or app.has_permission('profit_distributions.approve')
  or app.has_permission('profit_distributions.publish')
  or app.has_permission('profit_distribution_payments.mark_paid')
)
with check (
  app.has_permission('profit_distributions.update')
  or app.has_permission('profit_distributions.approve')
  or app.has_permission('profit_distributions.publish')
  or app.has_permission('profit_distribution_payments.mark_paid')
);

create or replace function app.mark_profit_distribution_allocation_paid(
  p_allocation_id uuid,
  p_payment_reference text default null
)
returns table(
  allocation_id uuid,
  distribution_id uuid,
  allocation_status text,
  distribution_status public.profit_distribution_status,
  paid_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_allocation public.profit_distribution_allocations%rowtype;
  v_distribution public.profit_distributions%rowtype;
  v_proof public.profit_distribution_payment_proofs%rowtype;
  v_now timestamptz := now();
  v_reference text;
begin
  if not app.has_permission('profit_distribution_payments.mark_paid') then
    raise exception 'Missing permission: profit_distribution_payments.mark_paid' using errcode='42501';
  end if;

  select a.* into v_allocation
  from public.profit_distribution_allocations a
  where a.id=p_allocation_id
  for update;
  if v_allocation.id is null then raise exception 'Allocation not found.' using errcode='P0002'; end if;
  if v_allocation.status <> 'payable' then raise exception 'Only payable allocations can be marked paid.' using errcode='42501'; end if;

  select d.* into v_distribution
  from public.profit_distributions d
  where d.id=v_allocation.distribution_id
  for update;
  if v_distribution.id is null or v_distribution.status <> 'payable' then
    raise exception 'Parent distribution must be payable.' using errcode='42501';
  end if;

  select p.* into v_proof
  from public.profit_distribution_payment_proofs p
  where p.allocation_id=v_allocation.id
  for share;
  if v_proof.id is null then
    raise exception 'Payment proof is required before marking the allocation paid.' using errcode='23514';
  end if;

  v_reference := coalesce(nullif(btrim(coalesce(p_payment_reference,'')),''), v_allocation.payment_reference, v_proof.payment_reference);

  update public.profit_distribution_allocations a
  set status='paid', paid_at=v_now, payment_reference=v_reference, updated_at=v_now
  where a.id=v_allocation.id;

  if not exists (
    select 1 from public.profit_distribution_allocations a
    where a.distribution_id=v_distribution.id and a.status not in ('paid','cancelled')
  ) then
    update public.profit_distributions d
    set status='paid', paid_at=v_now, updated_by=auth.uid()
    where d.id=v_distribution.id;
    v_distribution.status := 'paid';
  end if;

  return query select v_allocation.id, v_distribution.id, 'paid'::text, v_distribution.status, v_now;
end;
$$;
grant execute on function app.mark_profit_distribution_allocation_paid(uuid,text) to authenticated;
