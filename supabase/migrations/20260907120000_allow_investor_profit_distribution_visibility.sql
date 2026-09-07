drop policy if exists profit_distributions_select_self on public.profit_distributions;

create policy profit_distributions_select_self
on public.profit_distributions
for select
to authenticated
using (
  status in ('payable', 'paid')
  and exists (
    select 1
    from public.profit_distribution_allocations a
    where a.distribution_id = profit_distributions.id
      and a.investor_id = app.current_user_id()
      and a.status in ('payable', 'paid')
  )
);
