begin;

alter table public.ownership_transfers
  drop constraint if exists ownership_transfers_approval_metadata;

alter table public.ownership_transfers
  add constraint ownership_transfers_approval_metadata
  check (
    transfer_kind <> 'sale'
    or status not in ('approved', 'processing', 'completed')
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
    transfer_kind <> 'sale'
    or status <> 'processing'
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
    transfer_kind <> 'sale'
    or status <> 'completed'
    or (
      completed_at is not null
      and completed_by is not null
      and to_investor_id is not null
    )
  );

commit;
