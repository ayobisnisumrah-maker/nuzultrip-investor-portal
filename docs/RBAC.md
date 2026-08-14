# RBAC — Roles, Permissions & Authorisation

Authorisation is **granular, data-driven, and enforced server-side**. There is no
hardcoded "if user is admin" branch anywhere that grants access.

---

## 1. Model

```
user_account ──1:1──► admin ──N:1──► role ──M:N──► permission
```

- A **permission** is an atomic capability, keyed `module.action`.
- A **role** is a named set of permissions.
- An **admin** holds exactly one role. (Multi-role was considered and rejected:
  it makes "why can this person do X?" hard to answer, and every real need so far
  is served by creating a role. Revisit only with a concrete case.)
- **Investors hold no permissions.** Their access is _ownership-scoped_, not
  role-based — a fundamentally different mechanism, and conflating the two is how
  privilege-escalation bugs happen.

### Super Admin

`super_admin` is resolved as "holds every permission" **in the authorisation
function**, not by materialising rows in `role_permissions`. Consequence: adding
a new permission to the catalogue never leaves Super Admin accidentally locked
out, and never silently grants it to any other role.

Guardrails:

- The last active `super_admin` cannot be disabled or demoted (enforced by trigger).
- A `super_admin` cannot delete their own account.
- System roles (`is_system = true`) cannot be deleted or have their `key` changed.

---

## 2. Permission Catalogue

The catalogue is defined **once**, in `src/core/rbac/permissions.ts`, and is the
source for:

1. the TypeScript `Permission` union type,
2. the seed migration that populates `permissions`,
3. the role editor UI grouping.

A drift test asserts the database catalogue matches the code catalogue exactly.

| Module               | Actions                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `dashboard`          | `view`                                                                                          |
| `investors`          | `view`, `create`, `update`, `delete`, `approve`, `reject`, `deactivate`, `reactivate`, `export` |
| `investor_documents` | `view`, `assign`, `revoke`                                                                      |
| `documents`          | `view`, `create`, `update`, `delete`, `review`, `approve`, `publish`, `archive`                 |
| `company_profile`    | `view`, `update`, `publish`                                                                     |
| `financial_reports`  | `view`, `create`, `update`, `delete`, `review`, `approve`, `publish`                            |
| `financial_periods`  | `view`, `create`, `update`, `close`                                                             |
| `portal`             | `view`, `update`, `publish`, `manage_theme`, `manage_navigation`, `manage_hero`, `manage_cta`   |
| `media`              | `view`, `upload`, `update`, `delete`                                                            |
| `messages`           | `view`, `send`, `broadcast`, `close_thread`                                                     |
| `inquiries`          | `view`, `handle`, `convert`                                                                     |
| `admins`             | `view`, `create`, `update`, `disable`, `reset_password`                                         |
| `roles`              | `view`, `create`, `update`, `delete`, `assign`                                                  |
| `permissions`        | `view`                                                                                          |
| `audit_logs`         | `view`, `export`                                                                                |
| `settings`           | `view`, `update`                                                                                |

**Deliberately absent.** Investor reports and business updates are _documents_
(`document_kind`), governed by `documents.*` rather than a parallel module.
Notifications are personal and governed by ownership, not by a permission — an
admin who needs to know what a user was told reads the audit log. Modelling
either twice would create two answers to the same question.

`is_dangerous` permissions are visually flagged in the role editor and always
audited: `investors.delete`, `investors.approve`, `investors.export`,
`documents.publish`, `company_profile.publish`, `financial_periods.close`,
`financial_reports.publish`, `portal.publish`, `messages.broadcast`,
`admins.create`, `admins.disable`, `admins.reset_password`, `roles.create`,
`roles.update`, `roles.delete`, `roles.assign`, `audit_logs.export`,
`settings.update`.

### Seeded system roles

| Role             | Permissions                                                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `super_admin`    | all (implicit)                                                                                                                                                                           |
| `admin_internal` | everything **except** `admins.create/update/disable/reset_password`, `roles.create/update/delete/assign`, `settings.update`, `investors.delete`, `investors.export`, `audit_logs.export` |

`admins.view` is deliberately _not_ withheld from `admin_internal`: seeing who
your colleagues are is benign, and it is needed in order to assign a relationship
manager.

The set is expressed as an **exclusion list** rather than an allow-list, so a
newly added permission reaches the operational role by default. An allow-list
would silently leave every new feature unusable until someone noticed.

Custom roles are created freely from the catalogue.

---

## 3. Privilege-Escalation Guards

Non-negotiable rules, enforced in the service layer **and** by database triggers:

1. **You cannot grant a permission you do not hold.** Editing a role is
   restricted to the permissions in the actor's own effective set. Only
   `super_admin` escapes this, by definition.
