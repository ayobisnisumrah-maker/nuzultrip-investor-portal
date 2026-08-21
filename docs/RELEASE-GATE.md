# Release Gate

Production domains are connected only after all release gates are green.

## Required gates

1. GitHub CI is green on `main`.
2. Database migrations and generated TypeScript types are synchronized.
3. TypeScript, ESLint, formatting, unit tests, database/RLS integration tests, and production build pass.
4. Supabase production runtime is healthy and security checks pass.
5. Cloudflare preview deployment is healthy.
6. Browser smoke tests pass for public, auth, investor, admin, protected documents, messaging, ownership, and error/forbidden states.
7. Auth/session, Supabase RLS, Storage, Realtime, and required server-side integrations are verified end-to-end.
8. Only then is the production domain connected.

## Deployment topology

```text
GitHub main
  -> CI release gate
  -> Cloudflare preview
  -> browser/runtime smoke tests
  -> Supabase production verification
  -> production domain
```

Do not bypass a failed gate by rerunning blindly. Fix the failing layer, then rerun the relevant verification.
