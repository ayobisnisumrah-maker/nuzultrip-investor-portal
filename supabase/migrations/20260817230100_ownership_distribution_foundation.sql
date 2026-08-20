-- =============================================================================
-- NuzulTrip ownership and investor distribution foundation
-- =============================================================================
--
-- Business model:
--   - Company ownership offered to investors is configurable.
--   - Each ownership unit has a configurable percentage and price.
--   - Investor holdings are linked directly to public.investors.
--   - Holdings become transferable only after the configured lock period.
--   - Distribution cadence is configurable by Super Admin.
--   - Profit distributions are calculated separately from financial reporting.
--
-- Important:
--   This migration does NOT hard-code the 40% / 0.8% / Rp100m values.
--   Those values belong to an ownership offering record.
-- =============================================================================


-- =============================================================================
-- 1. ENUM TYPES
-- =============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'ownership_offering_status'
  ) then
    create type public.ownership_offering_status as enum (
      'draft',
      'open',
      'paused',
      'closed',
      'archived'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'ownership_holding_status'
  ) then
    create type public.ownership_holding_status as enum (
      'reserved',
      'active',
      'transferred',
      'cancelled'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'ownership_transfer_status'
  ) then
    create type public.ownership_transfer_status as enum (
      'pending',
      'approved',
      'rejected',
      'completed',
      'cancelled'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'ownership_inheritance_status'
  ) then
    create type public.ownership_inheritance_status as enum (
      'pending',
      'approved',
      'rejected',
      'completed',
      'cancelled'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'profit_distribution_status'
  ) then
    create type public.profit_distribution_status as enum (
      'draft',
      'review',
      'approved',
      'payable',
      'paid',
      'cancelled'
    );
  end if;
end;
$$;


-- =============================================================================
-- 2. OWNERSHIP OFFERINGS
-- =============================================================================

