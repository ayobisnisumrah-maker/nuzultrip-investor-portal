-- =============================================================================
-- PROFIT DISTRIBUTION PAYMENT PROOFS
-- Individual payment proof per investor allocation.
-- =============================================================================

create table if not exists public.profit_distribution_payment_proofs (
  id uuid primary key default gen_random_uuid(),

  allocation_id uuid not null
    references public.profit_distribution_allocations(id)
    on delete cascade,

  investor_id uuid not null
    references public.investors(id)
    on delete restrict,

  storage_bucket text not null default 'investor-payment-proofs',

  storage_path text not null,

  original_file_name text not null,

  mime_type text not null,

  file_size_bytes bigint not null,

  payment_reference text,

  uploaded_by uuid
    references public.admins(id)
    on delete set null,

  uploaded_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint payment_proofs_file_name_not_blank
    check (length(btrim(original_file_name)) > 0),

  constraint payment_proofs_storage_path_not_blank
    check (length(btrim(storage_path)) > 0),

  constraint payment_proofs_mime_type_allowed
    check (
      mime_type in (
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
      )
    ),

  constraint payment_proofs_file_size_positive
    check (
      file_size_bytes > 0
      and file_size_bytes <= 10485760
    )
);

-- Satu allocation = satu bukti transfer aktif.
create unique index if not exists
  profit_distribution_payment_proofs_allocation_unique
on public.profit_distribution_payment_proofs(allocation_id);

create index if not exists
  profit_distribution_payment_proofs_investor_idx
on public.profit_distribution_payment_proofs(investor_id);

create index if not exists
  profit_distribution_payment_proofs_uploaded_by_idx
on public.profit_distribution_payment_proofs(uploaded_by);

-- =============================================================================
-- Integrity: investor proof harus sesuai dengan allocation investor.
-- =============================================================================

create or replace function public.validate_profit_distribution_payment_proof()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allocation_investor_id uuid;
begin
  select investor_id
    into allocation_investor_id
  from public.profit_distribution_allocations
  where id = new.allocation_id;

  if allocation_investor_id is null then
    raise exception 'Allocation distribusi tidak ditemukan.';
  end if;

  if allocation_investor_id <> new.investor_id then
    raise exception 'Investor proof tidak sesuai dengan allocation.';
  end if;

  return new;
end;
$$;

drop trigger if exists
  validate_profit_distribution_payment_proof_trigger
on public.profit_distribution_payment_proofs;

create trigger
  validate_profit_distribution_payment_proof_trigger
before insert or update
on public.profit_distribution_payment_proofs
for each row
execute function public.validate_profit_distribution_payment_proof();

-- =============================================================================
-- Updated timestamp
-- =============================================================================

create or replace function public.touch_profit_distribution_payment_proof()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists
  touch_profit_distribution_payment_proof_trigger
on public.profit_distribution_payment_proofs;

create trigger
  touch_profit_distribution_payment_proof_trigger
before update
on public.profit_distribution_payment_proofs
for each row
execute function public.touch_profit_distribution_payment_proof();

-- =============================================================================
-- Permissions
-- =============================================================================

insert into public.permissions (
  key,
  module,
  action,
  description
)
values
  (
    'profit_distribution_payments.view',
    'profit_distribution_payments',
    'view',
    'Melihat informasi pembayaran distribusi bagi hasil.'
  ),
  (
    'profit_distribution_payments.mark_paid',
    'profit_distribution_payments',
    'mark_paid',
    'Menandai pembayaran distribusi bagi hasil sebagai telah dibayar.'
  ),
  (
    'profit_distribution_payments.upload_proof',
    'profit_distribution_payments',
    'upload_proof',
    'Mengunggah bukti transfer pembayaran kepada investor.'
  ),
  (
    'profit_distribution_payments.replace_proof',
    'profit_distribution_payments',
    'replace_proof',
    'Mengganti bukti transfer pembayaran kepada investor.'
  )
on conflict (key) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

-- =============================================================================
-- Admin Laporan & Keuangan
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
where r.key = 'admin_finance_reporting'
  and p.key in (
    'profit_distribution_payments.view',
    'profit_distribution_payments.mark_paid',
    'profit_distribution_payments.upload_proof',
    'profit_distribution_payments.replace_proof'
  )
on conflict do nothing;

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.profit_distribution_payment_proofs enable row level security;

-- Server authorization tetap menjadi authoritative layer.
-- RLS tidak membuka akses publik.

drop policy if exists
  profit_distribution_payment_proofs_no_public_access
on public.profit_distribution_payment_proofs;

create policy
  profit_distribution_payment_proofs_no_public_access
on public.profit_distribution_payment_proofs
for all
to anon
using (false)
with check (false);

-- =============================================================================
-- Grants
-- =============================================================================

revoke all
on public.profit_distribution_payment_proofs
from anon;

revoke all
on public.profit_distribution_payment_proofs
from authenticated;

grant select, insert, update
on public.profit_distribution_payment_proofs
to authenticated;