# Nuzultrip Investor Portal — Architecture

> **Berjalan bersama dan berkembang bersama.**
>
> A private Investor Relations platform for Nuzultrip. Not an OJK system, not a
> securities trading venue, not a crowdfunding platform. It manages the company's
> relationship with its investors: communication, materials, reporting, onboarding.

**Status:** Foundation — v0.1
**Last reviewed:** 2026-08-14

---

## 1. Scope & Non-Goals

### In scope

- Internal Investor Relations management (Admin).
- Public presentation of the company to prospective investors (Public Portal).
- Private, per-investor secure area (Investor).
- Company profile, proposals, pitch decks, financial reports, investor reports.
- Messaging, notifications, audit trail, realtime synchronisation.

### Explicit non-goals

- No order matching, no trading, no settlement, no custody.
- No public offering mechanics, no share subscription payment rails.
- No KYC/AML regulatory pipeline (the platform records administrative approval
  only; it is not a regulated onboarding system).
- No accounting engine. Financial data is _reported_, not _computed from ledgers_.

These non-goals are load-bearing: they keep the data model honest. Financial
figures in this system are **published reported figures with provenance**, never
derived numbers presented as authoritative.

---

## 2. Access Surfaces

Three surfaces, **one backend, one database, one auth system**.

| Surface       | Route prefix  | Auth                                  | Audience                      |
| ------------- | ------------- | ------------------------------------- | ----------------------------- |
| Public Portal | `/`           | none (public read)                    | Anyone, prospective investors |
| Investor      | `/investor/*` | required, `account_type = 'investor'` | Approved investors            |
| Admin         | `/admin/*`    | required, `account_type = 'admin'`    | Internal staff                |

There is **no separate "admin database"**. Separation is enforced by identity,
RBAC and RLS — not by deployment topology. A second database would create
sync problems and a false sense of security.

---

## 3. Technology Stack

| Concern                | Choice                                                                                           | Why                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework              | **Next.js 16 (App Router) + React 19**                                                           | Server Components let every permission check run server-side by default. One deployable unit for three surfaces. Streaming suits a content-heavy public portal. |
| Language               | **TypeScript, `strict` + `noUncheckedIndexedAccess`**                                            | Non-negotiable for a system with money-adjacent data.                                                                                                           |
| Database               | **PostgreSQL via Supabase**                                                                      | Row Level Security is the single most valuable feature available for "Investor A must never see Investor B". Mature, relational, migration-friendly.            |
| Auth                   | **Supabase Auth (GoTrue)**                                                                       | Real sessions, real password hashing, MFA-capable, integrates with RLS via JWT claims.                                                                          |
| Realtime               | **Supabase Realtime — Broadcast from Database**                                                  | See §8. Scales by topic, authorised by RLS, not by table.                                                                                                       |
| Storage                | **Supabase Storage, private buckets + signed URLs**                                              | Objects never publicly addressable; access brokered server-side.                                                                                                |
| Styling                | **Tailwind CSS v4 + CSS custom-property design tokens**                                          | Tokens are the contract; Tailwind is only the ergonomics layer. Admin-configurable theming needs runtime CSS variables, which v4's `@theme` maps cleanly.       |
| Primitives             | **Radix UI primitives**, custom-skinned                                                          | Accessibility (focus traps, ARIA, keyboard nav) is genuinely hard. We own the visuals, not the a11y plumbing.                                                   |
| Data fetching (client) | **TanStack Query**                                                                               | Realtime events invalidate query keys. Cache invalidation becomes declarative rather than ad-hoc.                                                               |
| Validation             | **Zod**                                                                                          | One schema → TS types, API input validation, JSONB content validation.                                                                                          |
| 3D                     | **React Three Fiber + drei + Three.js**                                                          | See §11.                                                                                                                                                        |
| Email                  | **Provider-agnostic `NotificationChannel` interface**, Resend as first adapter                   | Notifications must not be welded to one vendor.                                                                                                                 |
| Testing                | **Vitest** (unit + RLS integration against a real Postgres), **Playwright** (E2E, cross-browser) | RLS without tests is a guess. See §13.                                                                                                                          |
| Package manager        | **pnpm**                                                                                         | Strict node_modules, fast, deterministic.                                                                                                                       |

### Rejected alternatives (and why)

- **Prisma / Drizzle as schema source of truth.** Rejected. The security model
  lives in Postgres (RLS policies, `SECURITY DEFINER` functions, triggers,
  constraints). Splitting schema ownership between an ORM and raw SQL guarantees
  drift in exactly the layer we cannot afford drift. **SQL migrations are
  canonical**; TypeScript types are _generated from_ the database.
