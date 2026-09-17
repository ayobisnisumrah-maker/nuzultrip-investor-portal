# Halo Nuzul atomic session hardening

Baseline: `f2ded8807ee3fd989557736cf2415141946ced82`.

## Threat model

The current signed-cookie counter is integrity protected but is not an atomic server-side quota. Concurrent requests can read the same question count and both pass before either response writes the incremented cookie. The cookie signature also reuses `AUDIT_IP_SALT`, coupling two security domains.

## Required design

1. Keep `halo_nuzul.abuse` as the independent 30 requests/hour abuse limiter.
2. Replace the client-carried question counter with an opaque random session id stored only in an HttpOnly, Secure, SameSite=Lax cookie.
3. Store product quota server-side and enforce it atomically in PostgreSQL: maximum 10 successful answers in a 24-hour session window.
4. Quota state and internal RPCs must be service-role only. `anon` and `authenticated` must not be able to read, create, update, delete, or invoke quota state directly.
5. Provider/network failures must not consume a successful-answer slot. Reservation/commit semantics must prevent both concurrency overflow and charging failed provider calls. Expired reservations must be recoverable after crashed requests.
6. Do not use `AUDIT_IP_SALT` for Halo session identity. Use a cryptographically random opaque id; if signing is ever required, use a dedicated secret/domain.
7. Missing, malformed, expired, or unknown cookies get a new server-owned session. Never accept question counts or expiry timestamps from the browser.
8. Handoff starts after the tenth successfully committed answer and remains canonical across reloads and concurrent tabs sharing the cookie.
9. Database/RPC quota failures fail closed and must prevent the model call.
10. Preserve `store:false`, bounded published-portal knowledge, strict input validation, provider timeout, CMS grounding, and canonical handoff navigation.

## Required tests before merge

- Ten successful answers are allowed; the eleventh cannot call the provider.
- Parallel requests at the boundary cannot exceed ten committed answers.
- Provider failure/timeout does not consume a successful-answer slot.
- Missing/malformed/forged cookies cannot set or increase quota.
- State survives reload and is shared across tabs with the same cookie.
- `anon` and `authenticated` cannot access quota table/internal RPC; service role can.
- Database quota failure fails closed and does not call the provider.
- Existing abuse limiter remains independent and returns 429 when exhausted.
- Existing Halo public UI and Browser E2E remain green.

## Release gate

Branch -> PR -> migration reset + DB/RLS tests -> typecheck/lint/unit/integration -> production build -> full Browser E2E exact head SHA -> clean review threads -> squash merge -> Vercel exact merge SHA READY -> aliases -> production smoke + runtime error check.
