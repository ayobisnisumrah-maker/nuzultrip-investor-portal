begin;

-- ============================================================
-- PROFIT DISTRIBUTIONS
-- ============================================================

grant select, insert, update
on public.profit_distributions
to authenticated;

drop policy if exists profit_distributions_select_admin
on public.profit_distributions;

create policy profit_distributions_select_admin
on public.profit_distributions
for select
to authenticated
using (
  app.has_permission('profit_distributions.view')
);

drop policy if exists profit_distributions_insert_admin
on public.profit_distributions;

create policy profit_distributions_insert_admin
on public.profit_distributions
for insert
to authenticated
with check (
  app.has_permission('profit_distributions.create')
);

drop policy if exists profit_distributions_update_admin
on public.profit_distributions;

create policy profit_distributions_update_admin
on public.profit_distributions
for update
to authenticated
using (
  app.has_permission('profit_distributions.update')
  or app.has_permission('profit_distributions.approve')
  or app.has_permission('profit_distributions.publish')
)
with check (
  app.has_permission('profit_distributions.update')
  or app.has_permission('profit_distributions.approve')
  or app.has_permission('profit_distributions.publish')
);


-- ============================================================
-- PROFIT DISTRIBUTION ALLOCATIONS
-- ============================================================

grant select
on public.profit_distribution_allocations
to authenticated;

drop policy if exists profit_distribution_allocations_select_admin
on public.profit_distribution_allocations;

create policy profit_distribution_allocations_select_admin
on public.profit_distribution_allocations
for select
to authenticated
using (
  app.has_permission('profit_distributions.view')
  or app.has_permission('profit_distribution_payments.view')
);

drop policy if exists profit_distribution_allocations_select_self
on public.profit_distribution_allocations;

create policy profit_distribution_allocations_select_self
on public.profit_distribution_allocations
for select
to authenticated
using (
  investor_id = app.current_user_id()
);


-- ============================================================
-- PROFIT DISTRIBUTION PAYMENT PROOFS
-- ============================================================

grant select, insert, update
on public.profit_distribution_payment_proofs
to authenticated;

drop policy if exists profit_distribution_payment_proofs_select_admin
on public.profit_distribution_payment_proofs;

create policy profit_distribution_payment_proofs_select_admin
on public.profit_distribution_payment_proofs
for select
to authenticated
using (
  app.has_permission('profit_distribution_payments.view')
);

drop policy if exists profit_distribution_payment_proofs_select_self
on public.profit_distribution_payment_proofs;

create policy profit_distribution_payment_proofs_select_self
on public.profit_distribution_payment_proofs
for select
to authenticated
using (
  investor_id = app.current_user_id()
);

drop policy if exists profit_distribution_payment_proofs_insert_self
on public.profit_distribution_payment_proofs;

-- Payment proof is uploaded by an authorized admin,
-- not directly by the investor.
drop policy if exists profit_distribution_payment_proofs_insert_admin
on public.profit_distribution_payment_proofs;

create policy profit_distribution_payment_proofs_insert_admin
on public.profit_distribution_payment_proofs
for insert
to authenticated
with check (
  app.has_permission('profit_distribution_payments.upload_proof')
  and uploaded_by = app.current_user_id()
);

drop policy if exists profit_distribution_payment_proofs_update_admin
on public.profit_distribution_payment_proofs;

create policy profit_distribution_payment_proofs_update_admin
on public.profit_distribution_payment_proofs
for update
to authenticated
using (
  app.has_permission('profit_distribution_payments.replace_proof')
  or app.has_permission('profit_distribution_payments.mark_paid')
)
with check (
  app.has_permission('profit_distribution_payments.replace_proof')
  or app.has_permission('profit_distribution_payments.mark_paid')
);


-- ============================================================
-- OWNERSHIP HOLDINGS
-- ============================================================

grant select
on public.ownership_holdings
to authenticated;

drop policy if exists ownership_holdings_select_admin
on public.ownership_holdings;

create policy ownership_holdings_select_admin
on public.ownership_holdings
for select
to authenticated
using (
  app.has_permission('profit_distributions.view')
);

drop policy if exists ownership_holdings_select_self
on public.ownership_holdings;

create policy ownership_holdings_select_self
on public.ownership_holdings
for select
to authenticated
using (
  investor_id = app.current_user_id()
);

commit;