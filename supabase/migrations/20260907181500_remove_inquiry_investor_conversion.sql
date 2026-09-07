-- Portal inquiries are requests for information/documents to study, not investor registration.
-- Remove the legacy conversion RPC so an inquiry can no longer be turned into an
-- investor-admin conversation by matching the sender email to an investor account.

drop function if exists app.convert_portal_inquiry_to_thread(uuid, text);
