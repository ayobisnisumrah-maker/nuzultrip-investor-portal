-- =============================================================================
-- Ownership Offerings Publish Permission
-- =============================================================================
--
-- Admin Internal may publish ownership offerings.
-- Investor Relations remains view-only for this domain.
-- =============================================================================

insert into public.role_permissions (
  role_id,
  permission_id
)
select
  r.id,
  p.id
from public.roles r
cross join public.permissions p
where r.key = 'admin_internal'
  and p.key = 'ownership_offerings.publish'
on conflict do nothing;