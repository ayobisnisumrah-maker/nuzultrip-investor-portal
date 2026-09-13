# Full Investor Lifecycle — Nuzultrip Equity

This document is the executable business contract for the end-to-end prospect, investor, ownership, finance, inheritance, exit, and buyer lifecycle. It extends `INTEGRATION_SOURCE_OF_TRUTH.md`; it does not create alternate sources of truth.

## State flow

1. **Public prospect** studies the published portal and offering material.
2. Prospect requests a proposal/information package through the public inquiry form.
3. **Admin** receives the inquiry in realtime, assigns/handles it, and sends the applicable published proposal/document package through the canonical inquiry/document workflow. Published document versions remain immutable.
4. Prospect studies the proposal and, when interested, enters the investor application/payment workflow.
5. A payment is never ownership by itself. Proof is uploaded, the payment remains pending, and Admin/Finance confirms it only through validated bank reconciliation.
6. Investor application follows the legal lifecycle `prospective → submitted → under_review → approved → active`. Ownership is allocated only through the canonical ownership workflow after the required approval/payment conditions are satisfied.
7. **Active holding** in `ownership_holdings` is the sole source of current ownership shown on Admin and Investor dashboards. Realtime events only invalidate/refetch through RLS.
8. Profit distributions are visible/payable only when backed by the canonical published financial-report snapshot and the approved ownership cutoff.
9. Investor may register an inheritance/beneficiary request against units they currently own. The inheritance lifecycle uses the canonical RPC workflow and must share unit reservation rules with sale transfers.
10. Investor may request a share sale against eligible active units. Admin approves, selects an eligible approved/active buyer, sets the agreed unit price, and completes the sale through the canonical sale RPC.
11. Sale completion atomically marks/reduces the seller lot and creates a separate active buyer acquisition lot. Historical source holdings and transfer records are never rewritten into the buyer's identity.
12. If the seller has **no active holdings remaining**, the investor lifecycle transitions `active → inactive` as part of the same logical exit operation. The user account remains active for authentication/history access.
13. A fully exited seller enters **historical read-only investor mode**:
   - may sign in;
   - may read their own historical holdings, completed transfers, historical entitled distributions/payments, permitted documents, audit-visible lifecycle history, notifications, and existing message history;
   - may not create/cancel sale requests, create/cancel inheritance requests, create new investor-admin message threads, send new messages, or perform any operation reserved for a current active owner;
   - existing investor-admin threads are closed/read-only at full exit so prior conversation remains visible.
14. The buyer remains/enters active investor access and sees the newly acquired active holding in realtime. Buyer does not inherit seller-private messages, documents, payment records, beneficiary data, or other seller-specific history.
15. Admin retains canonical audit/history visibility for both parties.

## Authorization model

`investors.status` and current active holdings have different meanings and must not be conflated:

- `active`: current investor lifecycle with active-owner operations.
- `inactive`: authenticated former/currently non-owning investor with historical read-only access.
- active-owner mutation eligibility additionally requires ownership of the referenced active holding/units.

Historical read access must therefore use a dedicated read-only principal capability rather than reusing mutation access. `app.current_investor_id()` must not be broadened blindly because existing write/RLS paths rely on its narrow semantics.

## Full-exit invariant

Completion of a **full sale** must satisfy all of the following in one transaction or equivalent atomic database workflow:

- transfer becomes `completed`;
- seller source holding becomes `transferred` (or is reduced for partial sale);
- buyer gets a new active acquisition lot;
- if no seller active holding remains, seller becomes `inactive`;
- all open investor-admin message threads for the fully exited seller become closed/read-only;
- audit/realtime/notification events are emitted from committed canonical state;
- partial sale must **not** deactivate the seller while any active holding remains.

## Re-activation invariant

An inactive former investor who later legally acquires an active holding must transition `inactive → active` through the canonical lifecycle before active-owner operations are granted. Historical seller data from prior ownership remains scoped to that same investor identity; acquisition from another seller never transfers that seller's private history.

## E2E release gate

The release test must use separate browser contexts for prospect, Admin, seller, and buyer and must prove without manual reload:

- public inquiry appears to Admin;
- proposal/document response uses a published canonical document;
- payment proof alone does not create ownership;
- bank reconciliation + investor approval/activation + ownership allocation produce the active holding;
- canonical published financial report drives the investor distribution;
- inheritance request appears to both sides;
- sale moves through request → approve → processing → completed;
- buyer holding appears and seller holding disappears from current ownership;
- full seller exit changes seller to historical read-only mode;
- seller can read old messages but cannot send/create new communication;
- buyer cannot see seller-private history;
- Admin sees the committed lifecycle/audit state;
- all relevant realtime views update without `page.reload()`.

CI, database/RLS integration tests, and Browser E2E 7/7 are mandatory before merge.