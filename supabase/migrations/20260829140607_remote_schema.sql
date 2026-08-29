set local check_function_bodies = off;

alter default privileges for role "postgres" in schema "app" grant execute on FUNCTIONS to public;

alter default privileges for role "postgres" in schema "app" revoke all on FUNCTIONS from "authenticated";

alter default privileges for role "postgres" in schema "app" revoke all on FUNCTIONS from "service_role";

revoke all on function "app"."admin_role_key"() from "service_role";

revoke all on function "app"."assert_account_type"() from "service_role";

revoke all on function "app"."assert_role_assignable"(uuid) from "service_role";

revoke all on function "app"."assert_section_content_kind"() from "service_role";

revoke all on function "app"."assign_company_profile_version_number"() from "service_role";

revoke all on function "app"."assign_document_version_number"() from "service_role";

revoke all on function "app"."assign_financial_version_number"() from "service_role";

revoke all on function "app"."assign_investor_reference"() from "service_role";

revoke all on function "app"."assign_section_version_number"() from "service_role";

revoke all on function "app"."bump_role_version"() from "service_role";

revoke all on function "app"."create_document_with_draft"(text, text, public.document_kind, text, public.visibility, uuid) from "authenticated";

revoke all on function "app"."create_investor_message_thread"(uuid, text, text) from "authenticated";

revoke all on function "app"."create_investor_message_thread"(uuid, text, text) from "service_role";

revoke all on function "app"."current_actor_type"() from "service_role";

revoke all on function "app"."current_investor_id"() from "service_role";

revoke all on function "app"."current_user_id"() from "service_role";

revoke all on function "app"."document_workflow_permission_allowed"(public.publication_status) from "service_role";

revoke all on function "app"."effective_permissions"(uuid) from "service_role";

revoke all on function "app"."emit_document_events"() from "service_role";

revoke all on function "app"."emit_document_grant_events"() from "service_role";

revoke all on function "app"."emit_event"(text, text, text, uuid, text) from "service_role";

revoke all on function "app"."emit_financial_events"() from "service_role";

revoke all on function "app"."emit_inquiry_events"() from "service_role";

revoke all on function "app"."emit_investor_events"() from "service_role";

revoke all on function "app"."emit_message_events"() from "service_role";

revoke all on function "app"."emit_notification_events"() from "service_role";

revoke all on function "app"."emit_portal_navigation_events"() from "service_role";

revoke all on function "app"."emit_portal_page_events"() from "service_role";

revoke all on function "app"."emit_portal_section_events"() from "service_role";

revoke all on function "app"."emit_portal_theme_events"() from "service_role";

revoke all on function "app"."forbid_column_change"() from "authenticated";

revoke all on function "app"."forbid_column_change"() from "service_role";

revoke all on function "app"."forbid_mutation"() from "authenticated";

revoke all on function "app"."forbid_mutation"() from "service_role";

revoke all on function "app"."forbid_published_version_delete"() from "authenticated";

revoke all on function "app"."forbid_published_version_delete"() from "service_role";

revoke all on function "app"."guard_admin_change"() from "service_role";

revoke all on function "app"."guard_admin_delete"() from "service_role";

revoke all on function "app"."guard_company_profile_version_update"() from "authenticated";

revoke all on function "app"."guard_company_profile_version_update"() from "service_role";

revoke all on function "app"."guard_document_update"() from "authenticated";

revoke all on function "app"."guard_document_update"() from "service_role";

revoke all on function "app"."guard_document_version_update"() from "authenticated";

revoke all on function "app"."guard_document_version_update"() from "service_role";

revoke all on function "app"."guard_financial_line_item"() from "service_role";

revoke all on function "app"."guard_financial_period_update"() from "service_role";

revoke all on function "app"."guard_financial_version_update"() from "authenticated";

revoke all on function "app"."guard_financial_version_update"() from "service_role";

revoke all on function "app"."guard_portal_page_delete"() from "authenticated";

revoke all on function "app"."guard_portal_page_delete"() from "service_role";

revoke all on function "app"."guard_role_delete"() from "service_role";

revoke all on function "app"."guard_role_permission_change"() from "service_role";

revoke all on function "app"."guard_section_version_update"() from "authenticated";

revoke all on function "app"."guard_section_version_update"() from "service_role";

revoke all on function "app"."has_permission"(text) from "service_role";

