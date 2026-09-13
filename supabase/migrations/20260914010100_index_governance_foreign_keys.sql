-- Keep governance foreign-key lookups policy- and join-friendly.
-- Catalogue parity treats new unindexed single-column FKs as a schema defect.

create index governance_rules_supersedes_rule_idx
  on public.governance_rules (supersedes_rule_id)
  where supersedes_rule_id is not null;

create index governance_rules_created_by_idx
  on public.governance_rules (created_by);

create index governance_rules_activated_by_idx
  on public.governance_rules (activated_by)
  where activated_by is not null;

create index governance_rules_retired_by_idx
  on public.governance_rules (retired_by)
  where retired_by is not null;

create index reserved_matters_requested_by_idx
  on public.reserved_matters (requested_by);

create index reserved_matters_submitted_by_idx
  on public.reserved_matters (submitted_by)
  where submitted_by is not null;

create index reserved_matters_finalised_by_idx
  on public.reserved_matters (finalised_by)
  where finalised_by is not null;

create index reserved_matters_executed_by_idx
  on public.reserved_matters (executed_by)
  where executed_by is not null;

create index conflict_disclosures_reviewed_by_idx
  on public.conflict_disclosures (reviewed_by)
  where reviewed_by is not null;

create index reserved_matter_decisions_admin_idx
  on public.reserved_matter_decisions (admin_id);
