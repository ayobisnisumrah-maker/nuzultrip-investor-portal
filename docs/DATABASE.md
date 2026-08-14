# Database Architecture

PostgreSQL 15+ via Supabase. SQL migrations under `supabase/migrations` are the
**canonical schema**. TypeScript types are generated from the database, never the
other way round.

---

## 1. Conventions

| Rule         | Detail                                                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary keys | `uuid` default `gen_random_uuid()`. No sequential integer ids exposed to clients.                                                                                                                 |
| Timestamps   | `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` maintained by the `set_updated_at()` trigger.                                                    |
| Soft delete  | Business entities use lifecycle/status columns, not `deleted_at` flags. Investors are **never** hard-deleted.                                                                                     |
| Naming       | `snake_case`, plural tables, singular column names. Junctions named `a_b`.                                                                                                                        |
| Enums        | Postgres `enum` for closed sets that the application branches on. Lookup tables for extensible sets.                                                                                              |
| Money        | `numeric(20,2)` — never `float`. Currency stored alongside as ISO-4217 `char(3)`.                                                                                                                 |
| JSONB        | Only for genuinely polymorphic structured content (CMS sections, audit diffs, notification payloads). Always validated by Zod on write and constrained by a `jsonb_typeof(...) = 'object'` check. |
| Ordering     | Explicit `position int` columns, never implicit insertion order.                                                                                                                                  |
| RLS          | `alter table ... enable row level security` **and** `force row level security` on every table. Deny-by-default: no policy ⇒ no access.                                                            |

### `ON DELETE` policy

- Content owned by a parent → `cascade` (e.g. `portal_sections` → `portal_pages`).
- Historical / audit references → `set null` (deleting a staff account must not
  erase what they did).
- Referenced canonical entities → `restrict` (cannot delete a role still assigned).

---

## 2. Schema Map

```
                       ┌──────────────────┐
                       │   auth.users     │  (Supabase-managed)
                       └────────┬─────────┘
                                │ 1:1
                       ┌────────▼─────────┐
                       │  user_accounts   │  account_type, status, email
                       └───┬──────────┬───┘
              account_type │          │ account_type
                  ='admin' │          │ ='investor'
                 ┌─────────▼──┐   ┌───▼───────────┐
                 │   admins   │   │   investors   │
                 └─────┬──────┘   └───┬───────┬───┘
                       │ role_id      │       │
                 ┌─────▼──────┐       │       └──► investor_status_history
                 │   roles    │       │
                 └─────┬──────┘       └──► document_access_grants
                       │
              ┌────────▼─────────┐
              │ role_permissions │──► permissions
              └──────────────────┘

  DOCUMENTS            FINANCIALS              CMS                MESSAGING
  ─────────            ──────────              ───                ─────────
  documents            financial_periods       portal_pages       message_threads
   └ document_         financial_reports        └ portal_sections  └ thread_participants
     versions           └ financial_report_      └ portal_section_ └ messages
   └ document_            versions                 versions          └ message_reads
     access_grants        └ financial_line_      portal_navigation   └ message_attachments
                            items               portal_theme
  company_profiles      financial_kpis          site_settings      notifications
   └ company_profile_                                              notification_preferences
     versions           media_assets            audit_logs
```

---

## 3. Identity & RBAC

### `user_accounts`

One row per `auth.users` row. The join point between Supabase Auth and the domain.

| Column                                       | Type                  | Notes                                                |
| -------------------------------------------- | --------------------- | ---------------------------------------------------- |
| `id`                                         | uuid PK               | **equals** `auth.users.id` (FK, `on delete cascade`) |
| `account_type`                               | `account_type` enum   | `admin` \| `investor`                                |
| `status`                                     | `account_status` enum | `active` \| `disabled`                               |
| `email`                                      | citext, unique        | denormalised from auth for querying/joins            |
| `full_name`                                  | text not null         |                                                      |
| `phone`, `avatar_path`, `locale`, `timezone` |                       |                                                      |
| `last_seen_at`                               | timestamptz           |                                                      |

A **partial unique index** guarantees the 1:1 subtype relationship, and a check
constraint on `admins`/`investors` insert triggers verifies the matching
`account_type`. A row cannot be both an admin and an investor.

### `roles`

`id`, `key` (unique slug), `name`, `description`, `is_system` (bool — system roles
cannot be deleted or renamed), `permission_version` (int, bumped on any change to
its permission set — used to force token refresh), timestamps.

Seeded system roles: `super_admin`, `admin_internal`.
`super_admin` implicitly holds every permission; this is resolved in the
authorisation function, **not** by inserting thousands of `role_permissions` rows
(so a newly added permission is automatically covered).