create table if not exists public.ownership_offerings (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  code text not null,

  status public.ownership_offering_status not null default 'draft',

  -- Stored in basis points:
  -- 40%  = 4000
  -- 0.8% = 80
  total_offered_bps integer not null,
  unit_ownership_bps integer not null,

  unit_price numeric(20,2) not null,

  total_units integer not null,

  -- Super Admin controlled distribution cadence.
  distribution_cadence_months smallint not null default 6,

  -- Minimum ownership lock period before transfer.
  transfer_lock_months smallint not null default 36,

  effective_from timestamptz,
  effective_until timestamptz,

  description text,

  created_by uuid references public.admins(id) on delete set null,
  updated_by uuid references public.admins(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ownership_offerings_code_format
    check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  constraint ownership_offerings_name_not_blank
    check (length(btrim(name)) > 0),

  constraint ownership_offerings_total_bps_positive
    check (total_offered_bps > 0 and total_offered_bps <= 10000),

  constraint ownership_offerings_unit_bps_positive
    check (unit_ownership_bps > 0 and unit_ownership_bps <= 10000),

  constraint ownership_offerings_unit_price_positive
    check (unit_price > 0),

  constraint ownership_offerings_units_positive
    check (total_units > 0),

  constraint ownership_offerings_cadence_valid
    check (distribution_cadence_months between 1 and 24),

  constraint ownership_offerings_transfer_lock_valid
    check (transfer_lock_months between 36 and 120),

  constraint ownership_offerings_effective_dates
    check (
      effective_until is null
      or effective_from is null
      or effective_until > effective_from
    ),

  constraint ownership_offerings_unit_math
    check (
      total_offered_bps = unit_ownership_bps * total_units
    )
);

create unique index if not exists ownership_offerings_code_key
  on public.ownership_offerings(code);


-- =============================================================================
-- 3. INVESTOR OWNERSHIP HOLDINGS
-- =============================================================================

create table if not exists public.ownership_holdings (
  id uuid primary key default gen_random_uuid(),

  offering_id uuid not null
    references public.ownership_offerings(id)
    on delete restrict,

  investor_id uuid not null
    references public.investors(id)
    on delete restrict,

  units integer not null,

  -- Snapshot of ownership at acquisition.
  ownership_bps integer not null,

  acquisition_at timestamptz not null default now(),

  transfer_eligible_at timestamptz not null,

  status public.ownership_holding_status not null default 'reserved',

  acquisition_reference text,

  notes text,

  created_by uuid references public.admins(id) on delete set null,
  updated_by uuid references public.admins(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ownership_holdings_units_positive
    check (units > 0),

  constraint ownership_holdings_ownership_positive
    check (ownership_bps > 0),

  constraint ownership_holdings_transfer_date
    check (transfer_eligible_at >= acquisition_at)
);

create index if not exists ownership_holdings_investor_idx
  on public.ownership_holdings(investor_id);

create index if not exists ownership_holdings_offering_idx
  on public.ownership_holdings(offering_id);

create index if not exists ownership_holdings_transfer_eligible_idx
  on public.ownership_holdings(transfer_eligible_at);

create index if not exists ownership_holdings_status_idx
  on public.ownership_holdings(status);


-- =============================================================================
-- 4. PROFIT DISTRIBUTIONS
-- =============================================================================

create table if not exists public.profit_distributions (
  id uuid primary key default gen_random_uuid(),

  offering_id uuid not null
    references public.ownership_offerings(id)
    on delete restrict,

  period_start date not null,
  period_end date not null,

  revenue_amount numeric(20,2) not null default 0,
  opex_amount numeric(20,2) not null default 0,
  profit_amount numeric(20,2) not null default 0,

  company_share_bps integer not null default 6000,
  investor_pool_bps integer not null default 4000,

  investor_pool_amount numeric(20,2) not null default 0,

  status public.profit_distribution_status not null default 'draft',

  approved_at timestamptz,
  approved_by uuid references public.admins(id) on delete set null,

  paid_at timestamptz,

  notes text,

  created_by uuid references public.admins(id) on delete set null,
  updated_by uuid references public.admins(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profit_distributions_period_valid
    check (period_end >= period_start),

  constraint profit_distributions_revenue_nonnegative
    check (revenue_amount >= 0),

  constraint profit_distributions_opex_nonnegative
    check (opex_amount >= 0),

  constraint profit_distributions_profit_nonnegative
    check (profit_amount >= 0),

  constraint profit_distributions_company_share_valid
    check (company_share_bps >= 0 and company_share_bps <= 10000),

  constraint profit_distributions_investor_pool_valid
    check (investor_pool_bps >= 0 and investor_pool_bps <= 10000),

  constraint profit_distributions_split_valid
    check (company_share_bps + investor_pool_bps = 10000),

  constraint profit_distributions_pool_nonnegative
    check (investor_pool_amount >= 0)
);

create index if not exists profit_distributions_offering_idx
  on public.profit_distributions(offering_id);

create index if not exists profit_distributions_period_idx
  on public.profit_distributions(period_start, period_end);

create index if not exists profit_distributions_status_idx
  on public.profit_distributions(status);


-- =============================================================================
-- 5. DISTRIBUTION ALLOCATIONS
-- =============================================================================

create table if not exists public.profit_distribution_allocations (
  id uuid primary key default gen_random_uuid(),

  distribution_id uuid not null
    references public.profit_distributions(id)
    on delete cascade,

  holding_id uuid not null
    references public.ownership_holdings(id)
    on delete restrict,

  investor_id uuid not null
    references public.investors(id)
    on delete restrict,

  ownership_bps integer not null,

  investor_pool_share_bps integer not null,

  allocation_amount numeric(20,2) not null default 0,

  status text not null default 'pending',

  paid_at timestamptz,

  payment_reference text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint distribution_allocations_ownership_positive
    check (ownership_bps > 0),

  constraint distribution_allocations_pool_share_nonnegative
    check (investor_pool_share_bps >= 0),

  constraint distribution_allocations_amount_nonnegative
    check (allocation_amount >= 0),

  constraint distribution_allocations_status_valid
    check (status in ('pending', 'payable', 'paid', 'cancelled'))
);

create unique index if not exists distribution_allocations_distribution_holding_key
  on public.profit_distribution_allocations(distribution_id, holding_id);

create index if not exists distribution_allocations_investor_idx
  on public.profit_distribution_allocations(investor_id);

create index if not exists distribution_allocations_status_idx
  on public.profit_distribution_allocations(status);


-- =============================================================================
-- 6. OWNERSHIP TRANSFERS
-- =============================================================================

create table if not exists public.ownership_transfers (
  id uuid primary key default gen_random_uuid(),

  holding_id uuid not null
    references public.ownership_holdings(id)
    on delete restrict,

  from_investor_id uuid not null
    references public.investors(id)
    on delete restrict,

  to_investor_id uuid
    references public.investors(id)
    on delete restrict,

  units integer not null,

  requested_at timestamptz not null default now(),

  eligible_at timestamptz not null,

  status public.ownership_transfer_status not null default 'pending',

  approved_at timestamptz,
  approved_by uuid references public.admins(id) on delete set null,

  completed_at timestamptz,

  rejection_reason text,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ownership_transfers_units_positive
    check (units > 0),

  constraint ownership_transfers_different_investors
    check (
      to_investor_id is null
      or from_investor_id <> to_investor_id
    ),

  constraint ownership_transfers_rejection_reason
    check (
      status <> 'rejected'
      or length(btrim(coalesce(rejection_reason, ''))) > 0
    )
);

create index if not exists ownership_transfers_holding_idx
  on public.ownership_transfers(holding_id);

create index if not exists ownership_transfers_from_investor_idx
  on public.ownership_transfers(from_investor_id);

create index if not exists ownership_transfers_to_investor_idx
  on public.ownership_transfers(to_investor_id);

create index if not exists ownership_transfers_status_idx
  on public.ownership_transfers(status);


-- =============================================================================
-- 7. OWNERSHIP INHERITANCE
-- =============================================================================

create table if not exists public.ownership_inheritance (
  id uuid primary key default gen_random_uuid(),

  holding_id uuid not null
    references public.ownership_holdings(id)
    on delete restrict,

  current_investor_id uuid not null
    references public.investors(id)
    on delete restrict,

  beneficiary_name text not null,
  beneficiary_email text,
  beneficiary_phone text,

  units integer not null,

  status public.ownership_inheritance_status not null default 'pending',

  requested_at timestamptz not null default now(),

  approved_at timestamptz,
  approved_by uuid references public.admins(id) on delete set null,

  completed_at timestamptz,

  rejection_reason text,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ownership_inheritance_beneficiary_not_blank
    check (length(btrim(beneficiary_name)) > 0),

  constraint ownership_inheritance_units_positive
    check (units > 0),

  constraint ownership_inheritance_rejection_reason
    check (
      status <> 'rejected'
      or length(btrim(coalesce(rejection_reason, ''))) > 0
    )
);

create index if not exists ownership_inheritance_holding_idx
  on public.ownership_inheritance(holding_id);

create index if not exists ownership_inheritance_current_investor_idx
  on public.ownership_inheritance(current_investor_id);

create index if not exists ownership_inheritance_status_idx
  on public.ownership_inheritance(status);


-- =============================================================================
-- 8. UPDATED_AT TRIGGER
-- =============================================================================

create or replace function public.touch_ownership_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ownership_offerings_updated_at
  on public.ownership_offerings;

create trigger ownership_offerings_updated_at
before update on public.ownership_offerings
for each row execute function public.touch_ownership_updated_at();

drop trigger if exists ownership_holdings_updated_at
  on public.ownership_holdings;

create trigger ownership_holdings_updated_at
before update on public.ownership_holdings
for each row execute function public.touch_ownership_updated_at();

drop trigger if exists profit_distributions_updated_at
  on public.profit_distributions;

create trigger profit_distributions_updated_at
before update on public.profit_distributions
for each row execute function public.touch_ownership_updated_at();

drop trigger if exists distribution_allocations_updated_at
  on public.profit_distribution_allocations;

create trigger distribution_allocations_updated_at
before update on public.profit_distribution_allocations
for each row execute function public.touch_ownership_updated_at();

drop trigger if exists ownership_transfers_updated_at
  on public.ownership_transfers;

create trigger ownership_transfers_updated_at
before update on public.ownership_transfers
for each row execute function public.touch_ownership_updated_at();

drop trigger if exists ownership_inheritance_updated_at
  on public.ownership_inheritance;

create trigger ownership_inheritance_updated_at
before update on public.ownership_inheritance
for each row execute function public.touch_ownership_updated_at();


-- =============================================================================
-- 9. RLS
-- =============================================================================

alter table public.ownership_offerings enable row level security;
alter table public.ownership_holdings enable row level security;
alter table public.profit_distributions enable row level security;
alter table public.profit_distribution_allocations enable row level security;
alter table public.ownership_transfers enable row level security;
alter table public.ownership_inheritance enable row level security;


-- No direct authenticated CRUD policies are created here.
--
-- Access must go through the application's authorization layer and
-- service-side workflows. This prevents exposing ownership mutations directly
-- through the Data API before the corresponding permission-aware actions exist.


-- =============================================================================
-- 10. RBAC: new ownership/distribution permissions
-- =============================================================================

insert into public.permissions (
  key,
  module,
  action,
  description
  )
values
  (
    'ownership_offerings.view',
    'ownership_offerings',
    'view',
    'Melihat penawaran kepemilikan.'
    ),
  (
    'ownership_offerings.create',
    'ownership_offerings',
    'create',
    'Membuat penawaran kepemilikan.'
    ),
  (
    'ownership_offerings.update',
    'ownership_offerings',
    'update',
    'Mengubah penawaran kepemilikan.'
    ),
  (
    'ownership_offerings.publish',
    'ownership_offerings', 'publish', 'Membuka atau menerbitkan penawaran kepemilikan.'
  ),
  (
    'ownership.view',
    'ownership',
    'view',
    'Melihat kepemilikan investor.'
    ),
  (
    'ownership.create',
    'ownership',
    'create',
    'Mencatat atau mengalokasikan kepemilikan investor.'
    ),
  (
    'ownership.update',
    'ownership',
    'update',
    'Mengubah data kepemilikan investor.'
    ),
  (
    'ownership.delete',
    'ownership',
    'delete',
    'Membatalkan atau menghapus catatan kepemilikan.'
    ),
  (
    'profit_distributions.view',
    'profit_distributions',
    'view',
    'Melihat perhitungan dan distribusi bagi hasil.'
    ),
  (
    'profit_distributions.create',
    'profit_distributions',
    'create',
    'Membuat perhitungan distribusi bagi hasil.'
    ),
  (
    'profit_distributions.update',
    'profit_distributions',
    'update',
    'Mengubah distribusi bagi hasil yang belum disetujui.'
    ),
  (
    'profit_distributions.approve',
    'profit_distributions',
    'approve',
    'Menyetujui distribusi bagi hasil.'
    ),
  (
    'profit_distributions.publish',
    'profit_distributions',
    'publish',
    'Menerbitkan distribusi bagi hasil kepada investor.'
    ),
  (
    'ownership_transfers.view',
    'ownership_transfers',
    'view',
    'Melihat permintaan transfer kepemilikan.'
    ),
  (
    'ownership_transfers.create',
    'ownership_transfers',
    'create',
    'Mengajukan transfer kepemilikan.'
    ),
  (
    'ownership_transfers.approve',
    'ownership_transfers',
    'approve',
    'Menyetujui transfer kepemilikan.'
    ),
  (
    'ownership_transfers.reject',
    'ownership_transfers',
    'reject',
    'Menolak transfer kepemilikan.'
    ),
  (
    'ownership_inheritance.view',
    'ownership_inheritance',
    'view',
    'Melihat proses pewarisan kepemilikan.'
    ),
  (
    'ownership_inheritance.create',
    'ownership_inheritance',
    'create',
    'Membuat pengajuan pewarisan kepemilikan.'
    ),
  (
    'ownership_inheritance.approve',
    'ownership_inheritance',
    'approve',
    'Menyetujui pewarisan kepemilikan.'
    )
on conflict (key) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;


-- =============================================================================
-- 11. ADMIN DOCUMENT ROLE BOUNDARY
-- =============================================================================
--
-- Admin Dokumen & Verifikasi may prepare/review documents.
-- Final approval and publication remain with Super Admin.
--

delete from public.role_permissions
where role_id = (
  select id
  from public.roles
  where key = 'admin_document_verification'
)
and permission_id in (
  select id
  from public.permissions
  where key in (
    'documents.approve',
    'documents.publish'
  )
);


-- =============================================================================
-- END
-- =============================================================================



