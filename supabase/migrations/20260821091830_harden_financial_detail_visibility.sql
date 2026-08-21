-- Financial detail rows must inherit the same visibility boundary as the
-- published investor-visible report they belong to. Admins with the explicit
-- financial_reports.view permission retain access.

DROP POLICY IF EXISTS financial_line_items_select ON public.financial_line_items;
CREATE POLICY financial_line_items_select
ON public.financial_line_items
FOR SELECT
TO authenticated
USING (
  app.has_permission('financial_reports.view'::text)
  OR EXISTS (
    SELECT 1
    FROM public.financial_report_versions v
    JOIN public.financial_reports r ON r.id = v.financial_report_id
    WHERE v.id = financial_line_items.financial_report_version_id
      AND r.published_version_id = v.id
      AND r.status = 'published'::publication_status
      AND r.visibility = 'investors'::visibility
      AND app.current_investor_id() IS NOT NULL
  )
);

DROP POLICY IF EXISTS financial_kpis_select ON public.financial_kpis;
CREATE POLICY financial_kpis_select
ON public.financial_kpis
FOR SELECT
TO authenticated
USING (
  app.has_permission('financial_reports.view'::text)
  OR EXISTS (
    SELECT 1
    FROM public.financial_report_versions v
    JOIN public.financial_reports r ON r.id = v.financial_report_id
    WHERE v.id = financial_kpis.financial_report_version_id
      AND r.published_version_id = v.id
      AND r.status = 'published'::publication_status
      AND r.visibility = 'investors'::visibility
      AND app.current_investor_id() IS NOT NULL
  )
);

DROP POLICY IF EXISTS financial_report_versions_select_investor ON public.financial_report_versions;
CREATE POLICY financial_report_versions_select_investor
ON public.financial_report_versions
FOR SELECT
TO authenticated
USING (
  app.current_investor_id() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.financial_reports r
    WHERE r.id = financial_report_versions.financial_report_id
      AND r.published_version_id = financial_report_versions.id
      AND r.status = 'published'::publication_status
      AND r.visibility = 'investors'::visibility
  )
);
