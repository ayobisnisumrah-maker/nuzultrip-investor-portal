# Roadmap

Phases are ordered by dependency, not by visibility. Each phase ends with a
**green gate**: `typecheck → lint → unit → rls → build`. The repository is
never left broken between phases.

Legend: ☐ not started · ◐ in progress · ☑ done

---

## Phase 0 — Foundation ☑

**Goal:** a repository that compiles, lints, and has a documented architecture.

- ☑ Architecture documents (`docs/*`)
- ☑ Next.js 15 + React 19 + TypeScript strict scaffold
- ☑ pnpm, ESLint (flat config), Prettier, EditorConfig
- ☑ `.gitignore`, `.env.example`, `README.md`
- ☑ Environment validation (`src/lib/env.ts`)
- ☑ Path aliases, import boundaries lint rule
- ☑ Vitest + Playwright configured

**Gate:** `pnpm typecheck && pnpm lint && pnpm build` green.

---

## Phase 1 — Design System ☑

**Goal:** a token-driven UI kit that all three surfaces consume.

- ☑ Token layer (colour, type, space, radius, shadow, motion, z-index)
- ☑ Light/dark + runtime-themeable CSS custom properties
- ☑ Primitives: Button, Input, Textarea, Select, Checkbox, Radio, Switch, Label,
  Field, Card, Badge, Alert, Avatar, Separator, Skeleton, Spinner
- ☑ Composites: Table, Modal/Dialog, Drawer, Tabs, Dropdown, Tooltip, Toast,
  Pagination, Breadcrumb, EmptyState, ErrorState, LoadingState, Stat
- ☑ Layout: Sidebar, Topbar, PageHeader, Container, Stack, Grid
- ☑ Accessibility baseline (focus rings, contrast, keyboard nav, reduced motion)

**Gate:** design-system route renders every component in both themes; axe clean.

---

## Phase 2 — Database & Security Core ☑

**Goal:** the schema and the security model that everything else depends on.

- ☑ Supabase local dev configured
- ☑ Migrations: identity, RBAC, investors, documents, CMS, financials,
  messaging, notifications, audit, storage metadata
- ☑ Enum types, constraints, indexes, `updated_at` triggers
- ☑ RLS enabled and deny-by-default on **every** table
- ☑ `SECURITY DEFINER` authorisation helper functions
- ☑ Seed: permission catalogue, Super Admin + Admin Internal roles
- ☑ Generated `src/types/database.ts`
- ☑ RLS suite — cross-investor isolation, privilege escalation, audit immutability

**Gate:** `pnpm test:db` green. Cross-tenant reads return zero rows, not errors.

---

## Phase 3 — Authentication & RBAC Runtime ☑

**Goal:** real sessions and real server-side authorisation.

- ☑ Supabase browser/server/admin clients, `server-only` boundaries
- ☑ Session proxy + refresh (Next 16 renamed middleware to `proxy`)
- ☑ Custom access-token hook (identity claims)
- ☑ `Principal` resolution, `requirePermission`, `defineAction`, `defineRoute`
- ☑ Sign-in, sign-out, password recovery, investor application flow
- ☑ Admin provisioning + first-run setup page (no public admin signup)
- ☑ Audit logging on every privileged mutation

**Gate:** the authorisation matrix is asserted for every access rule against
every principal kind, in both directions (`src/server/auth/guards.test.ts`), and
the auth surface is verified end-to-end in a real browser
(`node scripts/smoke-auth.mjs`, 15/15).

---

## Phase 4 — Realtime Backbone ☑

**Goal:** cross-browser synchronisation with the database as source of truth.

- ☑ `realtime.messages` RLS authorisation per topic
- ☑ Postgres triggers emitting curated domain events
- ☑ Typed client (`useRealtimeTopic`) + TanStack Query invalidation bridge
- ☑ Connection state UI (connected / reconnecting / degraded)
- ☑ Playwright two-context test proving propagation

**Gate:** 27 E2E assertions green on Chromium, Firefox and WebKit (9 each),
including two-context propagation and a websocket-frame capture proving a
bystander investor receives nothing about another investor.

