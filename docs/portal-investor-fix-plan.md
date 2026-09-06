# Portal Investor Fix Plan

## Priority P0 — data safety and publication
1. Live revision lifecycle for published pages.
2. Save/revision actions must not require archiving.
3. Public portal must continue serving last published versions until replacement publication is complete.
4. Atomic promotion of approved current versions to published versions.
5. Regression coverage for published -> draft revision -> review -> approved -> published.

## Priority P1 — module functionality
- Ringkasan Portal: real publication health and unresolved-draft indicators.
- Halaman: reliable save, visibility, ordering, revision status, archive/delete safety.
- Hero: visual editor parity with public renderer.
- Navigasi: hierarchy, ordering, visibility, href/target validation.
- CTA: label + URL validation and render parity.
- FAQ: structured item editing and empty-value cleanup.
- Media: upload status, broken asset protection, orphan handling.
- Dokumen Portal: link/access/visibility integrity.
- Profil Perusahaan: one source of truth used by CMS/public portal.

## Priority P2 — UX quality
- Separate `Versi Publik` from `Versi Draf` labels.
- Per-action success/error feedback.
- Prevent public empty sections/blank blocks.
- Remove duplicate Intro/Pengenalan description rendering.
- Responsive checks for desktop/tablet/mobile.
- Dark/light visual parity.

## Release gate
- Supabase local reset and migration verification.
- Generated DB type parity.
- Typecheck.
- Lint.
- Unit/integration tests.
- Portal lifecycle functional test.
- Production build.
- Public/admin/investor smoke test.
