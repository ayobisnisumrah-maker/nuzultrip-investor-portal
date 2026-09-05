begin;

update public.permissions
set is_dangerous = true
where key in (
  'ownership_transfers.approve',
  'ownership_transfers.reject',
  'ownership_transfers.process',
  'ownership_transfers.complete'
);

commit;
