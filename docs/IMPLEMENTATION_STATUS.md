# Implementation Status

Updated during the production-readiness pass.

## Completed / Wired

- Public portal home reads published CMS content.
- Public investor-relations inquiry intake writes to `portal_inquiries` with validation and rate limiting.
- Admin Messages and Inquiries use the communication workbench and RBAC-aware actions.
- Portal page section creation/version editing is wired to `portal_sections` and `portal_section_versions`.
- GitHub Actions CI gates typecheck, lint, tests, and production build.

## In progress

- CMS publication/review lifecycle.
- Investor portal surfaces and notification workflow.
- Remaining financial, ownership, document/data-room workflows.
- Security and production hardening.

## Verification rule

A module is considered production-ready only when its UI, server authorization, database/RLS policy, validation, audit trail, error handling, and production build path are all present. A route that only renders a generic module shell is not considered complete.
