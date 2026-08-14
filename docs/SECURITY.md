# Security Architecture

The threat this system exists to prevent, above all others: **one investor
reading another investor's private information.** Everything below is ordered by
how directly it serves that.

---

## 1. Trust Boundaries

```
┌─ Untrusted ──────────────────────────────────────────────┐
│  Browser: React state, cookies, form input, URL params,  │
│  localStorage, realtime payloads, uploaded files         │
└────────────────────────┬─────────────────────────────────┘
                         │  HTTPS, HTTP-only session cookie
┌────────────────────────▼─────────────────────────────────┐
│  Semi-trusted: Next.js server (RSC, Actions, Routes)     │
│  Holds the anon key + a narrowly-scoped service role     │
│  Enforces: authn, authz, validation, audit               │
└────────────────────────┬─────────────────────────────────┘
                         │  Postgres connection carrying the caller's JWT
┌────────────────────────▼─────────────────────────────────┐
│  Trusted: PostgreSQL. RLS is the final, unbypassable     │
│  arbiter. Assumes the layer above may be compromised.    │
└──────────────────────────────────────────────────────────┘
```

**Design assumption:** the application layer _will_ eventually have a bug. RLS is
written so that a missing application-level check is a _bug_, not a _breach_.

---

## 2. Authentication

- Supabase Auth (GoTrue). Passwords are Argon2/bcrypt-hashed by the provider; we
  never see, store, log, or transmit a plaintext password.
- **Cookies:** `HttpOnly`, `Secure` (production), `SameSite=Lax`, `Path=/`.
  Session tokens are never placed in `localStorage` or a non-HttpOnly cookie.
- **Token lifetimes:** access token 1 hour, refresh token rotating with reuse
  detection. Refresh happens in middleware, transparent to the user.
- **Password policy:** minimum 12 characters, checked against a breached-password
  list (k-anonymity range query against HIBP; failure to reach the service is
  fail-open on _availability_ but logged, never fail-open on the length rule).
- **Rate limiting:** sign-in, password reset, investor application and public
  inquiry endpoints are limited per-IP and per-identifier with exponential
  backoff. Failures are logged to `audit_logs`.
- **Enumeration resistance:** sign-in and password-reset responses are identical
  for existing and non-existing accounts, with constant-ish timing.
- **MFA:** the schema and Supabase configuration support TOTP enrolment; it is
  mandatory for `super_admin` from Phase 12 and optional before then.
- **Sign-out** revokes the refresh token server-side, not just the cookie.
- **No admin self-registration.** The admin sign-up route does not exist. Admins
  are created only by `admins.create`, and the invited account must set its own
  password through a single-use, expiring invite link.

### Session/account state checks

Every request resolves the principal and rejects if:
`user_accounts.status = 'disabled'`, or the admin is `is_active = false`, or the
investor's status does not grant access. Disabling an account takes effect on the
**next request**, not on the next token refresh, because the check hits the
database.

---

## 3. Authorisation

Two independent layers, both mandatory. See [RBAC.md](./RBAC.md).

1. **Application:** `defineAction`/`defineRoute` require an explicit permission.
   Produces clear errors and audit records.
2. **Database:** RLS on every table, `FORCE ROW LEVEL SECURITY` so even the table
   owner is subject to it. Deny-by-default — a table with RLS enabled and no
   policy is inaccessible.

**Neither layer is allowed to be the only one.** A code review that adds a table
without policies, or an action without a permission, is rejected.

### Service role usage

The `service_role` key bypasses RLS entirely. Therefore:

- It lives only in `SUPABASE_SERVICE_ROLE_KEY`, a server-only variable, never
  prefixed `NEXT_PUBLIC_`.
- It is importable only from `src/server/admin/**`, enforced by
  `import/no-restricted-paths` and a CI grep.
- Permitted uses, exhaustively: creating auth users during admin/investor
  provisioning, the storage signed-URL broker, the notification outbox worker,
  and scheduled maintenance jobs. Each call site carries a comment stating why
  RLS cannot serve the need.
- Every service-role operation writes an audit entry.

---

