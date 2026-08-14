-- =============================================================================
-- Media assets and storage buckets
--
-- Database rows hold metadata only. Bytes live in Supabase Storage, in private
-- buckets reachable exclusively through short-lived signed URLs minted by the
-- server after an authorisation check.
--
-- See docs/ARCHITECTURE.md §10 and docs/SECURITY.md §6.
-- =============================================================================

create type public.asset_visibility as enum ('public', 'internal', 'restricted');

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),

  bucket text not null,
  -- UUID-based and non-enumerable. Obscurity is not the control; the
  -- authorisation check in the signed-URL broker is.
  path text not null,

  original_filename text not null,
  mime_type text not null,
  byte_size bigint not null,
  checksum_sha256 text,

  width integer,
  height integer,
  duration_ms integer,

  visibility public.asset_visibility not null default 'internal',
  alt_text text,
  caption text,

  uploaded_by uuid references public.user_accounts (id) on delete set null,
  -- An asset with no finalisation has no verified metadata and is unreachable;
  -- a scheduled job sweeps them.
  finalized_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint media_assets_bucket_path_unique unique (bucket, path),
  constraint media_assets_byte_size_positive check (byte_size > 0),
  constraint media_assets_byte_size_capped check (byte_size <= 104857600), -- 100 MB
  constraint media_assets_mime_shape check (mime_type ~ '^[a-z]+/[a-zA-Z0-9.+-]+$'),
  -- SVG is an executable document. User-supplied SVG is rejected outright;
  -- brand SVGs are added through a separate admin-only sanitised path
  -- (docs/SECURITY.md §5).
  constraint media_assets_no_svg check (mime_type <> 'image/svg+xml'),
  constraint media_assets_dimensions_positive
    check ((width is null or width > 0) and (height is null or height > 0))
);

create index media_assets_visibility_idx on public.media_assets (visibility, created_at desc);
create index media_assets_uploaded_by_idx on public.media_assets (uploaded_by);
create index media_assets_unfinalized_idx
  on public.media_assets (created_at) where finalized_at is null;

create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function app.set_updated_at();

-- The storage location is fixed at upload. Repointing a finalised asset would
-- silently change what every document that references it serves.
create trigger media_assets_location_immutable
  before update on public.media_assets
  for each row execute function app.forbid_column_change('bucket', 'path', 'checksum_sha256');

comment on table public.media_assets is
  'Metadata for objects in Supabase Storage. Never stores file bytes.';

-- -----------------------------------------------------------------------------
-- Buckets
--
-- Only `public-media` is public, and it holds nothing but portal imagery that is
-- already published to the world. Everything else is private, and its objects
-- are unreachable without a server-minted signed URL.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'public-media',
    'public-media',
    true,
    26214400, -- 25 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4']
  ),
  (
    'investor-documents',
    'investor-documents',
    false,
    104857600, -- 100 MB
    array[
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'company-documents',
    'company-documents',
    false,
    104857600,
    array[
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'financial-documents',
    'financial-documents',
    false,
    104857600,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Storage object policies
--
-- Private buckets have NO policy for anon or authenticated. Object access is
-- brokered entirely by the server, which mints a 60-second signed URL after
-- checking the owning row. A leaked anon key therefore grants nothing.
-- -----------------------------------------------------------------------------
create policy storage_public_media_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'public-media');

-- =============================================================================
-- Privileges and RLS
-- =============================================================================

alter table public.media_assets enable row level security;
alter table public.media_assets force row level security;

revoke all on public.media_assets from anon, authenticated;
grant select on public.media_assets to anon, authenticated;

-- Public assets back published portal content, so anonymous visitors must be
-- able to resolve their metadata (alt text, dimensions).
create policy media_assets_select_public
  on public.media_assets for select
  to anon, authenticated
  using (visibility = 'public' and finalized_at is not null);

create policy media_assets_select_admin
  on public.media_assets for select
  to authenticated
  using (app.has_permission('media.view'));

-- Writes go through the upload broker, which verifies the stored object's real
-- size, MIME type and checksum before creating the row.
