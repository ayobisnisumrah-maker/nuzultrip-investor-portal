-- =============================================================================
-- Email configuration
--
-- Operational email configuration lives in site_settings so it can be changed
-- from the Super Admin dashboard without changing application source code.
--
-- Secrets such as SMTP passwords / provider API keys MUST NOT be stored here.
-- Those remain server-side secrets.
-- =============================================================================

insert into public.site_settings (
  key,
  value,
  description,
  is_public
)
values
(
  'email.provider',
  '{"type":"supabase_auth","enabled":true}'::jsonb,
  'Provider email autentikasi dan notifikasi aplikasi.',
  false
),
(
  'email.sender',
  '{"name":"Nuzultrip","address":"halonuzul@gmail.com","reply_to":"halonuzul@gmail.com"}'::jsonb,
  'Identitas pengirim email aplikasi.',
  false
),
(
  'email.notifications',
  '{"enabled":true,"password_reset":true,"investor_invitation":true,"security_alert":true}'::jsonb,
  'Pengaturan notifikasi email aplikasi.',
  false
)
on conflict (key) do nothing;

comment on table public.site_settings is
  'Operational key/value configuration managed by authorized administrators.';
