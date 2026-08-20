-- =============================================================================
-- NuzulTrip ownership RBAC role assignments
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Admin Investor Relations
-- ---------------------------------------------------------------------------

insert into public.role_permissions (role_id, permission_id)
select
    r.id,
    p.id
from public.roles r
cross join public.permissions p
where r.key = 'admin_investor_relations'
  and p.key in (
    'ownership.view',
    'ownership.create',
    'ownership.update',
    'ownership_offerings.view',
    'ownership_transfers.view',
    'ownership_transfers.create',
    'ownership_inheritance.view',
    'ownership_inheritance.create'
)
on conflict (role_id, permission_id) do nothing;


-- ---------------------------------------------------------------------------
-- Admin Laporan & Keuangan
-- ---------------------------------------------------------------------------

insert into public.role_permissions (role_id, permission_id)
select
    r.id,
    p.id
from public.roles r
cross join public.permissions p
where r.key = 'admin_finance_reporting'
  and p.key in (
    'profit_distributions.view',
    'profit_distributions.create',
    'profit_distributions.update'
)
on conflict (role_id, permission_id) do nothing;


-- ---------------------------------------------------------------------------
-- Explicitly keep approval / publication privileges outside operational roles
-- ---------------------------------------------------------------------------

delete from public.role_permissions rp
where exists (
    select 1
    from public.roles r
    where r.id = rp.role_id
      and r.key <> 'super_admin'
)
and exists (
    select 1
    from public.permissions p
    where p.id = rp.permission_id
      and p.key in (
        'ownership_offerings.publish',
        'profit_distributions.approve',
        'profit_distributions.publish',
        'ownership_transfers.approve',
        'ownership_transfers.reject',
        'ownership_inheritance.approve'
      )
);


-- ---------------------------------------------------------------------------
-- Verification-friendly comments
-- ---------------------------------------------------------------------------

comment on table public.role_permissions is
  'Explicit RBAC grants for non-Super-Admin roles. Super Admin receives all permissions through app.has_permission().';