revoke all on function "app"."investor_granted_document"(uuid) from "service_role";

revoke all on function "app"."investor_status_record"() from "service_role";

revoke all on function "app"."investor_status_validate"() from "authenticated";

revoke all on function "app"."investor_status_validate"() from "service_role";

revoke all on function "app"."investor_transition_allowed"(public.investor_status, public.investor_status) from "service_role";

revoke all on function "app"."is_admin"() from "service_role";

revoke all on function "app"."is_investor"() from "service_role";

revoke all on function "app"."participates_in_thread"(uuid) from "service_role";

revoke all on function "app"."publication_transition_allowed"(public.publication_status, public.publication_status) from "service_role";

revoke all on function "app"."published_change_is_referential"(jsonb, jsonb) from "authenticated";

revoke all on function "app"."published_change_is_referential"(jsonb, jsonb) from "service_role";

revoke all on function "app"."set_updated_at"() from "service_role";

revoke all on function "app"."topic_admin"() from "service_role";

revoke all on function "app"."topic_all_investors"() from "service_role";

revoke all on function "app"."topic_investor"(uuid) from "service_role";

revoke all on function "app"."topic_portal"() from "service_role";

revoke all on function "app"."topic_user"(uuid) from "service_role";

revoke all on function "app"."touch_thread_on_message"() from "service_role";

revoke all on function "app"."transition_portal_page"(uuid, public.publication_status) from "service_role";

alter table "public"."investor_status_history"
  drop constraint "investor_status_history_investor_id_fkey";

create table "public"."contact_messages" (
  "id"         uuid                     not null default gen_random_uuid(),
  "full_name"  character varying(200),
  "email"      character varying(200),
  "phone"      character varying(50),
  "subject"    character varying(255),
  "message"    text,
  "status"     character varying(30)    default 'new'::character varying,
  "created_at" timestamp with time zone default now(),
  constraint "contact_messages_pkey" primary key (id)
);

alter table "public"."contact_messages"
  enable row level security;

alter table "public"."contact_messages"
  replica identity full;

create table "public"."data_room_access_logs" (
  "id"          uuid                     not null default gen_random_uuid(),
  "investor_id" uuid,
  "token_id"    uuid,
  "document_id" uuid,
  "action"      character varying(50)    not null,
  "ip_address"  inet,
  "user_agent"  text,
  "created_at"  timestamp with time zone not null default now(),
  constraint "data_room_access_logs_pkey" primary key (id)
);

alter table "public"."data_room_access_logs"
  enable row level security;

create table "public"."data_room_categories" (
  "id"          uuid                     not null default gen_random_uuid(),
  "name"        character varying(200),
  "description" text,
  "created_at"  timestamp with time zone default now(),
  constraint "data_room_categories_pkey" primary key (id)
);

alter table "public"."data_room_categories"
  enable row level security;

create table "public"."data_room_documents" (
  "id"              uuid                     not null default gen_random_uuid(),
  "category_id"     uuid,
  "title"           character varying(255),
  "description"     text,
  "file_name"       character varying(255),
  "file_url"        text,
  "file_size"       bigint,
  "mime_type"       character varying(100),
  "visibility"      character varying(30)    default 'private'::character varying,
  "is_active"       boolean                  default true,
  "created_at"      timestamp with time zone default now(),
  "content"         jsonb                    not null default '{"sections": []}'::jsonb,
  "pages"           integer                  not null default 0,
  "cover_image_url" text,
  "embed_url"       text,
  "sort_order"      integer                  not null default 0,
  "updated_at"      timestamp with time zone not null default now(),
  constraint "data_room_documents_pkey" primary key (id)
);

alter table "public"."data_room_documents"
  enable row level security;

