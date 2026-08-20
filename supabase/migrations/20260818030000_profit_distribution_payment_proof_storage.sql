-- =============================================================================
-- PROFIT DISTRIBUTION PAYMENT PROOF STORAGE
-- =============================================================================
-- Private bucket.
--
-- Access boundary:
-- - Authorized admin: managed through application/server authorization.
-- - Investor: read only their own payment proof.
-- - Public access: denied.
--
-- IMPORTANT:
-- The application auth model uses:
--
--   auth.users.id
--        -> public.user_accounts.id
--        -> public.admins.id / public.investors.id
--
-- There is no admins.auth_user_id or investors.auth_user_id column.
-- =============================================================================


-- =============================================================================
-- STORAGE BUCKET
-- =============================================================================

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
  name = excluded.name,
  public = false;


-- =============================================================================
-- STORAGE POLICIES
-- =============================================================================
--
-- We intentionally do NOT grant direct browser INSERT/UPDATE access to admins.
--
-- Admin upload/replace will go through the application server action, where:
--
--   defineAction()
--   -> permission check
--   -> allocation/investor ownership validation
--   -> storage upload
--   -> database metadata
--   -> audit log
--
-- This prevents the browser from becoming the authorization boundary.
--
-- Investor read access is also handled through application-generated
-- signed URLs after validating investor ownership.
--
-- Therefore no permissive storage.objects policy is required here.
-- =============================================================================