### `permissions`

`id`, `key` (unique, `module.action`), `module`, `action`, `description`,
`is_dangerous` (bool). Seeded from a single catalogue that is also the source of
the TypeScript `Permission` union — see [RBAC.md](./RBAC.md).

### `role_permissions`

`(role_id, permission_id)` composite unique, both FK `on delete cascade`.

### `admins`

`id` PK/FK → `user_accounts.id`, `role_id` FK → `roles` (`on delete restrict`),
`employee_ref`, `title`, `is_active`, `created_by` FK → `admins` (`set null`),
timestamps.

---

## 4. Investors

### `investors`

| Column                                                                                      | Notes                                                      |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `id` uuid PK/FK → `user_accounts.id`                                                        |                                                            |
| `reference_code` text unique                                                                | human-readable, e.g. `NTI-2026-0142`, generated by trigger |
| `status` `investor_status` enum                                                             | see lifecycle below                                        |
| `investor_type` enum                                                                        | `individual` \| `institution`                              |
| `legal_name`, `identity_number_hash`                                                        | identity number is **hashed**, never stored plaintext      |
| `country`, `city`, `address`                                                                |                                                            |
| `organization_name`, `organization_role`                                                    | institutions only                                          |
| `application_note`                                                                          | applicant's own message                                    |
| `applied_at`, `reviewed_at`, `reviewed_by`, `approved_at`, `activated_at`, `deactivated_at` |                                                            |
| `rejection_reason`                                                                          |                                                            |
| `relationship_manager_id` FK → `admins`                                                     |                                                            |

**Lifecycle** (`investor_status` enum), enforced by a transition function — an
invalid transition raises, it is not silently accepted:

```
prospective ─► submitted ─► under_review ─┬─► approved ─► active ⇄ inactive
                                          └─► rejected
```

| From           | Allowed to                 |
| -------------- | -------------------------- |
| `prospective`  | `submitted`                |
| `submitted`    | `under_review`, `rejected` |
| `under_review` | `approved`, `rejected`     |
| `approved`     | `active`, `rejected`       |
| `active`       | `inactive`                 |
| `inactive`     | `active`                   |
| `rejected`     | `under_review` (re-open)   |

Data access is granted only in `approved`, `active`. `inactive` retains read
access to nothing; the account can sign in but sees an explanatory state.

### `investor_status_history`

Append-only. `investor_id`, `from_status`, `to_status`, `changed_by` (`set null`),
`reason`, `metadata jsonb`, `created_at`. Written by trigger on every status
change so it cannot be bypassed by application code.

---

## 5. Documents & Versioning

The same shape is reused for documents, company profiles and financial reports:
a **container** row holding identity and current pointers, plus an **append-only
version** table.

### `documents`

There is deliberately **no** `financial_report` or `company_profile` kind here.
Financial reporting is its own module, with structured line items and mandatory
provenance; the company profile is its own versioned entity. Modelling either as
a document as well would let the same fact exist in two places with two
different answers.

`id`, `kind` (`document_kind` enum: `investment_proposal` \| `pitch_deck` \|
`investor_report` \| `business_update` \| `supporting`), `title`, `slug`,
`summary`, `visibility`
(`visibility` enum: `public` \| `investors` \| `restricted` \| `internal`),
`status` (`publication_status` enum), `current_version_id`,
`published_version_id`, `owner_admin_id`, `archived_at`, timestamps.

### `document_versions`

`id`, `document_id`, `version_number` int (unique per document), `title`,
`content jsonb` (structured), `file_asset_id` FK → `media_assets`, `change_note`,
`status`, `created_by`, `approved_by`, `approved_at`, `published_at`,
`created_at`.

**Immutability:** a `BEFORE UPDATE` trigger raises if the row's status has ever
reached `published` and any content column changes. `DELETE` has no policy for
any principal. Corrections happen by creating a new version.

**Publication state machine** (`publication_status`):

```
draft ─► review ─► approved ─► published ─► archived
  ▲         │          │
  └─────────┴──────────┘   (send back for revision)
```

`published` requires the `*.publish` permission; `approved` requires the
reviewer to be a different admin than the author when
`site_settings.require_separate_approver` is on (segregation of duties).

### `document_access_grants`

Per-investor access to `restricted` documents: `document_id`, `investor_id`,
`granted_by`, `granted_at`, `revoked_at`. Unique on
`(document_id, investor_id) where revoked_at is null`.

### `company_profiles` / `company_profile_versions`

