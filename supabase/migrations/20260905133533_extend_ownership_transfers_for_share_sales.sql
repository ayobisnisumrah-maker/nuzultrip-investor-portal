-- =============================================================================
-- Investor share-sale lifecycle
-- =============================================================================
--
-- ownership_transfers tetap menjadi canonical transfer domain.
--
-- PENTING:
-- - request jual TIDAK mengurangi ownership_holdings
-- - approval TIDAK mengurangi ownership_holdings
-- - processing TIDAK mengurangi ownership_holdings
-- - holding hanya berubah melalui workflow completion transactional
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Jenis transfer
-- -----------------------------------------------------------------------------

alter table public.ownership_transfers
  add column if not exists transfer_kind text not null default 'transfer';

alter table public.ownership_transfers
  drop constraint if exists ownership_transfers_transfer_kind_valid;

alter table public.ownership_transfers
  add constraint ownership_transfers_transfer_kind_valid
  check (transfer_kind in ('transfer', 'sale'));


-- -----------------------------------------------------------------------------
-- Harga jual
-- -----------------------------------------------------------------------------

alter table public.ownership_transfers
  add column if not exists requested_unit_price numeric(18,2);

alter table public.ownership_transfers
  add column if not exists agreed_unit_price numeric(18,2);

alter table public.ownership_transfers
  drop constraint if exists ownership_transfers_requested_unit_price_positive;

alter table public.ownership_transfers
  add constraint ownership_transfers_requested_unit_price_positive
  check (
    requested_unit_price is null
    or requested_unit_price > 0
  );

alter table public.ownership_transfers
  drop constraint if exists ownership_transfers_agreed_unit_price_positive;

alter table public.ownership_transfers
  add constraint ownership_transfers_agreed_unit_price_positive
  check (
    agreed_unit_price is null
    or agreed_unit_price > 0
  );

alter table public.ownership_transfers
  drop constraint if exists ownership_transfers_sale_price_required;

alter table public.ownership_transfers
  add constraint ownership_transfers_sale_price_required
  check (
    transfer_kind <> 'sale'
    or requested_unit_price is not null
  );


-- -----------------------------------------------------------------------------
-- Audit tahap processing / completion
-- -----------------------------------------------------------------------------

alter table public.ownership_transfers
  add column if not exists processing_at timestamptz;

alter table public.ownership_transfers
  add column if not exists processing_by uuid
    references public.admins(id)
    on delete set null;

alter table public.ownership_transfers
  add column if not exists completed_by uuid
    references public.admins(id)
    on delete set null;


-- -----------------------------------------------------------------------------
-- Konsistensi lifecycle
-- -----------------------------------------------------------------------------

alter table public.ownership_transfers
  drop constraint if exists ownership_transfers_approval_metadata;

alter table public.ownership_transfers
  add constraint ownership_transfers_approval_metadata
  check (
    status not in ('approved', 'processing', 'completed')
    or (
      approved_at is not null
      and approved_by is not null
    )
  );

alter table public.ownership_transfers
  drop constraint if exists ownership_transfers_processing_metadata;

alter table public.ownership_transfers
  add constraint ownership_transfers_processing_metadata
  check (
    status <> 'processing'
    or (
      processing_at is not null
      and processing_by is not null
    )
  );

alter table public.ownership_transfers
  drop constraint if exists ownership_transfers_completion_metadata;

alter table public.ownership_transfers
  add constraint ownership_transfers_completion_metadata
  check (
    status <> 'completed'
    or (
      completed_at is not null
      and completed_by is not null
      and to_investor_id is not null
    )
  );


-- -----------------------------------------------------------------------------
-- Penjualan selesai wajib punya harga final
-- -----------------------------------------------------------------------------

alter table public.ownership_transfers
  drop constraint if exists ownership_transfers_completed_sale_price;

alter table public.ownership_transfers
  add constraint ownership_transfers_completed_sale_price
  check (
    status <> 'completed'
    or transfer_kind <> 'sale'
    or agreed_unit_price is not null
  );


-- -----------------------------------------------------------------------------
-- Index
-- -----------------------------------------------------------------------------

create index if not exists ownership_transfers_kind_status_idx
  on public.ownership_transfers(transfer_kind, status);

create index if not exists ownership_transfers_pending_sales_idx
  on public.ownership_transfers(requested_at desc)
  where transfer_kind = 'sale'
    and status in ('pending', 'approved', 'processing');
