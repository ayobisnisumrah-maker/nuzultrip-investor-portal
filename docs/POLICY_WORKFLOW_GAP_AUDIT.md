# Policy-to-Workflow Gap Audit

Baseline: `main` at `3da13641887b3d2b095d8c431a994433b431502b` (merge PR #151).

This document is the implementation contract for reconciling investor policy documents D02-D09 with enforced system workflows. A policy is considered implemented only when its requirements are enforced by the database/application workflow and covered by release-gate tests; presence of a PDF in the Data Room is not sufficient.

## Status matrix

| Policy | Current system status | Evidence already present | Remaining enforcement gap | Priority |
| --- | --- | --- | --- | --- |
| D02 Risk Disclosure | GAP | Versioned immutable document engine exists | Version-bound investor acknowledgement; acknowledgement must not carry forward to a newly published version; gate relevant investor action where policy requires | High |
| D03 Corporate Governance Policy | PARTIAL | RBAC, audit log, separated operational roles, immutable publication lifecycle | Canonical governance decision domain, approval authority/quorum, decision evidence, linkage to controlled business actions | High |
| D04 Conflict of Interest Policy | GAP | Admin identity/RBAC/audit primitives exist | Disclosure, conflict status, recusal, resolution, evidence and approval eligibility enforcement | Critical |
| D05 Reserved Matters Policy | GAP | No canonical Reserved Matters workflow identified in the audited `main` baseline | Canonical matter record, submit/approve/reject/cancel/execute lifecycle, threshold/quorum, immutable decision record, conflict-aware approver eligibility, hard gate before controlled actions | Critical |
| D06 Material Event Notice | GAP | Document publication, messaging, notifications and realtime primitives exist | Canonical material-event record, classification/severity, investor audience, immutable publication snapshot, delivery/read evidence where required, link to originating canonical entity/event | High |
| D07 Exit & Transfer Policy | SUBSTANTIALLY ENFORCED | PR #151 baseline: full-sale atomic lifecycle, seller inactive/read-only after complete exit, buyer gets a new holding, seller history remains isolated | Policy reconciliation only; verify notice/evidence requirements against D07 text, do not rebuild transfer engine | Reconcile |
| D08 Data Room Index | PARTIAL | Canonical published documents and visibility/access-grant model exist | Data Room index must derive from canonical published state and access rules instead of a manually maintained parallel index | Medium |
| D09 Document Version Control Policy | ENFORCED — core lifecycle | Append-only versions; legal publication state machine; dedicated review/approve/publish/archive authority at DB trigger level; atomic publication RPC; published-version immutability including direct owner-session hardening | Add policy-specific acknowledgement/evidence consumers; verify any policy requirement for explicit supersession metadata, but do not create a second versioning engine | Maintain |

## Verified D09 controls

The existing document subsystem is the canonical version engine and must be reused by D02, D06, D08 and D09.

Verified controls:

1. `documents` is a stable container and `document_versions` is append-only in practice; published versions are immutable.
2. Publication lifecycle is `draft -> review -> approved -> published -> archived`, with legal rollback only where explicitly allowed.
3. Database workflow permissions are target-state specific:
   - `documents.review`
   - `documents.approve`
   - `documents.publish`
   - `documents.archive`
   - ordinary edits remain `documents.update`.
4. Direct API mutation cannot use `documents.update` to impersonate an approver/publisher because `app.guard_document_update()` and `app.guard_document_version_update()` validate target-state authority.
5. `app.transition_document_publication()` repeats permission and lifecycle checks inside the atomic RPC and requires the active version to be approved before publication.
6. Published-version immutability is enforced even for direct PostgreSQL owner/fixture sessions; only referential cleanup is excepted.
7. Documents are archived rather than deleted; published versions cannot be deleted.

### D09 conclusion

Do not introduce another policy-document/version table. Future policy workflows must store a foreign key to the exact `document_version_id` used for acknowledgement, decision evidence, publication or notice.

## D05 + D04 target domain

Reserved Matters and Conflict of Interest should be implemented as one governance enforcement domain, not two disconnected modules.

### Canonical entities

The implementation should provide, at minimum:

- `governance_matters`
  - stable matter identity/reference
  - matter category/code
  - title and decision summary
  - controlled action/entity reference (`subject_type`, `subject_id`, and/or explicit action key)
  - proposer
  - lifecycle status
  - required approval threshold/quorum snapshot
  - policy/evidence document-version references
  - submitted/approved/rejected/cancelled/executed timestamps
  - immutable terminal decision fields
- `governance_approvals`
  - one decision per eligible approver per matter
  - approve/reject decision
  - decision note/evidence
  - timestamp and actor
  - append-only/immutable after decision
- `governance_conflicts`
  - disclosed party/admin
  - conflict type/description
  - disclosed timestamp
  - active/resolved state
  - resolver, resolution note and timestamp
  - historical record retained after resolution

Names may change if an existing generic primitive is discovered before implementation, but the semantics above must not be weakened.

### Required lifecycle

At minimum:

`DRAFT -> PENDING_APPROVAL -> APPROVED | REJECTED | CANCELLED -> EXECUTED`

Rules:

- only a draft may be edited materially;
- submission snapshots the approval threshold and relevant policy/evidence version references;
- approvals/rejections are recorded individually and are not overwritten;
- an unresolved conflicted approver is ineligible to decide the matter;
- if `workflow.require_separate_approver` is enabled, the proposer cannot count as an approver;
- rejection is terminal unless policy explicitly requires a new superseding matter;
- execution is impossible until the matter satisfies all required approvals and has no blocking conflict;
- terminal decisions/evidence are immutable; correction creates a superseding/new matter rather than rewriting history.

### Hard enforcement boundary

A Reserved Matter is not implemented if only the UI displays an approval status. Controlled RPCs for reserved actions must call a database predicate similar to:

`app.assert_governance_authorized(action_key, subject_type, subject_id)`

and fail when there is no matching approved/executable governance matter.

The first implementation PR may introduce the canonical governance domain and predicate without wiring every business action immediately, but it must include at least one representative controlled-action integration test before D05 can be marked ENFORCED.

## D02 target enforcement

Risk acknowledgement must be tied to the exact immutable published version.

Minimum record:

- investor id
- document id
- `document_version_id`
- acknowledgement timestamp
- acknowledgement statement/version hash if needed
- actor/session provenance suitable for audit

Rules:

- only the currently published Risk Disclosure version is acknowledgeable;
- publishing a new Risk Disclosure version creates a new acknowledgement requirement;
- acknowledgement of version N must never satisfy version N+1;
- server/UI checks are insufficient where the acknowledgement is a prerequisite for a controlled investor action; that action must be DB/RPC gated.

## D06 target enforcement

Material Event Notice should use the canonical document publication engine for the immutable notice artifact but needs its own event identity.

Minimum record:

- canonical material event id/reference
- category/classification
- severity/materiality level
- source entity/type/id where applicable
- occurred/detected timestamps
- investor audience/visibility
- linked published notice `document_version_id`
- publication timestamp
- delivery/read/acknowledgement evidence only when required by policy

A manually uploaded PDF or broadcast message without a canonical material-event record does not satisfy D06.

## D08 target enforcement

The Data Room index must be a projection/query over canonical published documents plus visibility/access grants.

Do not create a manually editable list that can disagree with `documents.published_version_id` or document visibility.

At minimum the projection must expose:

- document identity/kind/title
- exact published version number/id
- publication date
- visibility
- superseded/archived state where relevant
- investor-specific access outcome for restricted documents

## Release gate for policy workflow work

Every enforcement PR must satisfy the repository's normal release gate and additionally demonstrate:

1. migration applies from a clean local database;
2. generated DB types remain synchronized;
3. RLS denies unauthorized direct table/API mutation;
4. SECURITY DEFINER RPC execute grants are explicitly closed to unintended roles;
5. state-machine invalid transitions fail at DB level;
6. terminal/immutable records cannot be rewritten or deleted;
7. conflict/recusal bypass attempts fail at DB level;
8. at least one integration test proves direct SQL/API bypass is denied;
9. relevant Browser E2E proves the user-visible workflow and realtime state propagation;
10. catalogue parity, typecheck, lint, unit/integration tests and production build remain green.

## Implementation order

1. D05 + D04 canonical governance foundation and DB/RLS tests.
2. Wire Reserved Matters hard-gates into the first controlled business actions identified by policy text.
3. D06 Material Event canonical record + document publication linkage.
4. D02 version-bound Risk Disclosure acknowledgement + prerequisite gates.
5. D03 governance-policy reconciliation across roles/authority/quorum.
6. D08 canonical Data Room projection.
7. Final D07/D09 reconciliation and full D02-D09 acceptance suite.
