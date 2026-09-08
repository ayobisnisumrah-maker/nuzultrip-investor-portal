-- Rejected applications are terminal. A future registration must create a fresh
-- application after the rejected-candidate retention window has expired.
create or replace function app.investor_transition_allowed(
  p_from public.investor_status,
  p_to public.investor_status
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_from
    when 'prospective' then p_to = 'submitted'
    when 'submitted' then p_to in ('under_review', 'rejected')
    when 'under_review' then p_to in ('approved', 'rejected')
    when 'approved' then p_to in ('active', 'rejected')
    when 'active' then p_to = 'inactive'
    when 'inactive' then p_to = 'active'
    when 'rejected' then false
    else false
  end;
$$;
