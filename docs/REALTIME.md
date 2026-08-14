# Realtime Architecture

**Requirement:** a change made in one browser appears in another browser —
different browser engines, different machines — without a manual refresh, with
the database as the source of truth.

---

## 1. Chosen Mechanism

**Supabase Realtime, "Broadcast from Database".**

Postgres triggers call `realtime.send(payload, event, topic, private)`. Clients
subscribe to a **named topic** over a WebSocket. Authorisation happens once, at
subscribe time, via RLS policies on the `realtime.messages` table.

```
   Admin browser                Postgres                    Investor browser
        │                          │                               │
        │ publish portal section   │                               │
        ├─────────────────────────►│                               │
        │                     UPDATE portal_sections               │
        │                          │                               │
        │                     AFTER trigger                        │
        │                     realtime.send(                       │
        │                       topic 'portal:public',             │
        │                       event 'portal.published')          │
        │                          │                               │
        │                          ├──── WebSocket (authorised ────►│
        │                          │      by RLS on               │
        │                          │      realtime.messages)      │
        │                          │                               │
        │                          │      invalidate query keys ───┤
        │                          │◄──── refetch via normal ──────┤
        │                          │      RLS-guarded path         │
```

### Why not "Postgres Changes"?

Postgres Changes is simpler to wire up, and it was seriously considered.
It was rejected as the primary mechanism because:

|                | Postgres Changes                                                    | Broadcast from Database                               |
| -------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| RLS evaluation | per subscribed client, **per changed row**                          | once, at subscribe time                               |
| Scaling        | degrades with concurrent subscribers                                | one message per topic regardless of subscriber count  |
| Payload        | raw row shape — leaks column names and any column the policy allows | curated domain event, only what we choose             |
| Granularity    | table + optional column filter                                      | arbitrary topics, including cross-table domain events |
| Coupling       | client depends on table structure                                   | client depends on an event contract                   |

The decisive point is the second row. An IR portal with a few hundred concurrent
investors would put avoidable per-row policy evaluation on the database for every
CMS edit. Broadcast is both cheaper and better-encapsulated.

### What is explicitly forbidden

Per the brief, and as a matter of correctness:

- ❌ `localStorage` as a database or as a sync channel
- ❌ `BroadcastChannel` as the synchronisation mechanism
- ❌ Polling as the primary realtime mechanism
- ❌ Any browser-only state synchronisation

**Permitted narrow exceptions**, documented at their call sites:

- A **10-minute low-frequency reconciliation refetch** exists as a _safety net_
  for a silently dead socket. It is not the mechanism; if it is ever the thing
  that delivers an update to a user, that is a bug we want the metric to show.
- `BroadcastChannel` may deduplicate work **between tabs of the same browser**
  after a real server event arrives. It never originates state.

---

## 2. Topic Design

Topics are `private` (RLS-authorised). Public portal content still uses a private
topic — subscribing is open to `anon`, but explicitly, by policy, rather than by
an unauthenticated channel that could later be widened by accident.

| Topic                    | Who may subscribe                           | Events                                                                                                                                             |
| ------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `portal:public`          | everyone incl. `anon`                       | `portal.page_published`, `portal.section_published`, `portal.theme_updated`, `portal.navigation_updated`                                           |
| `investor:{investor_id}` | that investor; admins with `investors.view` | `investor.status_changed`, `investor.document_shared`, `investor.document_revoked`, `message.received`, `notification.created`, `report.published` |
| `admin:global`           | any active admin                            | `investor.applied`, `investor.status_changed`, `inquiry.received`, `message.received`, `document.state_changed`, `financial_report.published`      |
| `admin:role:{role_id}`   | admins holding that role                    | role-scoped operational events                                                                                                                     |
| `user:{user_id}`         | that user only                              | `session.revoked`, `account.disabled`, `role.permissions_changed`                                                                                  |

Topic names are produced by typed helpers (`topics.investor(id)`), never by
string concatenation at call sites — a typo would otherwise be a silent
subscription to nothing.

---

## 3. Authorisation

Subscription is gated by RLS on `realtime.messages`:

```sql
create policy realtime_portal_public on realtime.messages
  for select to anon, authenticated
  using ( realtime.topic() = 'portal:public' );

create policy realtime_investor_own on realtime.messages
  for select to authenticated
  using (
    realtime.topic() = 'investor:' || coalesce(app.current_investor_id()::text, '-')
    or (app.has_permission('investors.view')
        and realtime.topic() like 'investor:%')
  );

create policy realtime_admin_global on realtime.messages
  for select to authenticated
  using ( realtime.topic() = 'admin:global' and app.is_active_admin() );

create policy realtime_user_own on realtime.messages
  for select to authenticated
  using ( realtime.topic() = 'user:' || (select auth.uid())::text );
```

