-- =============================================================================
-- Synchronize inheritance lifecycle permission metadata with the application
-- catalogue. Rejecting or completing an inheritance changes legal ownership
-- lifecycle state, so both permissions are explicitly dangerous.
-- =============================================================================

update public.permissions
set is_dangerous = true
where key in (
  'ownership_inheritance.reject',
  'ownership_inheritance.complete'
);
