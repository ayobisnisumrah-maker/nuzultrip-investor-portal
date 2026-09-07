drop policy if exists ownership_holdings_select_self on public.ownership_holdings;
create policy ownership_holdings_select_self on public.ownership_holdings
for select to authenticated
using (investor_id = app.current_investor_id());

drop policy if exists profit_distribution_allocations_select_self on public.profit_distribution_allocations;
create policy profit_distribution_allocations_select_self on public.profit_distribution_allocations
for select to authenticated
using (investor_id = app.current_investor_id());

drop policy if exists profit_distribution_payment_proofs_select_self on public.profit_distribution_payment_proofs;
create policy profit_distribution_payment_proofs_select_self on public.profit_distribution_payment_proofs
for select to authenticated
using (investor_id = app.current_investor_id());

drop policy if exists document_access_grants_select_self on public.document_access_grants;
create policy document_access_grants_select_self on public.document_access_grants
for select to authenticated
using (investor_id = app.current_investor_id());