Singleton-per-organisation container with a versioned structured payload:
identity, legal info, history, vision, mission, leadership, business overview,
ecosystem, strategic direction, milestones, achievements, statistics, contact,
brand assets. Each block is a typed JSONB object validated by Zod. This table is
the **canonical source of truth** that CMS sections and generated investor
materials reference — the portal renders _from_ it rather than duplicating it.

---

## 6. Financials

Deliberately separate from CMS content: different permissions, different audit
sensitivity, different lifecycle.

### `financial_periods`

`id`, `period_type` enum (`monthly` \| `quarterly` \| `yearly`), `fiscal_year`,
`period_index` (1–12 / 1–4 / 1), `starts_on`, `ends_on`, `currency`,
`status` (`open` \| `closed` \| `locked`), timestamps.
Unique on `(period_type, fiscal_year, period_index)`. Exclusion-safe: a check
constraint validates `period_index` against `period_type`.

### `financial_reports` / `financial_report_versions`

Container + append-only versions, same discipline as documents.
A version carries `statement_data jsonb` (validated), `source` (`internal` \|
`reviewed` \| `audited`), `prepared_by`, `notes`, `document_asset_id` (the PDF).

**`source` is mandatory and rendered in the UI.** Investors always see whether a
figure is internal management reporting or audited. This is the honesty control
that replaces "don't create fake financial numbers" with a structural guarantee.

### `financial_line_items`

Normalised rows for querying and charting:
`financial_report_version_id`, `statement` (`income` \| `balance` \| `cash_flow`),
`category` (`revenue` \| `expense` \| `asset` \| `liability` \| `equity` \|
`operating` \| `investing` \| `financing`), `line_key`, `label`, `amount
numeric(20,2)`, `currency`, `position`, `parent_id` (self-FK for hierarchy).

Derived figures (gross profit, net profit, totals, margins, growth) are
**computed at read time** from line items. They are never stored, so they can
never drift from their inputs.

### `financial_kpis`

`financial_report_version_id`, `kpi_key`, `label`, `value numeric`, `unit`,
`basis` (`reported` \| `derived`), `position`.

---

## 7. Portal CMS

### `portal_pages`

`id`, `slug` unique, `title`, `page_kind`, `status`, `seo jsonb`,
`published_at`, `position`, `is_system` (home cannot be deleted), timestamps.

### `portal_sections`

`id`, `page_id`, `section_kind` (enum matching the TypeScript section registry:
`hero_3d`, `intro`, `vision_mission`, `business_overview`, `growth_story`,
`ecosystem`, `investment_info`, `milestones`, `strategic_direction`,
`financial_highlights`, `investor_updates`, `documents`, `contact_cta`,
`legal_notice`, `rich_content`, `stat_grid`, `logo_wall`, `faq`),
`position` int, `is_visible` bool, `status`, `current_version_id`,
`published_version_id`, `anchor_id`, timestamps.
Unique on `(page_id, position)` deferrable, so reordering happens in one
transaction.

### `portal_section_versions`

Append-only. `content jsonb` shaped by the section kind's Zod schema; a
`CHECK` constraint plus a validating trigger reject content whose discriminant
doesn't match the section kind. This is what makes "structured content, not
arbitrary unsafe HTML" real: there is no HTML column anywhere in the CMS.

Rich text is stored as a **restricted portable-text AST** (block/mark nodes from
a fixed allow-list), rendered by a React renderer that has no
`dangerouslySetInnerHTML` path.

### `portal_navigation`, `portal_theme`, `site_settings`

- `portal_navigation`: `id`, `location` (`header` \| `footer` \| `legal` \|
  `social`), `label`, `href`, `target`, `icon`, `position`, `parent_id`,
  `is_visible`.
- `portal_theme`: versioned theme record — logo asset, colour token overrides
  (validated against the token contract, not free-form CSS), typography choice,
  radius scale, default colour scheme, `is_active`. Exactly one active row,
  enforced by a partial unique index.
- `site_settings`: singleton key/value for operational flags (contact email,
  approval workflow toggles, notification defaults).

### `media_assets`

`id`, `bucket`, `path` unique, `original_filename`, `mime_type`, `byte_size`,
`checksum_sha256`, `width`, `height`, `duration_ms`, `visibility`,
`uploaded_by`, `finalized_at`, `alt_text`, `caption`, timestamps.
Rows with `finalized_at is null` are unreferenceable and swept by a scheduled job.

---

## 8. Messaging

### `message_threads`

`id`, `subject`, `thread_kind` (`investor_admin` \| `broadcast` \|
`portal_inquiry`), `investor_id` (nullable — set for investor threads),
`broadcast_id` (nullable), `created_by`, `last_message_at`, `is_closed`.