There is **no** policy permitting a client to `insert` into `realtime.messages`.
Clients cannot broadcast. Every event originates from a database trigger, so a
malicious client cannot forge `investor.status_changed`.

---

## 4. Event Contract

```ts
type RealtimeEvent<K extends EventKind = EventKind> = {
  kind: K // 'investor.status_changed'
  entityType: string // 'investor'
  entityId: string // uuid
  occurredAt: string // ISO-8601
  actorType: 'admin' | 'investor' | 'system'
  version: 1
  // NO business payload beyond identifiers.
}
```

**Events carry invalidation signals, not state.** This is the single most
important decision in this document.

Consequences:

- A client can never render data that arrived over the socket, so the socket can
  never become an authorisation bypass.
- Payloads stay tiny, so fan-out is cheap.
- The refetch goes through the normal RLS-guarded query path, so what a user sees
  is exactly what they are permitted to see, always.
- A stale or replayed event costs one redundant refetch and nothing else.

Every event is validated with Zod on arrival. An unparseable event is dropped and
counted, never applied.

---

## 5. Emission

Triggers are thin and uniform:

```sql
create function app.emit_event(
  p_topic text, p_kind text, p_entity_type text,
  p_entity_id uuid, p_actor_type text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'kind', p_kind, 'entityType', p_entity_type, 'entityId', p_entity_id,
      'occurredAt', to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'actorType', p_actor_type, 'version', 1),
    p_kind, p_topic, true);
end; $$;
```

Rules:

- Emission happens in an `AFTER` trigger, inside the transaction. If the
  transaction rolls back, no event is sent — no phantom notifications.
- A trigger never emits to a topic the changed row doesn't belong to.
- Emission failures must not fail the business transaction: `realtime.send`
  errors are trapped and logged to a `realtime_emit_failures` table. Losing a
  notification is recoverable; losing an investor approval is not.

---

## 6. Client Integration

```ts
useRealtimeTopic(topics.investor(investorId), {
  'message.received': () => qc.invalidateQueries({ queryKey: ['messages'] }),
  'investor.status_changed': () => {
    qc.invalidateQueries({ queryKey: ['investor'] })
    router.refresh()
  },
  'notification.created': () =>
    qc.invalidateQueries({ queryKey: ['notifications'] }),
})
```

- One shared Supabase Realtime client per browser tab; the hook multiplexes
  channels over it.
- `router.refresh()` is used when the affected data lives in a Server Component
  (the RSC payload is refetched server-side, with server-side authorisation).
- TanStack Query invalidation is used for client-fetched data.
- Both are safe: neither trusts the event's contents.

### Public portal specifics

The portal is served from the Next.js full-route cache for speed. On publish, the
server action calls `revalidateTag('portal:published')` **and** the trigger emits
`portal.page_published`. Open browsers receive the event and call
`router.refresh()`, which now hits a revalidated cache. Both halves are required:
the tag makes the _next_ visitor correct, the event makes the _current_ visitor
correct.

### Connection state

A `RealtimeStatus` context exposes `connected | connecting | degraded | offline`,
surfaced as an unobtrusive indicator in the admin and investor shells. Entering
`degraded` (socket lost) enables a 30-second reconciliation refetch until the
socket recovers, then disables it again. The user always knows whether they are
looking at live data.

Reconnection uses exponential backoff with jitter, capped at 30s, and refetches
everything on resume — a socket that was down may have missed events, so
recovery is "assume stale" rather than "assume caught up".

---

## 7. Cross-Browser Considerations

WebSockets are universally supported in Chrome, Edge, Firefox and Safari
(desktop and iOS). No browser-specific API is used. Specific care:

- **Safari / iOS**: aggressively suspends sockets on background. We listen for
  `visibilitychange` and `pageshow` (including bfcache restore) and force a
  reconnect + full refetch on resume.
- **Firefox**: stricter about mixed content — the WS URL is always derived from
  the Supabase URL, never hand-built.
- No `SharedWorker` (Safari support is uneven); one connection per tab is
  acceptable at this scale.

---

## 8. Testing

The acceptance criterion is tested literally, in Playwright, on Chromium,
Firefox and WebKit:

1. **Portal sync** — Context A (admin) publishes a section; Context B (anonymous
   portal, already loaded) shows the new content with **no navigation and no
   reload**.
2. **Approval sync** — Context A approves an investor; Context B (that investor,
   signed in) transitions out of the pending state automatically.
3. **Message sync** — Context A sends a message; Context B's unread badge and
   thread update automatically.
4. **Isolation under realtime** — Context C (a different investor) receives
   nothing from test 2 or 3. Asserted by capturing all socket frames in that
   context and requiring zero events referencing the other investor's id.

Test 4 matters as much as the first three: realtime must not become the leak.
