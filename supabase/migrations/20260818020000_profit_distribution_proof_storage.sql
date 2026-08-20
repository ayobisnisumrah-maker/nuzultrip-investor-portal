-- Private storage bucket for individual investor profit-distribution
-- payment proofs.

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'profit-distribution-proofs',
  'profit-distribution-proofs',
  false
)
on conflict (id) do update
set
  public = false;