### `thread_participants`

`(thread_id, user_id)` unique, `role` (`investor` \| `admin`), `joined_at`,
`muted_at`. **This table is the authorisation edge for messaging RLS**: you can
read a thread iff you participate in it (or hold `messages.view` as an admin).

### `messages`

`id`, `thread_id`, `sender_id` (`set null`; null = system), `body_text`,
`body_rich jsonb` (portable text), `sent_at`, `edited_at`, `is_system`.

### `message_reads`

`(message_id, user_id)` unique, `read_at`. Unread counts are derived by query,
never stored on the client.

### `message_attachments`

`message_id`, `media_asset_id`, `position`.

### `broadcasts`

`id`, `subject`, `body_rich`, `audience` (`all_investors` \| `by_status` \|
`selected`), `audience_filter jsonb`, `created_by`, `sent_at`, `recipient_count`.
Sending a broadcast fans out into real threads and messages in a single
transaction — a broadcast is not a special read path, it is real data.

### `portal_inquiries`

Public contact / investor-interest submissions: `name`, `email`, `phone`,
`organization`, `message`, `source_page`, `ip_hash`, `status`
(`new` \| `in_progress` \| `converted` \| `closed`), `handled_by`,
`converted_investor_id`. Insert is the _only_ operation permitted to `anon`, and
it is rate-limited server-side.

---

## 9. Notifications

### `notifications`

`id`, `recipient_id` FK → `user_accounts` (`on delete cascade`), `kind`
(`notification_kind` enum), `title`, `body`, `entity_type`, `entity_id`,
`action_url`, `payload jsonb`, `read_at`, `created_at`.
Index: `(recipient_id, read_at, created_at desc)`.

### `notification_preferences`

`(user_id, kind)` unique, `in_app bool`, `email bool`.

### `notification_deliveries`

Outbox for external channels: `notification_id`, `channel` (`email` \| future),
`status` (`pending` \| `sent` \| `failed`), `attempts`, `last_error`, `sent_at`.
Written in the same transaction as the notification; a worker drains it. This
makes email delivery reliable and provider-swappable rather than a fire-and-forget
call inside a request.

---

## 10. Audit

### `audit_logs`

`id`, `actor_id` (`set null`), `actor_type`, `actor_label` (denormalised so the
record survives account deletion), `action` (e.g. `investor.approve`),
`entity_type`, `entity_id`, `summary`, `changes jsonb` (before/after diff of
changed fields only), `ip_hash`, `user_agent`, `correlation_id`, `created_at`.

**Append-only by construction:** `INSERT` policy exists; there is **no**
`UPDATE` or `DELETE` policy for any role, including admins. A rule additionally
raises on any attempted update. Retained indefinitely; partitioned by month once
volume warrants.

Indexes: `(entity_type, entity_id, created_at desc)`, `(actor_id, created_at desc)`,
`(action, created_at desc)`.

---

## 11. Indexing Strategy

Beyond primary and foreign keys:

- Every FK used in an RLS policy is indexed — an unindexed policy predicate is a
  full-scan on every query.
- `investors (status, created_at desc)` — approval queue.
- `documents (kind, status, visibility)` and `documents (published_version_id)`.
- `document_access_grants (investor_id) where revoked_at is null`.
- `messages (thread_id, sent_at desc)`.
- `notifications (recipient_id, created_at desc) where read_at is null`.
- `audit_logs` as above.
- `portal_sections (page_id, position)`.
- Trigram index on `investors.legal_name` and `user_accounts.full_name` for admin
  search.

---

## 12. Migrations

- Ordered, timestamped, **immutable once merged**. Corrections are new
  migrations, never edits to applied ones.
- Every migration is reversible or explicitly documents why it isn't.
- Destructive operations (`drop column`, `drop table`, type narrowing) require
  explicit human approval and a two-step expand/contract deployment.
- Flow: `local → staging → production`. Production migrations are never applied
  from a developer machine.
- `supabase/seed/` contains **idempotent reference data only** (permissions,
  system roles, the section registry). It contains no business data, no investors,
  and no financial figures.
- Development fixtures live in `supabase/seed/dev/`, are gated behind
  `SEED_ENV=development`, and are excluded from staging and production.

## 13. Type Generation

`pnpm db:types` runs `supabase gen types typescript` into `src/types/database.ts`.
The file carries a "GENERATED — do not edit" header and is checked in CI: if the
regenerated output differs from the committed file, the build fails. Schema drift
becomes a build error rather than a runtime surprise.