## 4. Row Level Security Strategy

Written per-operation (`select`, `insert`, `update`, `delete`) rather than
`for all`, because the correct predicate genuinely differs between reading and
writing, and `for all` policies hide that.

Representative policies:

```sql
-- Investors read only their own record.
create policy investors_select_own on public.investors
  for select to authenticated
  using (id = (select auth.uid()));

-- Admins read investors only with the permission.
create policy investors_select_admin on public.investors
  for select to authenticated
  using (app.has_permission('investors.view'));

-- Investor-visible documents: published + visible to investors,
-- or explicitly granted. Never both-ways-open.
create policy documents_select_investor on public.documents
  for select to authenticated
  using (
    app.investor_has_access()
    and status = 'published'
    and (
      visibility = 'public'
      or visibility = 'investors'
      or (visibility = 'restricted' and app.investor_granted_document(id))
    )
  );

-- Audit logs: insert only. No update or delete policy exists for anyone.
create policy audit_logs_insert on public.audit_logs
  for insert to authenticated with check (true);
create policy audit_logs_select on public.audit_logs
  for select to authenticated using (app.has_permission('audit_logs.view'));
```

Rules for writing policies here:

- Wrap `auth.uid()` as `(select auth.uid())` so Postgres treats it as a scalar
  init-plan instead of re-evaluating per row. This is a real, measurable
  difference on large tables.
- Always specify `to authenticated` / `to anon` — an unqualified policy applies
  to roles you did not think about.
- Index every column a policy filters on.
- Prefer `SECURITY DEFINER` helpers over inline joins so a rule change touches
  one function, not forty policies.
- Helper functions set `search_path = ''` and use fully-qualified names, closing
  the classic `SECURITY DEFINER` search-path hijack.

### The `anon` role

`anon` gets `select` on published portal content only, and `insert` on
`portal_inquiries`. It has no access to any table containing investor,
financial-detail, message, or audit data. This is asserted directly by a test
that enumerates every table in `public` and fails if `anon` can read one that is
not on the allow-list — so a future table is denied unless someone deliberately
adds it to both the policy set and the list.

---

## 5. Input & Output Validation

- **Every** external input is Zod-parsed at the entry point: action arguments,
  route bodies, query params, path params, webhook payloads, and realtime
  payloads.
- Coercion is explicit; unknown keys are stripped (`.strict()` where a stray key
  indicates a bug).
- Numeric bounds, string lengths, enum membership and UUID format are asserted —
  not just types. A `limit` param without a maximum is a denial-of-service.
- **File uploads:** MIME allow-list, extension allow-list, magic-byte sniff on
  the server, hard size cap per bucket, filename sanitised and replaced by a UUID
  path. SVG uploads are rejected outright from user-supplied content (they are
  executable documents); brand SVGs are added through a separate, admin-only,
  sanitised path.
- **Output:** structured content only. There is no `dangerouslySetInnerHTML`
  anywhere in the codebase, and an ESLint rule (`react/no-danger`) makes adding
  one an error. Rich text is a restricted AST rendered by React components, so
  stored XSS has no vector.

---

## 6. File & Media Access

- All investor, company and financial documents live in **private buckets**.
- Storage RLS policies restrict object access to the service role, so a leaked
  anon key grants nothing.
- Download flow: client requests `/api/files/[assetId]` → server resolves the
  principal → checks the owning row's visibility/grant → mints a signed URL with
  a **60-second** TTL → 302 redirect. The signed URL is not logged and not
  persisted.