create table "public"."investor_requests" (
  "id"               text                     not null,
  "submitted_at"     timestamp with time zone not null default now(),
  "name"             text                     not null,
  "company"          text                     not null,
  "email"            text                     not null,
  "phone"            text                     not null,
  "country"          text                     not null,
  "amount"           text                     not null,
  "nda_signed"       boolean                  not null default false,
  "status"           text                     not null default 'pending'::text,
  "token"            text,
  "token_expires_at" timestamp with time zone,
  "access_link"      text,
  "approved_at"      timestamp with time zone,
  "approved_by"      text,
  "approval_note"    text,
  "rejected_at"      timestamp with time zone,
  "rejection_reason" text,
  "updated_at"       timestamp with time zone not null default now(),
  constraint "investor_requests_pkey" primary key (id),
  constraint "investor_requests_status_check" check ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

alter table "public"."investor_requests"
  enable row level security;

alter table "public"."investor_requests"
  replica identity full;

create table "public"."investor_tokens" (
  "id"             uuid                     not null default gen_random_uuid(),
  "investor_id"    uuid                     not null,
  "token"          character varying(100)   not null,
  "period"         character varying(20),
  "expires_at"     timestamp with time zone,
  "is_active"      boolean                  default true,
  "created_at"     timestamp with time zone default now(),
  "investor_name"  text,
  "investor_email" text,
  constraint "investor_tokens_pkey" primary key (id),
  constraint "investor_tokens_token_key" unique (token)
);

alter table "public"."investor_tokens"
  enable row level security;

create table "public"."kv_store_b620c355" (
  "key"   text  not null,
  "value" jsonb not null,
  constraint "kv_store_b620c355_pkey" primary key (key)
);

alter table "public"."kv_store_b620c355"
  enable row level security;

create table "public"."legacy_audit_logs" (
  "id"          uuid                     not null default gen_random_uuid(),
  "module"      character varying(100),
  "action"      character varying(100),
  "user_name"   character varying(200),
  "description" text,
  "ip_address"  character varying(100),
  "created_at"  timestamp with time zone default now(),
  constraint "legacy_audit_logs_pkey" primary key (id)
);

alter table "public"."legacy_audit_logs"
  enable row level security;

create table "public"."legacy_investor_status_history" (
  "id"          uuid                     not null default gen_random_uuid(),
  "investor_id" uuid                     not null,
  "from_status" text,
  "to_status"   text                     not null,
  "reason"      text,
  "note"        text,
  "actor_id"    text,
  "actor_type"  text                     not null default 'admin'::text,
  "created_at"  timestamp with time zone not null default now(),
  constraint "legacy_investor_status_history_pkey" primary key (id)
);

alter table "public"."legacy_investor_status_history"
  enable row level security;

create table "public"."legacy_investors" (
  "id"                  uuid                     not null default gen_random_uuid(),
  "full_name"           character varying(200)   not null,
  "email"               character varying(200)   not null,
  "phone"               character varying(50),
  "company"             character varying(200),
  "city"                character varying(100),
  "country"             character varying(100),
  "investment_interest" text,
  "status"              character varying(30)    default 'pending'::character varying,
  "notes"               text,
  "created_at"          timestamp with time zone default now(),
  "updated_at"          timestamp with time zone default now(),
  "verified_at"         timestamp with time zone,
  "verified_by"         text,
  "rejection_reason"    text,
  constraint "legacy_investors_email_key" unique (email),
  constraint "legacy_investors_pkey" primary key (id)
);

alter table "public"."legacy_investors"
  enable row level security;

alter table "public"."legacy_investors"
  replica identity full;

create table "public"."meeting_bookings" (
  "id"                text                     not null,
  "submitted_at"      timestamp with time zone not null default now(),
  "name"              text                     not null,
  "company"           text                     not null,
  "email"             text                     not null,
  "phone"             text                     not null,
  "type"              text                     not null,
  "date_label"        text                     not null,
  "time_label"        text                     not null,
  "confirmation_code" text                     not null,
  "message"           text                     not null default ''::text,
  "status"            text                     not null default 'scheduled'::text,
  "updated_at"        timestamp with time zone not null default now(),
  constraint "meeting_bookings_pkey" primary key (id),
  constraint "meeting_bookings_status_check" check ((status = ANY (ARRAY['scheduled'::text, 'done'::text, 'cancelled'::text])))
);

alter table "public"."meeting_bookings"
  enable row level security;

alter table "public"."meeting_bookings"
  replica identity full;

create table "public"."meetings" (
  "id"           uuid                     not null default gen_random_uuid(),
  "investor_id"  uuid,
  "meeting_date" timestamp with time zone,
  "meeting_type" character varying(50),
  "location"     character varying(255),
  "meeting_link" text,
  "status"       character varying(50),
  "notes"        text,
  "created_at"   timestamp with time zone default now(),
  constraint "meetings_pkey" primary key (id)
);

alter table "public"."meetings"
  enable row level security;

create table "public"."portal_content" (
  "id"         uuid                     not null default gen_random_uuid(),
  "page"       character varying(100)   not null,
  "section"    character varying(100)   not null,
  "title"      character varying(255),
  "slug"       character varying(255),
  "content"    jsonb                    not null default '{}'::jsonb,
  "status"     character varying(30)    default 'draft'::character varying,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  constraint "portal_content_pkey" primary key (id),
  constraint "portal_unique" unique (page, section)
);

alter table "public"."portal_content"
  enable row level security;

alter table "public"."portal_content"
  replica identity full;

create table "public"."settings" (
  "key"        character varying(150)   not null,
  "value"      jsonb,
  "updated_at" timestamp with time zone default now(),
  constraint "settings_pkey" primary key (key)
);

alter table "public"."settings"
  enable row level security;

create table "public"."user_profiles" (
  "id"         uuid                     not null,
  "full_name"  text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  constraint "user_profiles_pkey" primary key (id)
);

alter table "public"."user_profiles"
  enable row level security;

create table "public"."user_roles" (
  "user_id"    uuid                     not null,
  "role"       text                     not null,
  "is_active"  boolean                  not null default true,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  constraint "user_roles_pkey" primary key (user_id)
);

alter table "public"."user_roles"
  enable row level security;

create type "public"."app_role" as enum (
  'admin',
  'ir'
);

alter table "public"."user_profiles"
  add column "role" public.app_role not null default 'ir'::public.app_role;

create type "public"."user_status" as enum (
  'active',
  'inactive'
);

alter table "public"."user_profiles"
  add column "status" public.user_status not null default 'active'::public.user_status;

create or replace function app.create_investor_message_thread (
  p_investor_id uuid,
  p_subject     text,
  p_body        text
)
  returns uuid
  language plpgsql
  security definer
  set search_path to ''
  AS $function$
declare
  v_thread_id uuid;
  v_admin_user_id uuid;
begin
  if not app.is_admin() or not app.has_permission('messages.send') then
    raise exception 'forbidden';
  end if;

  if p_subject is null or length(btrim(p_subject)) = 0 or length(btrim(p_subject)) > 200 then
    raise exception 'invalid subject';
  end if;

  if p_body is null or length(btrim(p_body)) = 0 or length(p_body) > 20000 then
    raise exception 'invalid body';
  end if;

  if not exists (
    select 1 from public.investors i
    where i.id = p_investor_id
      and i.status in ('approved'::public.investor_status, 'active'::public.investor_status)
  ) then
    raise exception 'investor not eligible';
  end if;

  v_admin_user_id := app.current_user_id();

  insert into public.message_threads (
    subject, thread_kind, investor_id, created_by, last_message_at, is_closed
  ) values (
    btrim(p_subject), 'investor_admin'::public.thread_kind, p_investor_id,
    v_admin_user_id, now(), false
  ) returning id into v_thread_id;

  insert into public.thread_participants (thread_id, user_id, role)
  values
    (v_thread_id, p_investor_id, 'investor'::public.participant_role),
    (v_thread_id, v_admin_user_id, 'admin'::public.participant_role);

  insert into public.messages (
    thread_id, sender_id, body_text, body_rich, is_system
  ) values (
    v_thread_id, v_admin_user_id, btrim(p_body),
    jsonb_build_object(
      'type', 'doc',
      'content', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(
            jsonb_build_object('type', 'text', 'text', btrim(p_body))
          )
        )
      )
    ), false
  );

  return v_thread_id;
