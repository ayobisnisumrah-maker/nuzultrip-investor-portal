/*
  Grant ownership offering permissions to admin_internal.

  Super Admin intentionally does not receive explicit rows in
  role_permissions because Super Admin is resolved as full access
  by the application permission resolver.

  This migration only grants the ownership-offering permissions
  required by Admin Internal.
*/

INSERT INTO public.role_permissions (
  role_id,
  permission_id
)
SELECT
  r.id,
  p.id
FROM public.roles AS r
CROSS JOIN public.permissions AS p
WHERE r.key = 'admin_internal'
  AND p.key IN (
    'ownership_offerings.create',
    'ownership_offerings.publish',
    'ownership_offerings.update',
    'ownership_offerings.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;