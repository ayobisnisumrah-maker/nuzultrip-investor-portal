-- Ownership Offering Lifecycle Permissions
--
-- Publish tetap hanya Admin Internal.
-- Lifecycle transition menggunakan permission terpisah.
--
-- Struktur public.permissions:
-- key | module | action | description | is_dangerous

insert into public.permissions
    (key, module, action, description, is_dangerous)
values
    (
        'ownership_offerings.pause',
        'ownership_offerings',
        'pause',
        'Menghentikan sementara offering yang sedang open.',
        true
    ),
    (
        'ownership_offerings.resume',
        'ownership_offerings',
        'resume',
        'Membuka kembali offering yang sedang paused.',
        false
    ),
    (
        'ownership_offerings.close',
        'ownership_offerings',
        'close',
        'Menutup offering sehingga tidak dapat menerima investasi baru.',
        true
    ),
    (
        'ownership_offerings.archive',
        'ownership_offerings',
        'archive',
        'Mengarsipkan offering yang sudah closed.',
        true
    )
on conflict (key) do update
set
    module = excluded.module,
    action = excluded.action,
    description = excluded.description,
    is_dangerous = excluded.is_dangerous;

-- Hanya Admin Internal yang memperoleh lifecycle permissions.
insert into public.role_permissions
    (role_id, permission_id)
select
    r.id,
    p.id
from public.roles r
cross join public.permissions p
where r.key = 'admin_internal'
  and p.key in (
      'ownership_offerings.pause',
      'ownership_offerings.resume',
      'ownership_offerings.close',
      'ownership_offerings.archive'
  )
on conflict do nothing;

-- Admin Investor Relations TIDAK memiliki lifecycle permissions.
delete from public.role_permissions rp
using public.roles r,
      public.permissions p
where rp.role_id = r.id
  and rp.permission_id = p.id
  and r.key = 'admin_investor_relations'
  and p.key in (
      'ownership_offerings.pause',
      'ownership_offerings.resume',
      'ownership_offerings.close',
      'ownership_offerings.archive'
  );