end;
$function$;

create or replace function app.set_updated_at()
  returns trigger
  language plpgsql
  set search_path to ''
  AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create or replace function app.transition_portal_page (
  p_page_id   uuid,
  p_to_status public.publication_status
)
  returns table (
    page_id         uuid,
    page_title      text,
    previous_status public.publication_status,
    status          public.publication_status
  )
  language plpgsql
  security definer
  set search_path to ''
  AS $function$
declare
  v_page public.portal_pages%rowtype;
  v_actor uuid := app.current_user_id();
  v_permission text;
  v_invalid_count integer;
begin
  v_permission := case p_to_status
    when 'draft' then 'portal.update'
    when 'review' then 'portal.publish'
    when 'approved' then 'portal.publish'
    when 'published' then 'portal.publish'
    when 'archived' then 'portal.publish'
    else null
  end;

  if v_permission is null or not app.has_permission(v_permission) then
    raise exception 'Insufficient permission for portal transition to %.', p_to_status
      using errcode = '42501';
  end if;

  select * into v_page from public.portal_pages where id = p_page_id for update;
  if not found then
    raise exception 'Portal page not found.' using errcode = 'P0002';
  end if;

  if p_to_status = v_page.status then
    return query select v_page.id, v_page.title, v_page.status, v_page.status;
    return;
  end if;

  if not (
    (v_page.status = 'draft' and p_to_status = 'review') or
    (v_page.status = 'review' and p_to_status in ('approved', 'draft')) or
    (v_page.status = 'approved' and p_to_status in ('published', 'draft')) or
    (v_page.status = 'published' and p_to_status = 'archived')
  ) then
    raise exception 'Invalid portal publication transition: % -> %.', v_page.status, p_to_status
      using errcode = '23514';
  end if;

  if p_to_status = 'review' then
    select count(*) into v_invalid_count
    from public.portal_sections s
    where s.page_id = v_page.id and s.is_visible and s.current_version_id is null;
    if v_invalid_count > 0 then
      raise exception 'Every visible portal section must have a current version before review.' using errcode = '23514';
    end if;
    update public.portal_section_versions v
    set status = 'review'
    from public.portal_sections s
    where s.id = v.section_id and s.page_id = v_page.id and s.is_visible
      and s.current_version_id = v.id and v.status = 'draft';

  elsif p_to_status = 'approved' then
    select count(*) into v_invalid_count
    from public.portal_sections s
    join public.portal_section_versions v on v.id = s.current_version_id
    where s.page_id = v_page.id and s.is_visible and v.status <> 'review';
    if v_invalid_count > 0 then
      raise exception 'Every visible current portal section must be in review before approval.' using errcode = '23514';
    end if;
    update public.portal_section_versions v
    set status = 'approved', approved_by = v_actor, approved_at = now()
    from public.portal_sections s
    where s.id = v.section_id and s.page_id = v_page.id and s.is_visible and s.current_version_id = v.id;

  elsif p_to_status = 'draft' then
    update public.portal_section_versions v
    set status = 'draft', approved_by = null, approved_at = null
    from public.portal_sections s
    where s.id = v.section_id and s.page_id = v_page.id and s.is_visible
      and s.current_version_id = v.id and v.status in ('review', 'approved');

  elsif p_to_status = 'published' then
    select count(*) into v_invalid_count
    from public.portal_sections s
    join public.portal_section_versions v on v.id = s.current_version_id
    where s.page_id = v_page.id and s.is_visible and v.status <> 'approved';
    if v_invalid_count > 0 then
      raise exception 'Every visible current portal section must be approved before publication.' using errcode = '23514';
    end if;
    update public.portal_section_versions v
    set status = 'published', published_at = coalesce(v.published_at, now())
    from public.portal_sections s
    where s.id = v.section_id and s.page_id = v_page.id and s.is_visible and s.current_version_id = v.id;
    update public.portal_sections s
    set status = 'published', published_version_id = s.current_version_id
    where s.page_id = v_page.id and s.is_visible;

  elsif p_to_status = 'archived' then
    update public.portal_sections s
    set status = 'archived'
    where s.page_id = v_page.id and s.status = 'published';
  end if;

  update public.portal_pages
  set status = p_to_status,
      published_at = case when p_to_status = 'published' then coalesce(published_at, now()) else published_at end
  where id = v_page.id;

  return query select v_page.id, v_page.title, v_page.status, p_to_status;
