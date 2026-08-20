-- =============================================================================
-- PROFIT DISTRIBUTION PAYMENT PROOF STORAGE POLICIES
-- =============================================================================
-- Private bucket:
--   profit-distribution-proofs
--
-- Object path:
--   <investor_id>/<allocation_id>/<uuid>-<filename>
--
-- Admin access is controlled through public.admins.id = auth.uid().
-- Investor access is controlled through investors.id = auth.uid().
-- =============================================================================


-- =============================================================================
-- ADMIN: VIEW
-- =============================================================================

drop policy if exists "payment_proofs_admin_select"
on storage.objects;

create policy "payment_proofs_admin_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profit-distribution-proofs'
  and exists (
    select 1
    from public.admins a
    join public.role_permissions rp
      on rp.role_id = a.role_id
    join public.permissions p
      on p.id = rp.permission_id
    where a.id = auth.uid()
      and a.is_active = true
      and p.key = 'profit_distribution_payments.view'
  )
);


-- =============================================================================
-- ADMIN: UPLOAD
-- =============================================================================

drop policy if exists "payment_proofs_admin_insert"
on storage.objects;

create policy "payment_proofs_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profit-distribution-proofs'
  and exists (
    select 1
    from public.admins a
    join public.role_permissions rp
      on rp.role_id = a.role_id
    join public.permissions p
      on p.id = rp.permission_id
    where a.id = auth.uid()
      and a.is_active = true
      and p.key = 'profit_distribution_payments.upload_proof'
  )
);


-- =============================================================================
-- ADMIN: REPLACE
-- =============================================================================

drop policy if exists "payment_proofs_admin_update"
on storage.objects;

create policy "payment_proofs_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profit-distribution-proofs'
  and exists (
    select 1
    from public.admins a
    join public.role_permissions rp
      on rp.role_id = a.role_id
    join public.permissions p
      on p.id = rp.permission_id
    where a.id = auth.uid()
      and a.is_active = true
      and p.key = 'profit_distribution_payments.replace_proof'
  )
)
with check (
  bucket_id = 'profit-distribution-proofs'
  and exists (
    select 1
    from public.admins a
    join public.role_permissions rp
      on rp.role_id = a.role_id
    join public.permissions p
      on p.id = rp.permission_id
    where a.id = auth.uid()
      and a.is_active = true
      and p.key = 'profit_distribution_payments.replace_proof'
  )
);


-- =============================================================================
-- ADMIN: DELETE / REPLACE
-- =============================================================================

drop policy if exists "payment_proofs_admin_delete"
on storage.objects;

create policy "payment_proofs_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profit-distribution-proofs'
  and exists (
    select 1
    from public.admins a
    join public.role_permissions rp
      on rp.role_id = a.role_id
    join public.permissions p
      on p.id = rp.permission_id
    where a.id = auth.uid()
      and a.is_active = true
      and p.key = 'profit_distribution_payments.replace_proof'
  )
);


-- =============================================================================
-- INVESTOR: READ OWN PROOF ONLY
-- =============================================================================

drop policy if exists "payment_proofs_investor_select_own"
on storage.objects;

create policy "payment_proofs_investor_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profit-distribution-proofs'
  and exists (
    select 1
    from public.investors i
    where i.id = auth.uid()
      and (storage.foldername(name))[1] = i.id::text
  )
);