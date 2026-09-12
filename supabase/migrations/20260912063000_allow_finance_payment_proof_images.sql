-- =============================================================================
-- Payment proof media support for the canonical financial-documents bucket.
--
-- Safe/backward-compatible configuration change only. Existing objects and
-- media metadata are not modified or deleted.
-- =============================================================================

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv'
]
where id = 'financial-documents';
