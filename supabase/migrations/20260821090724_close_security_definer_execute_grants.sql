-- These SECURITY DEFINER functions are internal helpers, trigger functions,
-- authorization helpers, and RLS helpers. They are not public RPC endpoints.
REVOKE EXECUTE ON FUNCTION app.admin_role_key() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.assert_account_type() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.assert_role_assignable(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.assert_section_content_kind() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.assign_company_profile_version_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.assign_document_version_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.assign_financial_version_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.assign_investor_reference() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.assign_section_version_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.bump_role_version() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.current_actor_type() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.current_investor_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.document_workflow_permission_allowed(public.publication_status) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.effective_permissions(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_document_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_document_grant_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_event(text,text,text,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_financial_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_inquiry_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_investor_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_message_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_notification_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_portal_navigation_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_portal_page_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_portal_section_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.emit_portal_theme_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.guard_admin_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.guard_admin_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.guard_financial_line_item() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.guard_financial_period_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.guard_role_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.guard_role_permission_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.has_permission(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.investor_granted_document(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.investor_status_record() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.is_investor() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.participates_in_thread(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app.touch_thread_on_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_principal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_profit_distribution_payment_proof() FROM PUBLIC, anon, authenticated;

-- create_document_with_draft remains available to authenticated because the
-- current application calls it as a signed-in workflow entry point.