- **A separate Express/Nest API service.** Rejected for v1. It adds a network
  hop, a second auth surface and a deploy target without adding a security
  property we don't already get from Server Components + RLS. Revisit if we need
  non-HTTP consumers.
- **NextAuth/Auth.js.** Rejected. It would put the session outside Postgres,
  so RLS could no longer trust `auth.uid()` without a bridge. Supabase Auth keeps
  identity and row-level authorisation in the same trust domain.
- **Storing permissions in the JWT.** Partially rejected — see §7.
- **`dangerouslySetInnerHTML` CMS.** Rejected outright. Structured content only.

---

## 4. Directory Structure

```
nuzultrip-investor-portal/
├─ docs/                          # Architecture & process docs (this folder)
├─ supabase/
│  ├─ migrations/                 # Canonical, ordered, immutable SQL migrations
│  ├─ seed/                       # Idempotent reference data (roles, permissions)
│  └─ seed/dev/                   # Development-only fixtures (gated)
├─ public/
│  └─ models/                     # Optimised .glb assets (Draco/Meshopt)
├─ scripts/                       # Asset pipeline, type generation, ops scripts
├─ src/
│  ├─ app/
│  │  ├─ (portal)/                # Public surface — statically optimised
│  │  ├─ (investor)/investor/     # Private investor surface
│  │  ├─ (admin)/admin/           # Internal surface
│  │  ├─ (auth)/                  # sign-in, callback, recovery
│  │  └─ api/                     # Route Handlers (webhooks, signed URLs, uploads)
│  ├─ core/                       # Framework-agnostic domain layer
│  │  ├─ auth/                    # session resolution, principal model
│  │  ├─ rbac/                    # permission catalogue, guards
│  │  ├─ investors/               # lifecycle state machine + services
│  │  ├─ documents/               # versioning + publication state machine
│  │  ├─ financials/              # periods, statements, KPIs
│  │  ├─ cms/                     # section registry, schemas, publishing
│  │  ├─ messaging/
│  │  ├─ notifications/
│  │  ├─ storage/
│  │  ├─ audit/
│  │  └─ realtime/
│  ├─ server/                     # Server-only: Supabase clients, actions, guards
│  ├─ ui/                         # Design system components (surface-agnostic)
│  ├─ features/                   # Surface-specific composed components
│  ├─ lib/                        # Pure utilities, formatters, result types
│  ├─ styles/                     # Token definitions, global CSS
│  └─ types/
│     └─ database.ts              # GENERATED — do not edit
└─ tests/
   ├─ e2e/                        # Playwright, per-surface
   └─ integration/
```

**`src/core` may not import from `src/app` or `src/features`.** Domain logic
must be testable without a request context. Enforced by ESLint
`import/no-restricted-paths`.

**Files marked `server-only`.** Every module under `src/server` imports the
`server-only` package. Any accidental client import becomes a build error, not a
runtime credential leak.

---

## 5. Layered Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Surfaces (RSC pages, client components)                     │
│  — render only; never authorise                              │
├──────────────────────────────────────────────────────────────┤
│  Entry points: Server Actions & Route Handlers               │
│  — authenticate → authorise → validate → delegate → audit    │
├──────────────────────────────────────────────────────────────┤
│  Domain services (src/core)                                  │
│  — business rules, state machines, invariants                │
├──────────────────────────────────────────────────────────────┤
│  Data access (Supabase client, scoped to the caller)         │
├──────────────────────────────────────────────────────────────┤
│  PostgreSQL — constraints, triggers, RLS (last line)         │
└──────────────────────────────────────────────────────────────┘
```

### The four-step entry-point contract

Every mutation entry point performs, in order:

1. **Authenticate** — resolve the `Principal` from the Supabase session.
2. **Authorise** — `requirePermission('investors.approve')` or an ownership
   check. Throws before any I/O.
3. **Validate** — Zod-parse the input. Unparsed input never reaches a service.
4. **Delegate & audit** — call the domain service; write an `audit_log` entry in
   the same transaction as the mutation where possible.

This is codified as a helper (`defineAction`) so it cannot be forgotten by
accident — an action defined without a `permission` or an explicit
`permission: 'public'` marker fails to type-check.

---

## 6. Authentication Architecture

One `auth.users` table. One session mechanism. Two principal types.

```
auth.users (Supabase-managed)
    │ 1:1
    ▼
public.user_accounts        ← account_type: 'admin' | 'investor'
    │                          status: active | disabled
    ├──► public.admins       (1:1 when account_type='admin')  → role_id
    └──► public.investors    (1:1 when account_type='investor') → lifecycle status