- Upload flow: client requests a signed upload URL (server validates declared
  MIME/size and the caller's `media.upload` permission) → uploads direct to
  storage → calls `finalize` → server verifies the stored object's real
  size/MIME/checksum before writing the `media_assets` row.
- Path structure is UUID-based and non-enumerable, but **path obscurity is
  explicitly not a control** — removing it would change nothing about who can
  read what.

---

## 7. Web Hardening

Security headers (`next.config.ts` + middleware):

| Header                       | Value                                                                                                                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`    | `default-src 'self'`; nonce-based `script-src`; `img-src 'self' data: blob: <supabase>`; `connect-src 'self' <supabase> wss://<supabase>`; `worker-src 'self' blob:` (Draco/Meshopt decoders); `frame-ancestors 'none'`; `object-src 'none'`; `base-uri 'self'` |
| `Strict-Transport-Security`  | `max-age=63072000; includeSubDomains; preload`                                                                                                                                                                                                                  |
| `X-Content-Type-Options`     | `nosniff`                                                                                                                                                                                                                                                       |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                                                                                                                                                                                                                               |
| `X-Frame-Options`            | `DENY`                                                                                                                                                                                                                                                          |
| `Permissions-Policy`         | camera, microphone, geolocation, payment all `()`                                                                                                                                                                                                               |
| `Cross-Origin-Opener-Policy` | `same-origin`                                                                                                                                                                                                                                                   |

- **CSRF:** Server Actions carry Next.js's built-in origin check; `SameSite=Lax`
  cookies cover the rest. State-changing Route Handlers additionally verify
  `Origin`.
- **Open redirect:** post-auth redirects are validated against an allow-list of
  internal paths. No absolute URLs accepted.
- **Clickjacking:** framing denied.
- **Dependency risk:** `pnpm audit` in CI; Dependabot; lockfile committed;
  `pnpm` with `--frozen-lockfile` in CI.

---

## 8. Secrets

- Never committed. `.gitignore` covers `.env`, `.env.local`, `.env.*.local`,
  `*.pem`, `*.key`.
- `.env.example` lists every variable with a description and a placeholder value
  that is obviously not real.
- Zod-validated at boot; the app refuses to start with a malformed configuration.
- A pre-commit hook (`gitleaks`-style pattern scan) blocks commits containing
  anything shaped like a JWT, a Supabase service key, or a private key block.
- Rotation runbook lives in `docs/OPERATIONS.md` (Phase 12). Rotating the service
  role key requires redeploy; rotating the anon key requires a client release.

---

## 9. Logging & Privacy

- Logs are structured JSON with a correlation id. They **never** contain: session
  tokens, passwords, signed URLs, full identity numbers, or full email addresses
  in error payloads.
- IP addresses in `audit_logs` and `portal_inquiries` are stored as salted
  hashes, sufficient for abuse correlation without retaining raw PII.
- Identity numbers are stored hashed. If a future requirement needs the plaintext
  back, it must use envelope encryption with a KMS-held key — not a database
  column.
- Error responses to clients contain a correlation id and a generic message.
  Stack traces and database errors never reach a browser.

---

## 10. Abuse & Availability

- Rate limits on: auth endpoints, public inquiry submission, investor application,
  signed-URL minting, file upload initiation, search endpoints.
- Pagination is mandatory on every list endpoint with a hard server-side maximum.
- Realtime subscriptions are authorised per topic and capped per connection.
- Uploads capped per file and per account per day.

---

## 11. Pre-Release Security Checklist

Every item must be verifiably true before a production deploy.

- [ ] Every table has RLS enabled **and** forced.
- [ ] Every table has explicit policies, or is deliberately inaccessible.
- [ ] Cross-investor isolation suite passes (`pnpm test:db`).
- [ ] `anon` table allow-list test passes.
- [ ] No `service_role` reference outside `src/server/admin/**`.
- [ ] No `NEXT_PUBLIC_` variable contains a secret.
- [ ] No `dangerouslySetInnerHTML` in the codebase.
- [ ] All entry points declare a permission (no implicit public).
- [ ] Privilege-escalation suite passes (RBAC.md §3).
- [ ] All private buckets are private; no public policy on investor documents.
- [ ] Signed URL TTL ≤ 60s; no signed URL persisted or logged.
- [ ] Security headers present on every response (verified by E2E test).
- [ ] Rate limits active on all listed endpoints.
- [ ] `pnpm audit` shows no high/critical advisories.
- [ ] No development seed data present in the target database.
- [ ] MFA enforced for `super_admin`.
- [ ] Backup and point-in-time recovery verified by an actual restore test.
- [ ] Audit log immutability verified (update/delete attempts fail).