---

## Phase 5 — Admin Core ☐

- ☐ Admin shell (responsive sidebar, topbar, command palette)
- ☐ Dashboard with real aggregates
- ☐ Investor management: list, filters, profile, lifecycle transitions
- ☐ Prospective investor approval queue
- ☐ Investor status history & audit view
- ☐ Admin management, Role management, Permission assignment UI
- ☐ Audit log viewer, System settings

**Gate:** every admin mutation is permission-checked and audited.

---

## Phase 6 — Company Profile & Documents ☐

- ☐ Company profile editor + versioning
- ☐ Document module: proposals, pitch decks, supporting documents
- ☐ Publication state machine (draft → review → approved → published → archived)
- ☐ Version history, diff view, restore-as-new-version
- ☐ Storage upload pipeline + signed-URL brokerage
- ☐ Per-investor document assignment

**Gate:** a published version can never be mutated; attempt raises DB error.

---

## Phase 7 — Financial & Investor Reports ☐

- ☐ Financial periods (monthly / quarterly / yearly)
- ☐ Structured statements: revenue, expenses, P&L, assets, liabilities, equity,
  cash flow; derived KPIs computed, never stored as unverified figures
- ☐ Report versioning + publication + provenance metadata
- ☐ Investor reports and business updates
- ☐ Admin authoring UI + investor read UI + charts

**Gate:** no seeded or placeholder financial figures exist in any environment
other than an explicitly-labelled local development seed.

---

## Phase 8 — Portal CMS ☐

- ☐ Page / section / content model with typed section registry
- ☐ Section ordering, visibility, per-section publication
- ☐ Theme manager (logo, colours, typography, dark mode)
- ☐ Navigation, hero, CTA, footer, social, contact managers
- ☐ Media library
- ☐ Draft/preview mode, publish, rollback
- ☐ Cache tag revalidation + realtime portal push

**Gate:** admin publish reflects in a second browser with no manual refresh.

---

## Phase 9 — Public Portal ☐

- ☐ Full portal composition driven entirely by CMS data
- ☐ 3D Ka'bah / Tawaf hero with tiered fallback and asset pipeline
- ☐ All required sections (see ARCHITECTURE §2 of the brief)
- ☐ Investor interest / contact → admin inbox
- ☐ SEO, Open Graph, sitemap, structured data
- ☐ Performance budgets enforced in CI

**Gate:** Lighthouse budgets met on mobile emulation; no hardcoded copy.

---

## Phase 10 — Investor Surface ☐

- ☐ Investor shell + overview
- ☐ Profile, account settings, security (password, sessions)
- ☐ Documents, reports, financial reports, updates
- ☐ Messages, notifications
- ☐ Strict per-investor scoping verified end-to-end

**Gate:** E2E test signs in as Investor B and cannot reach Investor A's data by
URL, API, or storage path.

---

## Phase 11 — Messaging & Notifications ☐

- ☐ Threads, participants, read state, attachments
- ☐ Admin → investor, admin → many, investor → admin, portal → admin
- ☐ Broadcast composer with recipient targeting
- ☐ Notification centre + preferences
- ☐ Email adapter (provider-agnostic interface)

**Gate:** unread counts and delivery states are server-derived, never client state.

---

## Phase 12 — Hardening & Release ☐

- ☐ Security review pass (see SECURITY.md checklist)
- ☐ Cross-browser matrix: Chrome, Edge, Firefox, Safari (desktop + mobile)
- ☐ Responsive audit at 320 / 768 / 1024 / 1440 / 1920
- ☐ Load sanity check on realtime fan-out
- ☐ Backup & restore runbook, migration rollback plan
- ☐ Production deployment checklist
- ☐ Removal of all development-only seeds and fixtures

**Gate:** full CI matrix green; security checklist signed off.

---

## Continuous obligations

- No mock implementation reaches production code paths.
- No placeholder API that pretends to work.
- No fabricated financial figures presented as real.
- Every phase updates documentation it invalidates.
