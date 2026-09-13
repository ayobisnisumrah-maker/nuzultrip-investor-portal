create index if not exists investors_training_status_idx
  on public.investors (status, created_at desc)
  where is_training;

-- Profile-change review/apply policies and admin lists filter these foreign keys.
-- Keep both indexed so lifecycle review stays predictable as request history grows.
create index if not exists investor_profile_change_requests_reviewed_by_idx
  on public.investor_profile_change_requests (reviewed_by)
  where reviewed_by is not null;

create index if not exists investor_profile_change_requests_applied_by_idx
  on public.investor_profile_change_requests (applied_by)
  where applied_by is not null;
