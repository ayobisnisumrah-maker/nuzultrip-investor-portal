begin;

alter table public.investors
  add column if not exists whatsapp_number text,
  add column if not exists bank_name text,
  add column if not exists bank_account_name text,
  add column if not exists bank_account_number text,
  add column if not exists ktp_storage_bucket text,
  add column if not exists ktp_storage_path text,
  add column if not exists ktp_original_file_name text,
  add column if not exists ktp_mime_type text,
  add column if not exists ktp_file_size_bytes bigint,
  add column if not exists ktp_uploaded_at timestamptz;

alter table public.investors
  add constraint investors_whatsapp_number_not_blank
  check (
    whatsapp_number is null
    or length(btrim(whatsapp_number)) > 0
  );

alter table public.investors
  add constraint investors_bank_name_not_blank
  check (
    bank_name is null
    or length(btrim(bank_name)) > 0
  );

alter table public.investors
  add constraint investors_bank_account_name_not_blank
  check (
    bank_account_name is null
    or length(btrim(bank_account_name)) > 0
  );

alter table public.investors
  add constraint investors_bank_account_number_not_blank
  check (
    bank_account_number is null
    or length(btrim(bank_account_number)) > 0
  );

alter table public.investors
  add constraint investors_ktp_storage_bucket_valid
  check (
    ktp_storage_bucket is null
    or ktp_storage_bucket = 'investor-documents'
  );

alter table public.investors
  add constraint investors_ktp_metadata_complete
  check (
    (
      ktp_storage_path is null
      and ktp_original_file_name is null
      and ktp_mime_type is null
      and ktp_file_size_bytes is null
      and ktp_uploaded_at is null
    )
    or
    (
      ktp_storage_path is not null
      and ktp_original_file_name is not null
      and ktp_mime_type is not null
      and ktp_file_size_bytes is not null
      and ktp_uploaded_at is not null
    )
  );

alter table public.investors
  add constraint investors_ktp_file_size_valid
  check (
    ktp_file_size_bytes is null
    or (
      ktp_file_size_bytes > 0
      and ktp_file_size_bytes <= 10485760
    )
  );

alter table public.investors
  add constraint investors_ktp_mime_type_valid
  check (
    ktp_mime_type is null
    or ktp_mime_type in (
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    )
  );

create index if not exists investors_whatsapp_idx
  on public.investors (whatsapp_number)
  where whatsapp_number is not null;

commit;