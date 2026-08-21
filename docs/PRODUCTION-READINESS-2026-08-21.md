# Production Readiness — 2026-08-21

This checkpoint records the minimum release gates for the first real investor-portal rollout:

- TypeScript must pass.
- ESLint must pass.
- Unit tests must pass.
- Production build must pass.
- Authentication, RBAC, RLS, and audit boundaries must remain enforced.
- No production secrets may be committed.
- Public inquiry handling must be rate-limited and write-only for anonymous callers.
- Investor data must remain scoped to the authenticated investor principal.

Deployment domains and subdomains remain intentionally deferred until the application and database release gates are green.
