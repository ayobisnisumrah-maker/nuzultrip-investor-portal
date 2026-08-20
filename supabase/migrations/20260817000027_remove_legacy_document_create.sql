-- =============================================================================
-- Remove legacy document creation overload
--
-- The document creation function gained p_file_asset_id in migration 00026.
-- PostgreSQL keeps the previous overload because CREATE OR REPLACE FUNCTION
-- does not remove functions whose signatures changed.
-- =============================================================================

drop function if exists app.create_document_with_draft(
  text,
  text,
  public.document_kind,
  text,
  public.visibility
);