end;
$function$;

create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.touch_profit_distribution_payment_proof()
  returns trigger
  language plpgsql
  set search_path to 'pg_catalog', 'public'
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

alter table "public"."data_room_documents"
  add constraint "data_room_documents_category_id_fkey" foreign key (category_id) references public.data_room_categories(id);

alter table "public"."data_room_access_logs"
  add constraint "data_room_access_logs_document_id_fkey" foreign key (document_id) references public.data_room_documents(id) on delete set null;

alter table "public"."investor_status_history"
  add constraint "investor_status_history_investor_id_fkey1" foreign key (investor_id) references public.investors(id) on delete cascade;

alter table "public"."data_room_access_logs"
  add constraint "data_room_access_logs_token_id_fkey" foreign key (token_id) references public.investor_tokens(id) on delete set null;

alter table "public"."data_room_access_logs"
  add constraint "data_room_access_logs_investor_id_fkey" foreign key (investor_id) references public.legacy_investors(id) on delete set null;

alter table "public"."investor_tokens"
  add constraint "investor_tokens_investor_id_fkey" foreign key (investor_id) references public.legacy_investors(id) on delete cascade;

alter table "public"."legacy_investor_status_history"
  add constraint "investor_status_history_investor_id_fkey" foreign key (investor_id) references public.legacy_investors(id) on delete cascade;

