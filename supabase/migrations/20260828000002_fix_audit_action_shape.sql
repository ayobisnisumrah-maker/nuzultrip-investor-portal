-- Allow hierarchical audit action names such as:
-- portal.section.create
-- portal.page.review_started
-- while still requiring lowercase dot-separated identifiers.

alter table public.audit_logs
  drop constraint audit_logs_action_shape;

alter table public.audit_logs
  add constraint audit_logs_action_shape
  check (
    action ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'
  );
