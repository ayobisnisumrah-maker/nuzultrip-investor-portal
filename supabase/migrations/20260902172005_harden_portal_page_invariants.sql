/* ============================================================================
   Harden Portal Page Invariants
   Migration: 20260902172005_harden_portal_page_invariants

   Purpose
   -------
   Enforce structural invariants for public.portal_pages at the database layer.

   This migration intentionally focuses on invariants that must never be
   bypassed, regardless of whether mutations originate from:

   - Server Actions
   - Supabase Dashboard
   - SQL
   - future API endpoints
   - background jobs
   - administrative tooling

   Editorial workflow transitions are deliberately NOT hard-coded here yet.
   The publication_status enum supports a broader workflow:

     draft
       -> review
       -> approved
       -> published
       -> archived

   Transition rules should be centralized only after all existing mutation
   paths have been audited.

   Enforced invariants
   -------------------
   1. At most one page may have page_kind = 'home'.
   2. page_kind = 'home' must use slug = 'home'.
   3. page_kind != 'home' must not use slug = 'home'.
   4. published pages must have published_at.
   5. non-published pages must not retain published_at.
   6. A system page cannot be downgraded into a non-system page.
   7. A system home page cannot stop being a home page.
   8. A system home page must retain slug = 'home'.
   ============================================================================ */

BEGIN;

-- ============================================================================
-- 1. Repair existing data before adding constraints.
-- ============================================================================

-- A published page must have a publication timestamp.
UPDATE public.portal_pages
SET published_at = COALESCE(published_at, updated_at, created_at, now())
WHERE status = 'published'
  AND published_at IS NULL;

-- Non-published pages must not retain a publication timestamp.
UPDATE public.portal_pages
SET published_at = NULL
WHERE status <> 'published'
  AND published_at IS NOT NULL;


-- ============================================================================
-- 2. Ensure home-page slug consistency for existing data.
-- ============================================================================

DO $$
DECLARE
  conflicting_home_count integer;
BEGIN
  SELECT COUNT(*)
  INTO conflicting_home_count
  FROM public.portal_pages
  WHERE page_kind = 'home'
    AND slug <> 'home';

  IF conflicting_home_count > 0 THEN
    RAISE EXCEPTION
      'Cannot apply portal page invariants: % home page(s) do not use slug "home". Repair the data before continuing.',
      conflicting_home_count;
  END IF;
END;
$$;


-- ============================================================================
-- 3. Ensure no non-home page reserves the canonical "home" slug.
-- ============================================================================

DO $$
DECLARE
  conflicting_slug_count integer;
BEGIN
  SELECT COUNT(*)
  INTO conflicting_slug_count
  FROM public.portal_pages
  WHERE page_kind <> 'home'
    AND slug = 'home';

  IF conflicting_slug_count > 0 THEN
    RAISE EXCEPTION
      'Cannot apply portal page invariants: % non-home page(s) use the reserved slug "home". Repair the data before continuing.',
      conflicting_slug_count;
  END IF;
END;
$$;


-- ============================================================================
-- 4. Ensure there is at most one home page before adding the unique index.
-- ============================================================================

DO $$
DECLARE
  home_count integer;
BEGIN
  SELECT COUNT(*)
  INTO home_count
  FROM public.portal_pages
  WHERE page_kind = 'home';

  IF home_count > 1 THEN
    RAISE EXCEPTION
      'Cannot apply portal page invariants: found % home pages. At most one is allowed.',
      home_count;
  END IF;
END;
$$;


-- ============================================================================
-- 5. Unique partial index: at most one home page.
--
-- This is stronger than application-level validation because concurrent
-- requests cannot create two home pages.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS portal_pages_single_home_idx
  ON public.portal_pages (page_kind)
  WHERE page_kind = 'home';


-- ============================================================================
-- 6. Home pages must always use the canonical slug "home".
-- ============================================================================

ALTER TABLE public.portal_pages
  DROP CONSTRAINT IF EXISTS portal_pages_home_slug_consistency;

ALTER TABLE public.portal_pages
  ADD CONSTRAINT portal_pages_home_slug_consistency
  CHECK (
    (page_kind = 'home' AND slug = 'home')
    OR
    (page_kind <> 'home' AND slug <> 'home')
  );


-- ============================================================================
-- 7. Publication timestamp consistency.
--
-- published:
--   published_at MUST exist
--
-- anything else:
--   published_at MUST be NULL
-- ============================================================================

ALTER TABLE public.portal_pages
  DROP CONSTRAINT IF EXISTS portal_pages_publication_timestamp_consistency;

ALTER TABLE public.portal_pages
  ADD CONSTRAINT portal_pages_publication_timestamp_consistency
  CHECK (
    (status = 'published' AND published_at IS NOT NULL)
    OR
    (status <> 'published' AND published_at IS NULL)
  );


-- ============================================================================
-- 8. Protect immutable system-page invariants with a trigger.
--
-- RLS protects WHO can mutate rows.
-- This trigger protects WHAT critical properties may become.
--
-- Important:
-- We intentionally do not prohibit ordinary content edits to system pages.
-- A system page may still have title/SEO/content-related data updated.
--
-- What cannot happen:
--
--   system page:
--     is_system true -> false
--
--   system home:
--     page_kind home -> another kind
--     slug home -> another slug
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_portal_page_invariants()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- --------------------------------------------------------------------------
  -- System pages are permanently system pages.
  -- --------------------------------------------------------------------------
  IF TG_OP = 'UPDATE'
     AND OLD.is_system = true
     AND NEW.is_system = false THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'A system portal page cannot be converted into a non-system page.';
  END IF;

  -- --------------------------------------------------------------------------
  -- A system home page must remain the canonical home page.
  -- --------------------------------------------------------------------------
  IF TG_OP = 'UPDATE'
     AND OLD.is_system = true
     AND OLD.page_kind = 'home'
     AND NEW.page_kind <> 'home' THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'The system home page cannot be converted into another page kind.';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.is_system = true
     AND OLD.page_kind = 'home'
     AND NEW.slug <> 'home' THEN
    RAISE EXCEPTION
      USING
        ERRCODE = '23514',
        MESSAGE = 'The system home page must retain the canonical slug "home".';
  END IF;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS portal_pages_enforce_invariants
  ON public.portal_pages;

CREATE TRIGGER portal_pages_enforce_invariants
  BEFORE UPDATE
  ON public.portal_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_portal_page_invariants();


-- ============================================================================
-- 9. Documentation comments.
-- ============================================================================

COMMENT ON INDEX public.portal_pages_single_home_idx IS
  'Guarantees that at most one portal page can have page_kind = home.';

COMMENT ON CONSTRAINT portal_pages_home_slug_consistency
  ON public.portal_pages IS
  'The canonical home page must use slug home, and slug home is reserved exclusively for page_kind home.';

COMMENT ON CONSTRAINT portal_pages_publication_timestamp_consistency
  ON public.portal_pages IS
  'Published pages require published_at; all non-published pages must have published_at cleared.';

COMMENT ON FUNCTION public.enforce_portal_page_invariants() IS
  'Protects immutable invariants of system portal pages independently of application-layer authorization.';

COMMIT;
