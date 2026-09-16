# Inquiry WhatsApp completion automation

Implementation contract for automatic WhatsApp follow-up when an admin marks a public information/document inquiry as completed.

- Reuse the existing WhatsApp Cloud API provider configuration and server-side access token.
- Store the completion template configuration in Admin Settings, not in source-only constants.
- Send only on a transition from a non-closed status to `closed`; repeated saves of `closed` must not resend.
- Use the inquiry's submitted phone number as the recipient and normalize it to E.164.
- The status update remains canonical even when the external provider is unavailable; delivery outcome must be returned to the admin UI and audited.
- Never expose the WhatsApp access token to the browser or database settings.
- Provider template name/language must match an approved WhatsApp template before production delivery can succeed.
