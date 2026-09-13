-- Keep training-account lookups cheap without changing canonical investor ordering.
create index if not exists investors_training_status_idx
  on public.investors (status, created_at desc)
  where is_training;
