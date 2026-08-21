-- Harden legacy tables that are retained for compatibility/history but are not
-- part of the current public application surface.
REVOKE ALL ON TABLE
  public.settings,
  public.legacy_investors,
  public.meetings,
  public.contact_messages,
  public.legacy_audit_logs,
  public.legacy_investor_status_history,
  public.investor_requests,
  public.meeting_bookings,
  public.user_roles
FROM anon, authenticated;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legacy_investor_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
