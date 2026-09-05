# Portal Investor Audit

Scope: Ringkasan Portal, Halaman, Hero, Navigasi, CTA, FAQ, Media, Dokumen Portal, Profil Perusahaan.

## Critical
- Published pages must remain live while a new revision is edited.
- Admin must never be forced to archive a live page just to edit content.
- Public rendering must use `published_version_id`; admin editing must use `current_version_id`.
- Publishing a revision must atomically promote all visible approved current versions.
- Saving a section must be independent from publication state, subject to update permission and revision lifecycle.

## UX
- For a live page, show a clear `Buat Revisi` / `Edit Versi Baru` action.
- Distinguish `Versi Publik` and `Versi Draf` in section status labels.
- Prevent empty public sections from creating large blank areas.
- Avoid duplicated description rendering in Intro/Pengenalan.
- Keep errors close to the action that failed and expose actionable server messages.

## Module checks
- Ringkasan Portal: status, health, publication freshness, unresolved drafts.
- Halaman: create/edit/reorder/visibility/revision/publish/archive/delete.
- Hero: content + CTA + media linkage.
- Navigasi: parent-child integrity, ordering, visibility, target validation.
- CTA: label/href validation and safe rendering.
- FAQ: structured item editing, empty-item handling.
- Media: upload/link lifecycle, orphan detection.
- Dokumen Portal: document visibility/access/link integrity.
- Profil Perusahaan: editable source of truth and public renderer consistency.

## Regression gates
- Typecheck, lint, unit tests, local Supabase reset/migrations, portal publication functional tests, production build.