alter table "public"."meetings"
  add constraint "meetings_investor_id_fkey" foreign key (investor_id) references public.legacy_investors(id);

alter table "public"."user_profiles"
  add constraint "user_profiles_id_fkey" foreign key (id) references auth.users(id) on delete cascade;

alter table "public"."user_roles"
  add constraint "user_roles_user_id_fkey" foreign key (user_id) references auth.users(id) on delete cascade;

create index idx_data_room_access_logs_created on public.data_room_access_logs using btree (created_at desc);

create index idx_data_room_access_logs_document on public.data_room_access_logs using btree (document_id);

create index idx_data_room_access_logs_investor on public.data_room_access_logs using btree (investor_id);

create index idx_data_room_access_logs_token on public.data_room_access_logs using btree (token_id);

create index idx_data_room_documents_active_visibility on public.data_room_documents using btree (is_active, visibility);

create index idx_data_room_documents_sort_order on public.data_room_documents using btree (sort_order);

create index idx_portal_page on public.portal_content using btree (page);

create index idx_portal_section on public.portal_content using btree (section);

create index investor_tokens_expires_at_idx on public.investor_tokens using btree (expires_at);

create index investor_tokens_investor_id_idx on public.investor_tokens using btree (investor_id);

create index investor_tokens_period_idx on public.investor_tokens using btree (period);

create index investor_tokens_token_idx on public.investor_tokens using btree (token);

create index kv_store_b620c355_key_idx on public.kv_store_b620c355 using btree (key text_pattern_ops);

create index legacy_investor_status_history_created_idx on public.legacy_investor_status_history using btree (created_at desc);

create index legacy_investor_status_history_investor_idx on public.legacy_investor_status_history using btree (investor_id);

create index legacy_investors_status_idx on public.legacy_investors using btree (status);

create index legacy_investors_verified_at_idx on public.legacy_investors using btree (verified_at);

create unique index portal_content_slug_unique on public.portal_content using btree (slug);

create index user_profiles_role_idx on public.user_profiles using btree (role);

create index user_profiles_status_idx on public.user_profiles using btree (status);

create trigger contact_messages_updated_at
  before update on public.contact_messages
  for each row
  execute function public.set_updated_at();

create trigger investor_requests_updated_at
  before update on public.investor_requests
  for each row
  execute function public.set_updated_at();

create trigger meeting_bookings_updated_at
  before update on public.meeting_bookings
  for each row
  execute function public.set_updated_at();

create policy "contact_messages_admin_manage" on "public"."contact_messages"
  for all
  to "authenticated"
  using (app.is_admin())
  with check (app.is_admin());

create policy "contact_messages_public_insert" on "public"."contact_messages"
  for insert
  to "anon", "authenticated"
  with check (true);

create policy "data_room_access_logs_client_deny" on "public"."data_room_access_logs"
  for all
  to "anon", "authenticated"
  using (false)
  with check (false);

create policy "data_room_categories_client_deny" on "public"."data_room_categories"
  for all
  to "anon", "authenticated"
  using (false)
  with check (false);

create policy "data_room_documents_client_deny" on "public"."data_room_documents"
  for all
  to "anon", "authenticated"
  using (false)
  with check (false);

create policy "investor_requests_admin_manage" on "public"."investor_requests"
  for all
  to "authenticated"
  using (app.is_admin())
  with check (app.is_admin());

create policy "investor_requests_public_insert" on "public"."investor_requests"
  for insert
  to "anon", "authenticated"
  with check (true);

create policy "investor_tokens_client_deny" on "public"."investor_tokens"
  for all
  to "anon", "authenticated"
  using (false)
  with check (false);

create policy "kv_store_b620c355_client_deny" on "public"."kv_store_b620c355"
  for all
  to "anon", "authenticated"
  using (false)
  with check (false);

