# Nuzultrip Investor Portal

> **Berjalan bersama dan berkembang bersama.**

A private Investor Relations platform for Nuzultrip: investor communication,
company presentation, investor materials, reporting, onboarding, and internal IR
management.

**This platform is not an OJK system, not a securities trading platform, and not
a crowdfunding platform.** It does not execute transactions, hold funds, or
provide regulated financial services. It manages a company's relationship with
its investors.

---

## Surfaces

| Surface           | Path        | Access                                                 |
| ----------------- | ----------- | ------------------------------------------------------ |
| **Public Portal** | `/`         | Public — company presentation and investor information |
| **Investor**      | `/investor` | Authenticated, approved investors only                 |
| **Admin**         | `/admin`    | Authenticated internal staff, granular RBAC            |

All three run on one backend and one database. Separation is enforced by
identity, server-side authorisation, and PostgreSQL Row Level Security.

---

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5.9** (`strict`)
- **PostgreSQL** via **Supabase** — Auth, Storage, Realtime, RLS
- **Tailwind CSS v4** over a token-driven design system ("Mizan")
- **TanStack Query** + Supabase Realtime broadcast for live synchronisation
- **Zod** for every external input boundary
- **React Three Fiber / Three.js** for the portal's 3D hero
- **Vitest** (unit + RLS integration), **Playwright** (E2E, cross-browser)

> **Note on TypeScript version.** TypeScript 7 is current, but
> `typescript-eslint@8` supports `<6.1.0`. Type-aware lint rules
> (`no-floating-promises`, `no-misused-promises`) are load-bearing here, so this
> project pins **TypeScript 5.9.3** until `typescript-eslint` supports 7.

---

## Documentation

Read these before contributing. They are the specification, not a summary.

| Document                                       | Contents                                                       |
| ---------------------------------------------- | -------------------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)   | System design, stack decisions, layering, decision log         |
| [docs/DATABASE.md](docs/DATABASE.md)           | Schema, conventions, versioning, indexing, migrations          |
| [docs/SECURITY.md](docs/SECURITY.md)           | Trust boundaries, authn/authz, RLS strategy, release checklist |
| [docs/RBAC.md](docs/RBAC.md)                   | Permission catalogue, roles, escalation guards                 |
| [docs/REALTIME.md](docs/REALTIME.md)           | Topics, event contract, client integration                     |
| [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) | Tokens, typography, components, accessibility                  |
| [docs/ROADMAP.md](docs/ROADMAP.md)             | Phased delivery plan and gates                                 |

---

## Getting Started

### Prerequisites

- **Node.js ≥ 20.9** (24.x recommended)
- **pnpm ≥ 9**
- **Docker Desktop** — required by the Supabase CLI for local development
- **Supabase CLI** — `npm i -g supabase` or see the [install guide](https://supabase.com/docs/guides/cli)

### Setup

```bash
pnpm install
cp .env.example .env.local     # then fill in real values

pnpm db:start                  # starts local Postgres/Auth/Storage/Realtime
pnpm db:reset                  # applies all migrations + reference seed
pnpm db:types                  # regenerates src/types/database.ts

pnpm dev                       # http://localhost:3000
```

`pnpm db:start` prints the local anon and service-role keys — copy them into
`.env.local`.

### Everyday commands

| Command                             | Purpose                                    |
| ----------------------------------- | ------------------------------------------ |
| `pnpm dev`                          | Development server                         |
| `pnpm build` / `pnpm start`         | Production build / serve                   |
| `pnpm typecheck`                    | `tsc --noEmit`                             |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                                     |
| `pnpm format` / `pnpm format:check` | Prettier                                   |
| `pnpm test` / `pnpm test:watch`     | Vitest                                     |
| `pnpm test:e2e`                     | Playwright, full browser matrix            |
| `pnpm db:reset`                     | Rebuild the local database from migrations |
| `pnpm test:db`                      | RLS and policy tests (resets the local DB) |
| `pnpm verify`                       | typecheck → lint → test → build            |

`pnpm verify` is the gate. It must pass before any commit that ends a phase.

---

## Project Structure

```
docs/          Architecture and process documentation
supabase/      Canonical SQL migrations and reference data
scripts/       Type generation, 3D asset pipeline, ops scripts
src/
  app/         Routes — (portal), (investor), (admin), (auth), api
  core/        Framework-agnostic domain layer (no Next.js imports)
  server/      Server-only: Supabase clients, guards, actions
  ui/          Design system components (surface-agnostic)
  features/    Surface-specific composed components
  lib/         Pure utilities
  styles/      Design tokens, global CSS
  types/       Generated database types
tests/         Playwright E2E and integration suites
```

**Enforced boundaries:**

- `src/core` may not import from `src/app`, `src/features`, or `next/*`.
- `src/server` modules import `server-only`; a client import becomes a build error.
- The service-role key may only be referenced from `src/server/admin/**`.

---

## Non-Negotiables

These are enforced by lint rules, tests, or CI — not by convention alone.

1. **Authorisation is server-side, twice.** Application guard _and_ RLS. Frontend
   permission state decides what renders, never what is allowed.
2. **The service-role key never reaches a browser** and never appears outside
   `src/server/admin/**`.
3. **No `dangerouslySetInnerHTML`.** CMS content is a structured, validated AST.
4. **Published artefacts are immutable.** Corrections create a new version.
5. **No fabricated data in production paths.** No mock APIs, no placeholder
   financial figures, no simulated authentication. Development fixtures are
   explicitly gated and excluded from staging and production.
6. **Realtime carries invalidation, not state.** A socket event can never be a
   source of authorised data.
7. **Every screen has designed empty, loading, error and forbidden states.**

---

## Security

Report a suspected vulnerability privately to the project maintainer — do not
open a public issue. The pre-release security checklist lives in
[docs/SECURITY.md §11](docs/SECURITY.md).

Never commit `.env*.local`, service-role keys, private keys, or tokens.

---

## Licence

Proprietary. © Nuzultrip. All rights reserved.
