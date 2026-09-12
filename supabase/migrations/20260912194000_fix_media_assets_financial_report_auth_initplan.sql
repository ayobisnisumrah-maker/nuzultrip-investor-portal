-- =============================================================================
-- Avoid per-row auth.uid() evaluation in the financial-report media SELECT RLS.
--
-- Semantics stay unchanged: authenticated users still need
-- financial_reports.view, and unpublished/admin-owned assets still require
-- financial_reports.update plus ownership by the current authenticated user.
-- Wrapping auth.uid() in a scalar subquery lets PostgreSQL evaluate it once as
-- an InitPlan instead of once per candidate media_assets row.
-- =============================================================================

alter policy media_assets_select_financial_report_admin
  on public.media_assets
  using (
    app.has_permission('financial_reports.view'::text)
    and (
      (
        app.has_permission('financial_reports.update'::text)
        and uploaded_by = (select auth.uid())
      )
      or exists (
        select 1
        from public.financial_report_versions v
        where v.document_asset_id = media_assets.id
      )
    )
  );