2. **You cannot assign a role whose permission set exceeds your own.**
3. **You cannot edit your own role's permissions** (prevents self-elevation).
4. **You cannot change your own `role_id`.**
5. **You cannot disable yourself** (prevents accidental lockout) or the last
   active Super Admin.
6. **Only a Super Admin may confer the Super Admin role.** This one needs
   stating separately, because it is not implied by rule 2. `super_admin` holds
   every permission _implicitly_ and therefore has no `role_permissions` rows at
   all — so a "does the target role hold anything I lack?" comparison finds
   nothing to object to and would happily let a lesser admin grant it. The check
   is explicit in `app.assert_role_assignable`.
7. `roles.assign` is a separate permission from `roles.update` — being able to
   _define_ a role and being able to _hand it to someone_ are different powers.

Each rule has a dedicated test in `tests/integration/rls-guards.test.ts`, run
against the database itself, because these are the failure modes that matter
most.

---

## 4. Runtime Resolution

### Principal

```ts
type Principal =
  | { kind: 'anonymous' }
  | {
      kind: 'investor'
      userId: string
      investorId: string
      status: InvestorStatus
    }
  | {
      kind: 'admin'
      userId: string
      adminId: string
      roleId: string
      roleKey: string
      permissions: ReadonlySet<Permission>
    }
```

Resolved once per request in a React `cache()`d function, so repeated
`requirePermission` calls within a render cost one query.

### JWT claims

A Supabase **custom access token hook** adds only stable identity facts:

```json
{
  "account_type": "admin",
  "admin_id": "...",
  "role_id": "...",
  "investor_id": null,
  "account_status": "active",
  "role_version": 7
}
```

Granular permissions are **not** in the token. Rationale in
[ARCHITECTURE.md §7](./ARCHITECTURE.md#7-authorisation--rbac): a revoked
permission must take effect immediately, and a token cannot be un-issued.
`role_version` increments whenever a role's permission set changes; the client
sees the mismatch and refreshes its session, so the UI stops offering actions the
server will now refuse.

### Guards

```ts
export const approveInvestor = defineAction({
  permission: 'investors.approve',
  input: approveInvestorSchema,
  audit: { action: 'investor.approve', entityType: 'investor' },
  handler: async ({ principal, input, audit }) => {
    /* ... */
  },
})
```

`defineAction` / `defineRoute`:

- resolve the principal,
- throw `UnauthenticatedError` / `ForbiddenError` **before** any I/O,
- Zod-parse input,
- run the handler,
- write the audit entry.

The `permission` field is required by the type signature. Public entry points
must declare `permission: 'public'` explicitly — you cannot forget it, only
consciously opt out, and every such opt-out is greppable.

### In the database

```sql
-- STABLE so Postgres caches it per statement; SECURITY DEFINER so it can read
-- the RBAC tables regardless of the caller's own policies.
create function app.has_permission(p_key text) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins a
    join public.roles r on r.id = a.role_id
    where a.id = (select auth.uid())
      and a.is_active
      and (r.key = 'super_admin'
        or exists (select 1 from public.role_permissions rp
                   join public.permissions p on p.id = rp.permission_id
                   where rp.role_id = r.id and p.key = p_key))
  );
$$;
```

Companion helpers: `app.is_admin()`, `app.is_investor()`,
`app.current_investor_id()`, `app.investor_has_access(document_id)`.

RLS policies call these rather than re-implementing joins, so the rule exists in
exactly one place.

---

## 5. Investor Authorisation (Ownership, not RBAC)

Investor access is decided by three questions, in order:

1. **Is the account active and the investor in an access-granting status**
   (`approved` or `active`)? If not → nothing.
2. **Is the row theirs?** `investor_id = app.current_investor_id()`.
3. **Is the shared resource visible to them?** For documents:
   `visibility = 'investors'`, or `visibility = 'restricted'` **and** a live
   `document_access_grants` row exists.

There is no code path in which an investor's own claim about their identity is
trusted. `investor_id` is never read from the request body for scoping — always
from the session.

---

## 6. Frontend Permission State

The client receives the principal's permission set purely to decide **what to
render**. Hiding a button is a courtesy, not a control. Every action behind a
hidden button is independently rejected by the server and by RLS.

`<Can permission="investors.approve">…</Can>` is sugar over that set — and its
documentation says, in the file, that it is not a security boundary.

---

## 7. Testing

| Test                | Asserts                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Catalogue drift     | DB `permissions` ≡ code catalogue                                                                  |
| Guard matrix        | For each entry point × each seeded role: allowed/denied as specified                               |
| Escalation suite    | All six guards in §3 reject                                                                        |
| RLS suite           | Every table denies an unprivileged principal, with the DB as the only enforcement layer under test |
| Super Admin lockout | Last super admin cannot be disabled/demoted                                                        |