create policy "legacy_audit_logs_client_deny" on "public"."legacy_audit_logs"
  for all
  to "anon", "authenticated"
  using (false)
  with check (false);

create policy "legacy_investor_status_history_client_deny" on "public"."legacy_investor_status_history"
  for all
  to "anon", "authenticated"
  using (false)
  with check (false);

create policy "legacy_investors_client_deny" on "public"."legacy_investors"
  for all
  to "anon", "authenticated"
  using (false)
  with check (false);

create policy "meeting_bookings_admin_manage" on "public"."meeting_bookings"
  for all
  to "authenticated"
  using (app.is_admin())
  with check (app.is_admin());

create policy "meeting_bookings_public_insert" on "public"."meeting_bookings"
  for insert
  to "anon", "authenticated"
  with check (true);

create policy "meetings_client_deny" on "public"."meetings"
  for all
  to "anon", "authenticated"
  using (false)
  with check (false);

create policy "portal_content_public_read" on "public"."portal_content"
  for select
  to "anon", "authenticated"
  using (((status)::text = 'published'::text));

create policy "settings_client_deny" on "public"."settings"
  for all
  to "anon", "authenticated"
  using (false)
  with check (false);

create policy "user_profiles_client_deny" on "public"."user_profiles"
  for all
  to "anon", "authenticated"
  using (false)
  with check (false);

create policy "user_roles_client_deny" on "public"."user_roles"
  for all
  to "anon", "authenticated"
  using (false)
  with check (false);

alter publication "supabase_realtime" add table "public"."contact_messages";

alter publication "supabase_realtime" add table "public"."investor_requests";

alter publication "supabase_realtime" add table "public"."legacy_investors";

alter publication "supabase_realtime" add table "public"."meeting_bookings";

alter publication "supabase_realtime" add table "public"."portal_content";

comment on column "public"."data_room_documents"."content" is 'Structured Data Room document content rendered by Admin and Investor Portal.';

comment on column "public"."data_room_documents"."cover_image_url" is 'Optional document cover image.';

comment on column "public"."data_room_documents"."embed_url" is 'Optional external embed reference. Must never bypass investor authorization for protected files.';

comment on function "app"."create_document_with_draft"(text, text, public.document_kind, text, public.visibility, uuid) is 'Document creation RPC. Direct authenticated API execute is revoked; invoke only through trusted server-side workflow.';

comment on function "app"."create_investor_message_thread"(uuid, text, text) is 'Investor thread creation RPC. Direct authenticated API execute is revoked; invoke only through trusted server-side workflow.';

comment on function "app"."has_permission"(text) is 'Permission evaluation RPC. Direct authenticated API execute is revoked; permission checks are brokered by server-side authorization.';

comment on function "app"."transition_portal_page"(uuid, public.publication_status) is 'Portal lifecycle RPC. Direct authenticated API execute is revoked; lifecycle transitions are brokered by server-side authorization.';

comment on function "public"."current_principal"() is 'Internal security helper. Direct API execute is revoked; server-side callers use it through trusted application flows.';

comment on table "public"."data_room_access_logs" is 'Protected investor Data Room access audit log. Access exclusively through server Edge Functions.';

comment on table "public"."data_room_categories" is 'Protected investor Data Room categories. Access exclusively through server Edge Functions.';

comment on table "public"."data_room_documents" is 'Protected investor Data Room documents. Access exclusively through server Edge Functions and investor-token verification.';

revoke all on function "app"."create_investor_message_thread"(uuid, text, text) from public;

revoke all on function "app"."set_updated_at"() from public;

grant execute on function "app"."set_updated_at"() to public;

revoke all on function "public"."set_updated_at"() from public;

grant execute on function "public"."set_updated_at"() to "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."contact_messages" to "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."data_room_access_logs" to "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."data_room_categories" to "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."data_room_documents" to "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."investor_requests" to "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."investor_tokens" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."kv_store_b620c355" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."legacy_audit_logs" to "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."legacy_investor_status_history" to "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."legacy_investors" to "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."meeting_bookings" to "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."meetings" to "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."portal_content" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."settings" to "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."user_profiles" to "anon", "authenticated", "postgres", "service_role";

grant delete, insert, maintain, references, select, trigger, truncate, update on table "public"."user_roles" to "postgres", "service_role";

grant usage on type "public"."app_role" to "postgres";

grant usage on type "public"."user_status" to "postgres";