```

- Sessions are cookie-based, HTTP-only, `SameSite=Lax`, `Secure` in production,
  refreshed in Next.js middleware.
- **The `service_role` key exists only in server environment variables.** It is
  never sent to a browser, never in a `NEXT_PUBLIC_*` variable, and is used only
  by a narrow, explicitly-named set of server modules (auth-hook, storage broker,
  admin provisioning). Lint rule blocks the identifier outside `src/server/admin`.
- Middleware performs **coarse** routing protection (is there a session? is the
  account type right for this prefix?). It is a UX affordance and a defence-in-
  depth layer — **never the authorisation decision**. Real checks happen in the
  entry point and in RLS.

Registration paths:

- **Investors** self-register an _application_. They receive a `prospective`
  account with no data access until an admin approves them.
- **Admins** are provisioned only by an existing admin holding `admins.create`.
  There is no public admin sign-up route.

Details: [SECURITY.md](./SECURITY.md).

---

## 7. Authorisation / RBAC

Full model: [RBAC.md](./RBAC.md).

Summary of the key trade-off:

**Where do permissions live at request time?**

- _Option A — everything in the JWT._ Fast, zero DB round-trips in RLS. But
  revoking a permission takes effect only after token refresh, and the token
  grows with the permission set. Stale privilege is a security bug.
- _Option B — resolve from DB every check._ Always fresh, but a round-trip per
  policy evaluation, which is brutal inside RLS.
- **Chosen — hybrid.** The JWT carries only _stable identity facts_:
  `account_type`, `admin_id`/`investor_id`, `role_id`. Granular permissions are
  resolved in Postgres by `STABLE SECURITY DEFINER` helper functions, which
  Postgres caches per-statement. Role→permission changes take effect on the next
  request. A `role_version` counter lets us force token refresh when a role's
  permission set changes materially.

Authorisation is enforced **twice, independently**: in the application entry
point (clear errors, auditable) and in RLS (categorical, unbypassable). Frontend
permission state controls only what is _rendered_, never what is _allowed_.

---

## 8. Realtime Architecture

Full model: [REALTIME.md](./REALTIME.md).

Requirement: a change in one browser must appear in another browser, across
Chrome/Edge/Firefox/Safari, without a manual refresh, with the database as the
source of truth.

**Chosen: Supabase Realtime "Broadcast from Database".**
Postgres triggers call `realtime.send()` onto a **named topic**; clients
subscribe to topics; subscription is authorised by RLS on `realtime.messages`.

Why not "Postgres Changes" (the simpler option)? Postgres Changes re-evaluates
RLS **per subscribed client per row change**, which degrades sharply as
concurrent investors grow, and it broadcasts table-shaped payloads that leak
schema detail. Broadcast-from-database lets us:

- fan out **one** message per topic regardless of subscriber count,
- send a **curated payload** (an event, not a row dump),
- authorise **once per subscription**, not per event,
- emit domain events that don't map 1:1 to a table write.

Topic design:

| Topic                    | Subscribers            | Example events                                          |
| ------------------------ | ---------------------- | ------------------------------------------------------- |
| `portal:public`          | anyone                 | `portal.published`, `theme.updated`                     |
| `investor:{investor_id}` | that investor + admins | `message.received`, `document.shared`, `status.changed` |
| `admin:global`           | all admins             | `investor.applied`, `message.received`                  |
| `admin:role:{role_id}`   | admins in that role    | scoped operational events                               |

**Explicitly forbidden as primary mechanisms:** `localStorage`,
`BroadcastChannel`, polling, or any browser-only synchronisation. (`BroadcastChannel`
may be used _only_ as a same-browser tab-dedup optimisation on top of a real
server event, never as the transport.)

Client integration: a realtime event does not carry the new state — it carries an
**invalidation signal**. TanStack Query refetches through the normal, RLS-guarded
path. This means a spoofed or stale event can never inject data into a client;
the worst case is a redundant refetch.

---

## 9. Data Architecture

Full schema: [DATABASE.md](./DATABASE.md).

Principles:

- UUID (`gen_random_uuid()`) primary keys everywhere.
- `created_at`/`updated_at` `timestamptz` on every table; `updated_at` maintained
  by trigger, not by application code.
- Foreign keys with deliberate `ON DELETE` semantics. Investor records are
  **never** hard-deleted; they are deactivated. Audit rows are `ON DELETE SET NULL`
  on their actor so that deleting a staff account cannot erase history.
- Enums as Postgres `enum` types for closed sets (lifecycle status, publication
  state), lookup tables for open sets (permissions, roles).
- **Financial data is structurally separated from CMS content.** Different
  schemas of concern, different permissions, different audit sensitivity. A CMS
  editor must not be able to touch a financial figure.
- **Immutability of published artefacts.** `document_versions`,
  `financial_report_versions` and `company_profile_versions` are append-only.
  Publishing sets a pointer; it never mutates a prior version. Enforced by
  trigger, not convention.

---

## 10. Storage Architecture

- Buckets: `public-media` (portal imagery, CMS assets — public read),
  `investor-documents` (private), `company-documents` (private, staff-scoped),
  `financial-documents` (private, permission-scoped).
- **Every private file is served through a short-lived signed URL** minted by a
  server route _after_ an authorisation check against the owning row. Object
  paths are UUID-based and non-enumerable, but obscurity is never the control —
  the authorisation check is.
- Uploads go direct-to-storage via a **signed upload URL** issued by the server
  (so large files never traverse the app server), followed by a server-side
  `finalize` call that validates MIME/size against the storage metadata and
  writes the `media_assets` row. A file with no finalised metadata row is
  unreachable and garbage-collected.
- Database rows store _metadata only_: path, MIME, size, checksum, owner,
  visibility, version. Never bytes.

---

## 11. 3D Hero Architecture

**Concept:** a premium, stylised Ka'bah environment with pilgrims performing
Tawaf — cinematic, reverent, restrained. This is the portal's signature moment
and its identity anchor.

**Non-negotiables:** it must be a real 3D scene (no static image masquerading as
3D); it must not degrade the page; it must have a real fallback.

Implementation strategy:

1. **Progressive, tiered loading.** The hero renders a designed, high-quality
   static composition immediately (LCP element, never blocked by WebGL). The 3D
   canvas mounts _after_ hydration, off the critical path, and cross-fades in.
   The measured LCP is therefore never the WebGL frame.
2. **Capability tiers**, resolved at runtime:
   - `full` — desktop, WebGL2, adequate GPU: full scene, soft shadows, ~60fps cap.
   - `reduced` — mobile/tablet/integrated GPU: fewer pilgrim instances, baked
     lighting, no dynamic shadows, capped DPR (≤1.5).
   - `static` — no WebGL, `prefers-reduced-motion`, low memory, or a save-data
     hint: the designed static composition is the final state. It is a real
     designed asset, not a screenshot of the 3D scene.
3. **Instancing.** Pilgrims are `InstancedMesh` with per-instance transforms
   driven by a parametric Tawaf orbit (radius jitter, phase offset, speed
   variance). One draw call for hundreds of figures.
4. **Asset pipeline** (`scripts/optimize-model.mjs`): source `.glb` →
   `gltf-transform` (dedup, prune, weld) → Draco/Meshopt compression → KTX2
   texture compression → budget assertion in CI (**hard cap: 2.5 MB total hero
   payload, gzipped**). The build fails if exceeded. Models are loaded lazily
   with `useGLTF` + Suspense.
5. **Camera.** Slow orbital drift + subtle parallax, damped. Disabled entirely
   under `prefers-reduced-motion`.
6. **Frame governance.** `frameloop="demand"` is not used (the scene animates),
   but the canvas pauses on `IntersectionObserver` exit and on
   `document.hidden`. A `PerformanceMonitor` downgrades the tier live if the
   frame budget is missed.

Asset provenance is documented in `public/models/README.md`. Any third-party
model must have a license compatible with commercial use, recorded there.

---

## 12. Routing & API Architecture

**Rendering strategy per surface:**

| Surface       | Strategy                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Public portal | RSC, dynamically rendered, over a **tag-revalidated data cache** (`portal:published`). Cheap to render, instantly correct on publish. |
| Investor      | Dynamic, always request-scoped. Never cached at the route level.                                                                      |
| Admin         | Dynamic, `no-store`.                                                                                                                  |

**Why the portal is not full-route cached.** Two request-scoped requirements
make every route dynamic regardless:

1. A **nonce-based Content-Security-Policy**. Next.js emits inline RSC payload
   scripts, so a CSP without `'unsafe-inline'` needs a per-request nonce, which
   is generated in middleware. A nonce cannot be baked into a statically cached
   page.
2. The **theme cookie**, read in the root layout so an explicit light/dark
   choice is correct in the first byte of HTML rather than flashing after
   hydration.

Both were weighed against full-route caching and both won: a weakened CSP is a
real security regression, and a theme flash is a visible defect on every page
load. The performance that full-route caching would have bought is recovered at
the **data layer** instead — CMS reads are cached and revalidated by the
`portal:published` tag, so a portal render is a template render over
already-cached data, not a database round-trip. HTML rendering is the cheap part;
the queries were the expensive part, and those are still cached.

**Mutations use Server Actions** as the default (co-located, typed, no manual
fetch layer). **Route Handlers (`/api`) are used only where an HTTP endpoint is
genuinely required**: signed-URL brokerage, upload finalisation, webhooks
(email/provider callbacks), health checks, and any future non-browser consumer.
Both go through the same `defineAction` / `defineRoute` guard contract — the
transport differs, the security contract does not.

Errors use a typed `Result` at the domain boundary; entry points translate to
either a serialisable action error or an RFC 7807-shaped JSON problem for routes.
Internal error detail is never returned to a client; it is logged with a
correlation id that _is_ returned.

---

## 13. Testing Strategy

| Layer             | Tool                                   | What it proves                                                                                                                                                                                                 |
| ----------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain logic      | Vitest                                 | State machines (investor lifecycle, publication states) behave. Pure, fast, no DB.                                                                                                                             |
| **RLS policies**  | **Vitest** against a real Postgres     | _Investor A cannot read Investor B._ The single highest-value suite in the project. Runs as `anon`/`authenticated` with `request.jwt.claims` set, exactly as PostgREST does — the application layer is absent. |
| Permission guards | Vitest + test principals               | Every entry point rejects an under-privileged caller.                                                                                                                                                          |
| Integration       | Vitest + ephemeral Supabase            | Services against a real database with migrations applied.                                                                                                                                                      |
| E2E               | Playwright (Chromium, Firefox, WebKit) | The three surfaces work, and **realtime propagates between two independent browser contexts** — the literal acceptance criterion from the brief.                                                               |
| Accessibility     | `@axe-core/playwright`                 | No critical violations on key routes.                                                                                                                                                                          |
| Performance       | Lighthouse CI budget                   | Hero payload + LCP budgets enforced.                                                                                                                                                                           |

**CI gate:** `typecheck → lint → unit → rls → build → e2e`. A red gate blocks
merge. The repository is never left in a broken state.

---

## 14. Environments & Configuration

- `.env.example` is committed and exhaustive. `.env*.local` are git-ignored.
- Environment variables are parsed and validated by Zod at boot
  (`src/lib/env.ts`), split into `serverEnv` and `clientEnv`. `serverEnv` is
  `server-only`. A missing or malformed variable fails the build, not the first
  request at 3am.
- Three environments: `local` (Supabase CLI, Docker), `staging`, `production`.
  Migrations flow strictly local → staging → production.

---

## 15. Observability

- Structured JSON logging with a per-request correlation id.
- `audit_logs` is the business-level record: actor, action, entity, before/after
  diff, IP, user agent. Written for every privileged mutation. Append-only,
  enforced by RLS (no `UPDATE`/`DELETE` policy exists for anyone).
- Health endpoint `/api/health` checks DB reachability and migration version.

---

## 16. Phased Delivery

See [ROADMAP.md](./ROADMAP.md) for the full plan and acceptance criteria.

---

## 17. Architectural Decision Log

| #   | Decision                                                | Alternative                   | Rationale                                               |
| --- | ------------------------------------------------------- | ----------------------------- | ------------------------------------------------------- |
| 1   | SQL migrations are the canonical schema                 | ORM-owned schema              | Security lives in Postgres; single owner prevents drift |
| 2   | Broadcast-from-database realtime                        | Postgres Changes              | Scales per-topic not per-subscriber; curated payloads   |
| 3   | Realtime carries invalidation, not state                | Push full payloads            | An event can never inject unauthorised data             |
| 4   | Hybrid JWT claims + DB permission resolution            | All-in-JWT                    | Avoids stale privilege after revocation                 |
| 5   | Structured CMS content (typed JSONB + Zod)              | Rich HTML                     | Eliminates stored XSS; enables re-layout and versioning |
| 6   | Private buckets + brokered signed URLs                  | Public bucket + obscure paths | Obscurity is not access control                         |
| 7   | Append-only version tables                              | In-place edits                | Published financial/legal material must be immutable    |
| 8   | Single database, RLS separation                         | Separate admin DB             | Sync risk without a real security gain                  |
| 9   | Server Actions default, Route Handlers by exception     | REST for everything           | Fewer hand-written transport layers to get wrong        |
| 10  | 3D hero off the critical path with real static fallback | 3D as LCP element             | Performance and accessibility are not optional          |
