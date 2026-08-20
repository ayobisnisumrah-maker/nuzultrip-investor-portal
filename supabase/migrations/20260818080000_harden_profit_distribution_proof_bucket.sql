begin;

-- ============================================================
-- PROFIT DISTRIBUTION PAYMENT PROOFS
-- STORAGE BUCKET HARDENING
-- ============================================================
--
-- Bucket:
--   profit-distribution-proofs
--
-- Policy database sudah membatasi akses berdasarkan RBAC.
-- Migration ini memastikan Storage API juga mempunyai batasan
-- ukuran dan MIME type yang sama dengan constraint database.
--
-- Allowed:
--   application/pdf
--   image/jpeg
--   image/png
--   image/webp
--
-- Maximum:
--   10 MiB = 10,485,760 bytes
-- ============================================================

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
where id = 'profit-distribution-proofs';

-- Fail loudly if the expected bucket does not exist.
do $$
begin
  if not exists (
    select 1
    from storage.buckets
    where id = 'profit-distribution-proofs'
  ) then
    raise exception
      'Storage bucket profit-distribution-proofs does not exist';
  end if;
end
$$;

commit;