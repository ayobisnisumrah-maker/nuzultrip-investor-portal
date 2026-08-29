


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "app";


ALTER SCHEMA "app" OWNER TO "postgres";


COMMENT ON SCHEMA "app" IS 'Internal helper functions (authorisation, event emission). Not exposed via the API.';



CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."account_status" AS ENUM (
    'active',
    'disabled'
);


ALTER TYPE "public"."account_status" OWNER TO "postgres";


CREATE TYPE "public"."account_type" AS ENUM (
    'admin',
    'investor'
);


ALTER TYPE "public"."account_type" OWNER TO "postgres";


CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'ir'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."asset_visibility" AS ENUM (
    'public',
    'internal',
    'restricted'
);


ALTER TYPE "public"."asset_visibility" OWNER TO "postgres";


CREATE TYPE "public"."broadcast_audience" AS ENUM (
    'all_investors',
    'by_status',
    'selected'
);


ALTER TYPE "public"."broadcast_audience" OWNER TO "postgres";


CREATE TYPE "public"."delivery_channel" AS ENUM (
    'email'
);


ALTER TYPE "public"."delivery_channel" OWNER TO "postgres";


CREATE TYPE "public"."delivery_status" AS ENUM (
    'pending',
    'sent',
    'failed',
    'skipped'
);


ALTER TYPE "public"."delivery_status" OWNER TO "postgres";


CREATE TYPE "public"."document_kind" AS ENUM (
    'investment_proposal',
    'pitch_deck',
    'investor_report',
    'business_update',
    'supporting'
);


ALTER TYPE "public"."document_kind" OWNER TO "postgres";


CREATE TYPE "public"."financial_category" AS ENUM (
    'revenue',
    'expense',
    'asset',
    'liability',
    'equity',
    'operating',
    'investing',
    'financing'
);


ALTER TYPE "public"."financial_category" OWNER TO "postgres";


CREATE TYPE "public"."financial_source" AS ENUM (
    'internal',
    'reviewed',
    'audited'
);


ALTER TYPE "public"."financial_source" OWNER TO "postgres";


CREATE TYPE "public"."financial_statement" AS ENUM (
    'income',
    'balance',
    'cash_flow'
);


ALTER TYPE "public"."financial_statement" OWNER TO "postgres";


CREATE TYPE "public"."inquiry_status" AS ENUM (
    'new',
    'in_progress',
    'converted',
    'closed'
);


ALTER TYPE "public"."inquiry_status" OWNER TO "postgres";


CREATE TYPE "public"."investor_status" AS ENUM (
    'prospective',
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'active',
    'inactive'
);


ALTER TYPE "public"."investor_status" OWNER TO "postgres";


CREATE TYPE "public"."investor_type" AS ENUM (
    'individual',
    'institution'
);


ALTER TYPE "public"."investor_type" OWNER TO "postgres";


CREATE TYPE "public"."nav_location" AS ENUM (
    'header',
    'footer',
    'legal',
    'social'
);


ALTER TYPE "public"."nav_location" OWNER TO "postgres";


CREATE TYPE "public"."notification_kind" AS ENUM (
    'investor_application_received',
    'investor_approved',
    'investor_rejected',
    'investor_deactivated',
    'document_published',
    'document_shared',
    'financial_report_published',
    'investor_report_published',
    'company_update',
    'message_received',
    'inquiry_received',
    'account_invited'
);


ALTER TYPE "public"."notification_kind" OWNER TO "postgres";


CREATE TYPE "public"."ownership_holding_status" AS ENUM (
    'reserved',
    'active',
    'transferred',
    'cancelled'
);


ALTER TYPE "public"."ownership_holding_status" OWNER TO "postgres";


CREATE TYPE "public"."ownership_inheritance_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."ownership_inheritance_status" OWNER TO "postgres";


CREATE TYPE "public"."ownership_offering_status" AS ENUM (
    'draft',
    'open',
    'paused',
    'closed',
    'archived'
);


ALTER TYPE "public"."ownership_offering_status" OWNER TO "postgres";


CREATE TYPE "public"."ownership_transfer_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."ownership_transfer_status" OWNER TO "postgres";


CREATE TYPE "public"."page_kind" AS ENUM (
    'home',
    'standard',
    'legal'
);


ALTER TYPE "public"."page_kind" OWNER TO "postgres";


CREATE TYPE "public"."participant_role" AS ENUM (
    'investor',
    'admin'
);


ALTER TYPE "public"."participant_role" OWNER TO "postgres";


CREATE TYPE "public"."period_status" AS ENUM (
    'open',
    'closed',
    'locked'
);


ALTER TYPE "public"."period_status" OWNER TO "postgres";


CREATE TYPE "public"."period_type" AS ENUM (
    'monthly',
    'quarterly',
    'yearly'
);


ALTER TYPE "public"."period_type" OWNER TO "postgres";


CREATE TYPE "public"."profit_distribution_status" AS ENUM (
    'draft',
    'review',
    'approved',
    'payable',
    'paid',
    'cancelled'
);


ALTER TYPE "public"."profit_distribution_status" OWNER TO "postgres";


CREATE TYPE "public"."publication_status" AS ENUM (
    'draft',
    'review',
    'approved',
    'published',
    'archived'
);


ALTER TYPE "public"."publication_status" OWNER TO "postgres";


CREATE TYPE "public"."section_kind" AS ENUM (
    'hero_3d',
    'intro',
    'vision_mission',
    'business_overview',
    'growth_story',
    'ecosystem',
    'investment_info',
    'milestones',
    'strategic_direction',
    'financial_highlights',
    'investor_updates',
    'documents',
    'contact_cta',
    'legal_notice',
    'rich_content',
    'stat_grid',
    'logo_wall',
    'faq'
);


ALTER TYPE "public"."section_kind" OWNER TO "postgres";


CREATE TYPE "public"."thread_kind" AS ENUM (
    'investor_admin',
    'broadcast',
    'portal_inquiry'
);


ALTER TYPE "public"."thread_kind" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE TYPE "public"."visibility" AS ENUM (
    'public',
    'investors',
    'restricted',
    'internal'
);


ALTER TYPE "public"."visibility" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."admin_role_key"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select r.key
  from public.admins a
  join public.roles r on r.id = a.role_id
  join public.user_accounts ua on ua.id = a.id
  where a.id = (select auth.uid())
    and a.is_active
    and ua.status = 'active';
$$;


ALTER FUNCTION "app"."admin_role_key"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."assert_account_type"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  expected public.account_type := tg_argv[0]::public.account_type;
  actual public.account_type;
begin
  select ua.account_type into actual
  from public.user_accounts ua
  where ua.id = new.id;

  if actual is null then
    raise exception 'No user_accounts row for %', new.id using errcode = '23503';
  end if;

  if actual <> expected then
    raise exception
      'Account % is of type %, but a % row was requested.', new.id, actual, expected
      using errcode = '23514';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "app"."assert_account_type"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."assert_role_assignable"("p_role_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor uuid := (select auth.uid());
  missing text;
begin
  if actor is null then
    return;
  end if;

  -- A Super Admin may assign anything, by definition.
  if app.admin_role_key() = 'super_admin' then
    return;
  end if;

  -- Super Admin holds every permission implicitly, so it has no
  -- `role_permissions` rows at all. Without this check the comparison below
  -- would find nothing to object to and would happily let a lesser admin
  -- confer Super Admin on someone — the most direct privilege escalation
  -- available in the system.
  if exists (
    select 1 from public.roles r
    where r.id = p_role_id and r.key = 'super_admin'
  ) then
    raise exception 'Only a Super Admin may assign the Super Admin role.'
      using errcode = '42501';
  end if;

  select p.key into missing
  from (
    select pp.key
    from public.role_permissions rp
    join public.permissions pp on pp.id = rp.permission_id
    where rp.role_id = p_role_id
  ) p
  where not app.has_permission(p.key)
  limit 1;

  if missing is not null then
    raise exception
      'You cannot assign a role that holds permissions you do not: %', missing
      using errcode = '42501';
  end if;
end;
$$;


ALTER FUNCTION "app"."assert_role_assignable"("p_role_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."assert_section_content_kind"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  expected public.section_kind;
  declared text := new.content ->> 'kind';
begin
  select s.section_kind into expected
  from public.portal_sections s
  where s.id = new.section_id;

  if declared is null then
    raise exception 'Section content must declare a "kind" discriminant.'
      using errcode = '23514';
  end if;

  if declared <> expected::text then
    raise exception 'Section content declares kind "%" but the section is "%".',
      declared, expected
      using errcode = '23514';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "app"."assert_section_content_kind"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."assign_company_profile_version_number"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.version_number is null then
    select coalesce(max(v.version_number), 0) + 1
    into new.version_number
    from public.company_profile_versions v
    where v.company_profile_id = new.company_profile_id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "app"."assign_company_profile_version_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."assign_document_version_number"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.version_number is null then
    select coalesce(max(dv.version_number), 0) + 1
    into new.version_number
    from public.document_versions dv
    where dv.document_id = new.document_id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "app"."assign_document_version_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."assign_financial_version_number"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  period_state public.period_status;
begin
  select fp.status into period_state
  from public.financial_reports fr
  join public.financial_periods fp on fp.id = fr.financial_period_id
  where fr.id = new.financial_report_id;

  if period_state = 'locked' then
    raise exception 'The reporting period is locked; no new version can be added.'
      using errcode = '42501';
  end if;

  if new.version_number is null then
    select coalesce(max(v.version_number), 0) + 1
    into new.version_number
    from public.financial_report_versions v
    where v.financial_report_id = new.financial_report_id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "app"."assign_financial_version_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."assign_investor_reference"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.reference_code is null or length(btrim(new.reference_code)) = 0 then
    new.reference_code := 'NTI-'
      || to_char(now() at time zone 'UTC', 'YYYY')
      || '-'
      || lpad(nextval('public.investor_reference_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;


ALTER FUNCTION "app"."assign_investor_reference"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."assign_section_version_number"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.version_number is null then
    select coalesce(max(v.version_number), 0) + 1
    into new.version_number
    from public.portal_section_versions v
    where v.section_id = new.section_id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "app"."assign_section_version_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."bump_role_version"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if (select auth.uid()) is null then
    update public.roles
    set permission_version = permission_version + 1
    where id = coalesce(new.role_id, old.role_id);
  end if;
  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "app"."bump_role_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."create_document_with_draft"("p_title" "text", "p_slug" "text", "p_kind" "public"."document_kind", "p_summary" "text" DEFAULT NULL::"text", "p_visibility" "public"."visibility" DEFAULT 'internal'::"public"."visibility", "p_file_asset_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("document_id" "uuid", "version_id" "uuid", "title" "text", "slug" "text", "kind" "public"."document_kind", "summary" "text", "visibility" "public"."visibility", "status" "public"."publication_status", "version_number" integer, "file_asset_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_document_id uuid;
  v_version_id uuid;
  v_admin_id uuid;
  v_asset public.media_assets;
begin
  if not app.has_permission('documents.create') then
    raise exception 'Missing documents.create permission.'
      using errcode = '42501';
  end if;

  v_admin_id := app.current_user_id();

  if v_admin_id is null then
    raise exception 'Authenticated administrator required.'
      using errcode = '42501';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Document title is required.'
      using errcode = '22023';
  end if;

  if p_slug is null or length(trim(p_slug)) = 0 then
    raise exception 'Document slug is required.'
      using errcode = '22023';
  end if;

  if p_file_asset_id is not null then
    select ma.*
      into v_asset
    from public.media_assets as ma
    where ma.id = p_file_asset_id
      and ma.uploaded_by = v_admin_id
      and ma.finalized_at is not null
      and ma.visibility = 'restricted'
    for update;

    if v_asset.id is null then
      raise exception 'File asset tidak ditemukan atau tidak dapat digunakan.'
        using errcode = '42501';
    end if;

    if exists (
      select 1
      from public.document_versions as dv
      where dv.file_asset_id = p_file_asset_id
    ) then
      raise exception 'File asset sudah digunakan oleh versi dokumen lain.'
        using errcode = '23505';
    end if;
  end if;

  insert into public.documents (
    title,
    slug,
    kind,
    summary,
    visibility,
    status,
    owner_admin_id
  )
  values (
    trim(p_title),
    trim(p_slug),
    p_kind,
    nullif(trim(p_summary), ''),
    p_visibility,
    'draft',
    v_admin_id
  )
  returning id into v_document_id;

  insert into public.document_versions (
    document_id,
    title,
    version_number,
    status,
    content,
    file_asset_id,
    created_by
  )
  values (
    v_document_id,
    trim(p_title),
    1,
    'draft',
    '{}'::jsonb,
    p_file_asset_id,
    v_admin_id
  )
  returning id into v_version_id;

  update public.documents as d
  set current_version_id = v_version_id
  where d.id = v_document_id;

  return query
  select
    d.id,
    v.id,
    d.title,
    d.slug,
    d.kind,
    d.summary,
    d.visibility,
    d.status,
    v.version_number,
    v.file_asset_id
  from public.documents as d
  join public.document_versions as v
    on v.id = d.current_version_id
  where d.id = v_document_id;
end;
$$;


ALTER FUNCTION "app"."create_document_with_draft"("p_title" "text", "p_slug" "text", "p_kind" "public"."document_kind", "p_summary" "text", "p_visibility" "public"."visibility", "p_file_asset_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "app"."create_document_with_draft"("p_title" "text", "p_slug" "text", "p_kind" "public"."document_kind", "p_summary" "text", "p_visibility" "public"."visibility", "p_file_asset_id" "uuid") IS 'Document creation RPC. Direct authenticated API execute is revoked; invoke only through trusted server-side workflow.';



CREATE OR REPLACE FUNCTION "app"."create_investor_message_thread"("p_investor_id" "uuid", "p_subject" "text", "p_body" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "app"."create_investor_message_thread"("p_investor_id" "uuid", "p_subject" "text", "p_body" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "app"."create_investor_message_thread"("p_investor_id" "uuid", "p_subject" "text", "p_body" "text") IS 'Investor thread creation RPC. Direct authenticated API execute is revoked; invoke only through trusted server-side workflow.';



CREATE OR REPLACE FUNCTION "app"."current_actor_type"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(
    (select ua.account_type::text from public.user_accounts ua where ua.id = (select auth.uid())),
    'system'
  );
$$;


ALTER FUNCTION "app"."current_actor_type"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."current_investor_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select i.id
  from public.investors i
  join public.user_accounts ua on ua.id = i.id
  where i.id = (select auth.uid())
    and ua.status = 'active'
    and i.status in ('approved', 'active');
$$;


ALTER FUNCTION "app"."current_investor_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "app"."current_investor_id"() IS 'The calling investor''s id, but only while their status grants data access. NULL otherwise.';



CREATE OR REPLACE FUNCTION "app"."current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select (select auth.uid());
$$;


ALTER FUNCTION "app"."current_user_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "app"."current_user_id"() IS 'The authenticated user id, or NULL. Stable so it is evaluated once per statement.';



CREATE OR REPLACE FUNCTION "app"."document_workflow_permission_allowed"("p_target" "public"."publication_status") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select case p_target
    when 'review' then app.has_permission('documents.review')
    when 'approved' then app.has_permission('documents.approve')
    when 'published' then app.has_permission('documents.publish')
    when 'archived' then app.has_permission('documents.archive')
    else false
  end;
$$;


ALTER FUNCTION "app"."document_workflow_permission_allowed"("p_target" "public"."publication_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."effective_permissions"("p_admin_id" "uuid") RETURNS SETOF "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select p.key
  from public.admins a
  join public.roles r on r.id = a.role_id
  cross join lateral (
    select pp.key
    from public.permissions pp
    where r.key = 'super_admin'
    union
    select pp.key
    from public.role_permissions rp
    join public.permissions pp on pp.id = rp.permission_id
    where rp.role_id = r.id
  ) p(key)
  where a.id = p_admin_id;
$$;


ALTER FUNCTION "app"."effective_permissions"("p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."emit_document_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor text := app.current_actor_type();
begin
  if new.status is distinct from old.status or
     new.published_version_id is distinct from old.published_version_id then

    perform app.emit_event(app.topic_admin(), 'document.state_changed', 'document', new.id, actor);

    if new.status = 'published' then
      if new.visibility = 'public' then
        perform app.emit_event(app.topic_portal(), 'document.published', 'document', new.id, actor);
      elsif new.visibility = 'investors' then
        perform app.emit_event(
          app.topic_all_investors(), 'document.published', 'document', new.id, actor
        );
      end if;
      -- `restricted` documents notify only the investors holding a live grant.
      if new.visibility = 'restricted' then
        perform app.emit_event(app.topic_investor(g.investor_id), 'document.published', 'document', new.id, actor)
        from public.document_access_grants g
        where g.document_id = new.id and g.revoked_at is null;
      end if;
    end if;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "app"."emit_document_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."emit_document_grant_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor text := app.current_actor_type();
begin
  if tg_op = 'INSERT' then
    perform app.emit_event(
      app.topic_investor(new.investor_id), 'investor.document_shared', 'document', new.document_id, actor
    );
  elsif new.revoked_at is not null and old.revoked_at is null then
    perform app.emit_event(
      app.topic_investor(new.investor_id), 'investor.document_revoked', 'document', new.document_id, actor
    );
  end if;
  return null;
end;
$$;


ALTER FUNCTION "app"."emit_document_grant_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."emit_event"("p_topic" "text", "p_kind" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_actor_type" "text" DEFAULT 'system'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform realtime.send(
    jsonb_build_object(
      'kind', p_kind,
      'entityType', p_entity_type,
      'entityId', p_entity_id,
      'occurredAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'actorType', p_actor_type,
      'version', 1
    ),
    p_kind,
    p_topic,
    true
  );
exception
  when others then
    insert into public.realtime_emit_failures
      (topic, kind, entity_type, entity_id, error_message)
    values (p_topic, p_kind, p_entity_type, p_entity_id, sqlerrm);
end;
$$;


ALTER FUNCTION "app"."emit_event"("p_topic" "text", "p_kind" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_actor_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."emit_financial_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor text := app.current_actor_type();
begin
  if new.status is distinct from old.status then
    perform app.emit_event(
      app.topic_admin(), 'financial_report.state_changed', 'financial_report', new.id, actor
    );
    if new.status = 'published' then
      perform app.emit_event(
        app.topic_all_investors(), 'financial_report.published', 'financial_report', new.id, actor
      );
    end if;
  end if;
  return null;
end;
$$;


ALTER FUNCTION "app"."emit_financial_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."emit_inquiry_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform app.emit_event(
    app.topic_admin(), 'inquiry.received', 'portal_inquiry', new.id, 'anonymous'
  );
  return null;
end;
$$;


ALTER FUNCTION "app"."emit_inquiry_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."emit_investor_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor text := app.current_actor_type();
begin
  if tg_op = 'INSERT' then
    perform app.emit_event(app.topic_admin(), 'investor.applied', 'investor', new.id, actor);
    return null;
  end if;

  if new.status is distinct from old.status then
    perform app.emit_event(
      app.topic_investor(new.id), 'investor.status_changed', 'investor', new.id, actor
    );
    perform app.emit_event(
      app.topic_admin(), 'investor.status_changed', 'investor', new.id, actor
    );
    -- The account's own channel, so a signed-in investor learns their access
    -- changed even while looking at a page that is not investor-scoped.
    perform app.emit_event(
      app.topic_user(new.id), 'investor.status_changed', 'investor', new.id, actor
    );
  end if;

  return null;
end;
$$;


ALTER FUNCTION "app"."emit_investor_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."emit_message_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor text := app.current_actor_type();
  thread record;
begin
  select t.investor_id into thread from public.message_threads t where t.id = new.thread_id;

  if thread.investor_id is not null then
    perform app.emit_event(
      app.topic_investor(thread.investor_id), 'message.received', 'message', new.id, actor
    );
  end if;

  perform app.emit_event(app.topic_admin(), 'message.received', 'message', new.id, actor);
  return null;
end;
$$;


ALTER FUNCTION "app"."emit_message_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."emit_notification_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform app.emit_event(
    app.topic_user(new.recipient_id), 'notification.created', 'notification', new.id,
    app.current_actor_type()
  );
  return null;
end;
$$;


ALTER FUNCTION "app"."emit_notification_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."emit_portal_navigation_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform app.emit_event(
    app.topic_portal(), 'portal.navigation_updated', 'portal_navigation',
    coalesce(new.id, old.id), app.current_actor_type()
  );
  return null;
end;
$$;


ALTER FUNCTION "app"."emit_portal_navigation_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."emit_portal_page_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform app.emit_event(
    app.topic_portal(), 'portal.page_published', 'portal_page',
    coalesce(new.id, old.id), app.current_actor_type()
  );
  return null;
end;
$$;


ALTER FUNCTION "app"."emit_portal_page_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."emit_portal_section_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform app.emit_event(
    app.topic_portal(), 'portal.section_published', 'portal_section',
    coalesce(new.id, old.id), app.current_actor_type()
  );
  return null;
end;
$$;


ALTER FUNCTION "app"."emit_portal_section_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."emit_portal_theme_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform app.emit_event(
    app.topic_portal(), 'portal.theme_updated', 'portal_theme',
    coalesce(new.id, old.id), app.current_actor_type()
  );
  return null;
end;
$$;


ALTER FUNCTION "app"."emit_portal_theme_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."forbid_column_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $_$
declare
  col text;
  old_value text;
  new_value text;
begin
  foreach col in array tg_argv loop
    execute format('select ($1).%I::text, ($2).%I::text', col, col)
      into old_value, new_value
      using old, new;
    if old_value is distinct from new_value then
      raise exception 'Column %.% is immutable.', tg_table_name, col
        using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$_$;


ALTER FUNCTION "app"."forbid_column_change"() OWNER TO "postgres";


COMMENT ON FUNCTION "app"."forbid_column_change"() IS 'BEFORE UPDATE trigger taking column names as arguments; raises if any change.';



CREATE OR REPLACE FUNCTION "app"."forbid_mutation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  raise exception
    'Table %.% is append-only; % is not permitted.',
    tg_table_schema, tg_table_name, tg_op
    using errcode = '42501';
end;
$$;


ALTER FUNCTION "app"."forbid_mutation"() OWNER TO "postgres";


COMMENT ON FUNCTION "app"."forbid_mutation"() IS 'BEFORE UPDATE OR DELETE trigger: raises. For append-only tables.';



CREATE OR REPLACE FUNCTION "app"."forbid_published_version_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if old.status in ('published', 'archived') then
    raise exception 'A published version cannot be deleted.' using errcode = '42501';
  end if;
  return old;
end;
$$;


ALTER FUNCTION "app"."forbid_published_version_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."guard_admin_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor uuid := (select auth.uid());
  super_admin_role uuid;
  remaining integer;
begin
  select id into super_admin_role from public.roles where key = 'super_admin';

  if actor is not null and tg_op = 'UPDATE' then
    -- 4. You cannot change your own role.
    if new.id = actor and new.role_id is distinct from old.role_id then
      raise exception 'You cannot change your own role.' using errcode = '42501';
    end if;

    -- 5. You cannot disable yourself — an accidental lockout is unrecoverable
    -- without direct database access.
    if new.id = actor and old.is_active and not new.is_active then
      raise exception 'You cannot disable your own account.' using errcode = '42501';
    end if;

    -- 2. You cannot assign a role whose permission set exceeds your own.
    if new.role_id is distinct from old.role_id then
      perform app.assert_role_assignable(new.role_id);
    end if;
  end if;

  if actor is not null and tg_op = 'INSERT' then
    perform app.assert_role_assignable(new.role_id);
  end if;

  -- The last active Super Admin cannot be disabled or demoted, by anyone.
  if tg_op = 'UPDATE' and old.role_id = super_admin_role
     and (new.role_id is distinct from old.role_id or (old.is_active and not new.is_active))
  then
    select count(*) into remaining
    from public.admins a
    join public.user_accounts ua on ua.id = a.id
    where a.role_id = super_admin_role
      and a.is_active
      and ua.status = 'active'
      and a.id <> old.id;

    if remaining = 0 then
      raise exception 'The last active Super Admin cannot be disabled or demoted.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "app"."guard_admin_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."guard_admin_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  super_admin_role uuid;
  remaining integer;
begin
  select id into super_admin_role from public.roles where key = 'super_admin';

  if old.role_id = super_admin_role then
    select count(*) into remaining
    from public.admins a
    where a.role_id = super_admin_role
      and a.is_active
      and a.id <> old.id;

    if remaining = 0 then
      raise exception 'The last Super Admin cannot be deleted.' using errcode = '42501';
    end if;
  end if;

  return old;
end;
$$;


ALTER FUNCTION "app"."guard_admin_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."guard_company_profile_version_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if old.status = 'published' then
    if app.published_change_is_referential(to_jsonb(old), to_jsonb(new)) then
      return new;
    end if;
    raise exception
      'Company profile version % is published and cannot be modified.', old.version_number
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and not app.publication_transition_allowed(old.status, new.status) then
    raise exception 'Publication status cannot move from % to %.', old.status, new.status
      using errcode = '23514';
  end if;

  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;


ALTER FUNCTION "app"."guard_company_profile_version_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."guard_document_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if new.status is distinct from old.status then
    if not app.publication_transition_allowed(old.status, new.status) then
      raise exception 'Document status cannot move from % to %.', old.status, new.status
        using errcode = '23514';
    end if;
    if not app.document_workflow_permission_allowed(new.status) then
      raise exception 'Missing permission for document transition to %.', new.status
        using errcode = '42501';
    end if;
    if new.status = 'published' and new.published_version_id is distinct from new.current_version_id then
      raise exception 'A published document must publish its current version.' using errcode = '23514';
    end if;
    if new.status = 'archived' then
      new.archived_at := coalesce(new.archived_at, now());
    end if;
  elsif to_jsonb(new) is distinct from to_jsonb(old)
    and not app.has_permission('documents.update') then
    raise exception 'Missing documents.update permission.' using errcode = '42501';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "app"."guard_document_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."guard_document_version_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if old.status = 'published' then
    if app.published_change_is_referential(to_jsonb(old), to_jsonb(new)) then
      return new;
    end if;
    raise exception
      'Version % of document % is published and cannot be modified. Create a new version instead.',
      old.version_number, old.document_id using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not app.publication_transition_allowed(old.status, new.status) then
      raise exception 'Publication status cannot move from % to %.', old.status, new.status
        using errcode = '23514';
    end if;
    if not app.document_workflow_permission_allowed(new.status) then
      raise exception 'Missing permission for document version transition to %.', new.status
        using errcode = '42501';
    end if;
  elsif to_jsonb(new) is distinct from to_jsonb(old)
    and not app.has_permission('documents.update') then
    raise exception 'Missing documents.update permission.' using errcode = '42501';
  end if;

  if new.status = 'published' then new.published_at := coalesce(new.published_at, now()); end if;
  return new;
end;
$$;


ALTER FUNCTION "app"."guard_document_version_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."guard_financial_line_item"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  version_status public.publication_status;
  target uuid := coalesce(new.financial_report_version_id, old.financial_report_version_id);
begin
  select v.status into version_status
  from public.financial_report_versions v
  where v.id = target;

  if version_status = 'published' then
    raise exception 'Figures belonging to a published version cannot be changed.'
      using errcode = '42501';
  end if;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "app"."guard_financial_line_item"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."guard_financial_period_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  /*
   * Metadata changes require financial_periods.update.
   *
   * Status changes are handled separately and require
   * financial_periods.close.
   */
  if new.status is distinct from old.status then

    if not app.has_permission('financial_periods.close') then
      raise exception
        'Changing financial period status requires financial_periods.close.'
        using errcode = '42501';
    end if;

    /*
     * Allowed lifecycle:
     *
     * open    -> closed
     * open    -> locked
     * closed  -> locked
     *
     * locked has no outgoing transition.
     */
    if old.status = 'open' and new.status in ('closed', 'locked') then
      return new;
    end if;

    if old.status = 'closed' and new.status = 'locked' then
      return new;
    end if;

    raise exception
      'Financial period status cannot move from % to %.',
      old.status,
      new.status
      using errcode = '23514';
  end if;

  /*
   * If status is unchanged, this is a metadata update.
   *
   * Locked periods are immutable.
   */
  if old.status = 'locked' then
    raise exception
      'Locked financial periods cannot be modified.'
      using errcode = '42501';
  end if;

  if not app.has_permission('financial_periods.update') then
    raise exception
      'Updating financial period metadata requires financial_periods.update.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "app"."guard_financial_period_update"() OWNER TO "postgres";


COMMENT ON FUNCTION "app"."guard_financial_period_update"() IS 'Enforces financial period lifecycle transitions and separates metadata update authorization from close/lock authorization.';



CREATE OR REPLACE FUNCTION "app"."guard_financial_version_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if old.status = 'published' then
    if app.published_change_is_referential(to_jsonb(old), to_jsonb(new)) then
      return new;
    end if;
    raise exception
      'Financial report version % is published and cannot be modified. Issue a new version instead.',
      old.version_number
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and not app.publication_transition_allowed(old.status, new.status) then
    raise exception 'Publication status cannot move from % to %.', old.status, new.status
      using errcode = '23514';
  end if;

  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;


ALTER FUNCTION "app"."guard_financial_version_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."guard_portal_page_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if old.is_system then
    raise exception 'System page "%" cannot be deleted.', old.slug using errcode = '42501';
  end if;
  return old;
end;
$$;


ALTER FUNCTION "app"."guard_portal_page_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."guard_role_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if old.is_system then
    raise exception 'System role "%" cannot be deleted.', old.key using errcode = '42501';
  end if;
  return old;
end;
$$;


ALTER FUNCTION "app"."guard_role_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."guard_role_permission_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor uuid := (select auth.uid());
  actor_role uuid;
  target_role uuid := coalesce(new.role_id, old.role_id);
  target_permission uuid := coalesce(new.permission_id, old.permission_id);
  permission_key text;
begin
  if actor is null then
    return coalesce(new, old);
  end if;

  select a.role_id into actor_role from public.admins a where a.id = actor;

  -- 3. You cannot edit the permissions of the role you yourself hold.
  if actor_role = target_role then
    raise exception 'You cannot modify the permissions of your own role.'
      using errcode = '42501';
  end if;

  -- 1. You cannot grant (or revoke) a permission you do not hold yourself.
  select p.key into permission_key
  from public.permissions p
  where p.id = target_permission;

  if not app.has_permission(permission_key) then
    raise exception 'You cannot assign a permission you do not hold: %', permission_key
      using errcode = '42501';
  end if;

  -- Bump the role's version so clients refresh their token.
  update public.roles
  set permission_version = permission_version + 1
  where id = target_role;

  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "app"."guard_role_permission_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."guard_section_version_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if old.status = 'published' then
    raise exception 'Section version % is published and cannot be modified.', old.version_number
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and not app.publication_transition_allowed(old.status, new.status) then
    raise exception 'Publication status cannot move from % to %.', old.status, new.status
      using errcode = '23514';
  end if;

  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;


ALTER FUNCTION "app"."guard_section_version_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."has_permission"("p_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.admins a
    join public.user_accounts ua on ua.id = a.id
    join public.roles r on r.id = a.role_id
    where a.id = (select auth.uid())
      and a.is_active
      and ua.status = 'active'
      and (
        r.key = 'super_admin'
        or exists (
          select 1
          from public.role_permissions rp
          join public.permissions p on p.id = rp.permission_id
          where rp.role_id = r.id
            and p.key = p_key
        )
      )
  );
$$;


ALTER FUNCTION "app"."has_permission"("p_key" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "app"."has_permission"("p_key" "text") IS 'Permission evaluation RPC. Direct authenticated API execute is revoked; permission checks are brokered by server-side authorization.';



CREATE OR REPLACE FUNCTION "app"."investor_granted_document"("p_document_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.document_access_grants g
    where g.document_id = p_document_id
      and g.investor_id = app.current_investor_id()
      and g.revoked_at is null
  );
$$;


ALTER FUNCTION "app"."investor_granted_document"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."investor_status_record"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor uuid := (select auth.uid());
  actor_label text;
begin
  if tg_op = 'UPDATE' and new.status = old.status then
    return null;
  end if;

  select ua.full_name into actor_label from public.user_accounts ua where ua.id = actor;

  insert into public.investor_status_history
    (investor_id, from_status, to_status, changed_by, changed_by_label, reason)
  values (
    new.id,
    case when tg_op = 'UPDATE' then old.status else null end,
    new.status,
    actor,
    actor_label,
    case when new.status = 'rejected' then new.rejection_reason else null end
  );

  return null;
end;
$$;


ALTER FUNCTION "app"."investor_status_record"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."investor_status_validate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'UPDATE' and new.status = old.status then
    return new;
  end if;

  if tg_op = 'UPDATE' and not app.investor_transition_allowed(old.status, new.status) then
    raise exception 'Investor status cannot move from % to %.', old.status, new.status
      using errcode = '23514';
  end if;

  -- Stamped by the database so they cannot disagree with the history rows or be
  -- back-dated by a client.
  if new.status = 'submitted' then new.applied_at := coalesce(new.applied_at, now()); end if;
  if new.status = 'under_review' then new.reviewed_at := now(); end if;
  if new.status = 'approved' then new.approved_at := now(); end if;
  if new.status = 'active' then new.activated_at := coalesce(new.activated_at, now()); end if;
  if new.status = 'inactive' then new.deactivated_at := now(); end if;

  return new;
end;
$$;


ALTER FUNCTION "app"."investor_status_validate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."investor_transition_allowed"("p_from" "public"."investor_status", "p_to" "public"."investor_status") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select case p_from
    when 'prospective' then p_to = 'submitted'
    when 'submitted' then p_to in ('under_review', 'rejected')
    when 'under_review' then p_to in ('approved', 'rejected')
    when 'approved' then p_to in ('active', 'rejected')
    when 'active' then p_to = 'inactive'
    when 'inactive' then p_to = 'active'
    when 'rejected' then p_to = 'under_review'
    else false
  end;
$$;


ALTER FUNCTION "app"."investor_transition_allowed"("p_from" "public"."investor_status", "p_to" "public"."investor_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.admins a
    join public.user_accounts ua on ua.id = a.id
    where a.id = (select auth.uid())
      and a.is_active
      and ua.status = 'active'
  );
$$;


ALTER FUNCTION "app"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."is_investor"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.investors i where i.id = (select auth.uid())
  );
$$;


ALTER FUNCTION "app"."is_investor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."participates_in_thread"("p_thread_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.thread_participants tp
    where tp.thread_id = p_thread_id
      and tp.user_id = (select auth.uid())
  );
$$;


ALTER FUNCTION "app"."participates_in_thread"("p_thread_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."publication_transition_allowed"("p_from" "public"."publication_status", "p_to" "public"."publication_status") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select case p_from
    when 'draft' then p_to = 'review'
    when 'review' then p_to in ('approved', 'draft')
    when 'approved' then p_to in ('published', 'draft')
    when 'published' then p_to = 'archived'
    when 'archived' then false
    else false
  end;
$$;


ALTER FUNCTION "app"."publication_transition_allowed"("p_from" "public"."publication_status", "p_to" "public"."publication_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."published_change_is_referential"("p_old" "jsonb", "p_new" "jsonb") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select
    (p_old - 'created_by' - 'approved_by') = (p_new - 'created_by' - 'approved_by')
    and (p_new -> 'created_by' = 'null'::jsonb or p_new -> 'created_by' = p_old -> 'created_by')
    and (p_new -> 'approved_by' = 'null'::jsonb or p_new -> 'approved_by' = p_old -> 'approved_by');
$$;


ALTER FUNCTION "app"."published_change_is_referential"("p_old" "jsonb", "p_new" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "app"."published_change_is_referential"("p_old" "jsonb", "p_new" "jsonb") IS 'True when the only change to a published row is an actor foreign key being set to null.';



CREATE OR REPLACE FUNCTION "app"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "app"."set_updated_at"() OWNER TO "postgres";


COMMENT ON FUNCTION "app"."set_updated_at"() IS 'BEFORE UPDATE trigger: stamps updated_at. Attach to every table with that column.';



CREATE OR REPLACE FUNCTION "app"."topic_admin"() RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$ select 'admin:global' $$;


ALTER FUNCTION "app"."topic_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."topic_all_investors"() RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$ select 'investors:all' $$;


ALTER FUNCTION "app"."topic_all_investors"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."topic_investor"("p_investor_id" "uuid") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select 'investor:' || p_investor_id::text
$$;


ALTER FUNCTION "app"."topic_investor"("p_investor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."topic_portal"() RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$ select 'portal:public' $$;


ALTER FUNCTION "app"."topic_portal"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."topic_user"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select 'user:' || p_user_id::text
$$;


ALTER FUNCTION "app"."topic_user"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."touch_thread_on_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.message_threads
  set last_message_at = new.sent_at
  where id = new.thread_id;
  return new;
end;
$$;


ALTER FUNCTION "app"."touch_thread_on_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "app"."transition_portal_page"("p_page_id" "uuid", "p_to_status" "public"."publication_status") RETURNS TABLE("page_id" "uuid", "page_title" "text", "previous_status" "public"."publication_status", "status" "public"."publication_status")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;


ALTER FUNCTION "app"."transition_portal_page"("p_page_id" "uuid", "p_to_status" "public"."publication_status") OWNER TO "postgres";


COMMENT ON FUNCTION "app"."transition_portal_page"("p_page_id" "uuid", "p_to_status" "public"."publication_status") IS 'Portal lifecycle RPC. Direct authenticated API execute is revoked; lifecycle transitions are brokered by server-side authorization.';



CREATE OR REPLACE FUNCTION "public"."activate_admin_account"("p_admin_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_admin public.admins;
  v_account public.user_accounts;
begin
  select *
    into v_admin
  from public.admins
  where id = p_admin_id
  for update;

  if v_admin.id is null then
    raise exception 'Administrator % tidak ditemukan.', p_admin_id
      using errcode = 'P0002';
  end if;

  select *
    into v_account
  from public.user_accounts
  where id = p_admin_id
    and account_type = 'admin'
  for update;

  if v_account.id is null then
    raise exception 'Akun administrator % tidak ditemukan.', p_admin_id
      using errcode = 'P0002';
  end if;

  update public.user_accounts
  set status = 'active'
  where id = p_admin_id;

  update public.admins
  set is_active = true,
      disabled_at = null,
      disabled_reason = null
  where id = p_admin_id;

  return jsonb_build_object(
    'adminId', p_admin_id,
    'status', 'active'
  );
end;
$$;


ALTER FUNCTION "public"."activate_admin_account"("p_admin_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."activate_admin_account"("p_admin_id" "uuid") IS 'Atomically activates an administrator by setting both admins.is_active and user_accounts.status. Service-role only.';



CREATE OR REPLACE FUNCTION "public"."consume_rate_limit"("p_bucket" "text", "p_limit" integer, "p_window_seconds" integer) RETURNS TABLE("allowed" boolean, "remaining" integer, "retry_after_seconds" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  window_length interval := make_interval(secs => p_window_seconds);
  current_hits integer;
  started timestamptz;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit configuration.' using errcode = '22023';
  end if;

  insert into public.rate_limits as rl (bucket, hits, window_started_at, updated_at)
  values (p_bucket, 1, now(), now())
  on conflict (bucket) do update
    set
      -- Reset the counter when the previous window has elapsed, otherwise
      -- increment within it.
      hits = case
        when rl.window_started_at + window_length < now() then 1
        else rl.hits + 1
      end,
      window_started_at = case
        when rl.window_started_at + window_length < now() then now()
        else rl.window_started_at
      end,
      updated_at = now()
  returning rl.hits, rl.window_started_at into current_hits, started;

  return query
  select
    current_hits <= p_limit,
    greatest(p_limit - current_hits, 0),
    case
      when current_hits <= p_limit then 0
      else greatest(ceil(extract(epoch from (started + window_length - now())))::integer, 1)
    end;
end;
$$;


ALTER FUNCTION "public"."consume_rate_limit"("p_bucket" "text", "p_limit" integer, "p_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_kind" "public"."notification_kind", "p_title" "text", "p_body" "text" DEFAULT ''::"text", "p_entity_type" "text" DEFAULT NULL::"text", "p_entity_id" "uuid" DEFAULT NULL::"uuid", "p_action_url" "text" DEFAULT NULL::"text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'app'
    AS $$
declare
  v_notification_id uuid;
  v_email_enabled boolean;
begin
  if p_recipient_id is null then
    raise exception 'recipient_id is required';
  end if;

  if length(btrim(p_title)) = 0 then
    raise exception 'notification title cannot be blank';
  end if;

  if p_action_url is not null and p_action_url !~ '^/' then
    raise exception 'notification action_url must be an internal path';
  end if;

  insert into public.notifications (
    recipient_id,
    kind,
    title,
    body,
    entity_type,
    entity_id,
    action_url,
    payload
  )
  values (
    p_recipient_id,
    p_kind,
    p_title,
    p_body,
    p_entity_type,
    p_entity_id,
    p_action_url,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_notification_id;

  /*
   * Email preference:
   *
   * - No preference row = enabled by default.
   * - Existing preference row = respect its email value.
   */
  select coalesce(
    (
      select np.email
      from public.notification_preferences np
      where np.user_id = p_recipient_id
        and np.kind = p_kind
      limit 1
    ),
    true
  )
  into v_email_enabled;

  if v_email_enabled is true then
    insert into public.notification_deliveries (
      notification_id,
      channel,
      status
    )
    values (
      v_notification_id,
      'email',
      'pending'
    )
    on conflict (notification_id, channel) do nothing;
  end if;

  return v_notification_id;
end;
$$;


ALTER FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_kind" "public"."notification_kind", "p_title" "text", "p_body" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_action_url" "text", "p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_principal"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  uid uuid := (select auth.uid());
  account record;
  result jsonb;
begin
  if uid is null then
    return null;
  end if;

  select ua.id, ua.account_type, ua.status, ua.email, ua.full_name,
         ua.locale, ua.timezone, ua.avatar_path
  into account
  from public.user_accounts ua
  where ua.id = uid;

  if account.id is null or account.status <> 'active' then
    return null;
  end if;

  result := jsonb_build_object(
    'userId', account.id,
    'accountType', account.account_type,
    'accountStatus', account.status,
    'email', account.email,
    'fullName', account.full_name,
    'locale', account.locale,
    'timezone', account.timezone,
    'avatarPath', account.avatar_path
  );

  if account.account_type = 'admin' then
    return result || coalesce(
      (
        select jsonb_build_object(
          'admin', jsonb_build_object(
            'adminId', a.id,
            'roleId', r.id,
            'roleKey', r.key,
            'roleName', r.name,
            'title', a.title,
            'permissionVersion', r.permission_version,
            'permissions', coalesce(
              (
                select jsonb_agg(p.key order by p.key)
                from public.permissions p
                where r.key = 'super_admin'
                   or exists (
                     select 1 from public.role_permissions rp
                     where rp.role_id = r.id and rp.permission_id = p.id
                   )
              ),
              '[]'::jsonb
            )
          )
        )
        from public.admins a
        join public.roles r on r.id = a.role_id
        where a.id = uid and a.is_active
      ),
      '{}'::jsonb
    );
  end if;

  return result || coalesce(
    (
      select jsonb_build_object(
        'investor', jsonb_build_object(
          'investorId', i.id,
          'referenceCode', i.reference_code,
          'status', i.status,
          'investorType', i.investor_type,
          'legalName', i.legal_name,
          -- The single source of truth for "may this investor see data",
          -- mirroring grantsDataAccess() in src/core/investors/status.ts.
          'hasDataAccess', i.status in ('approved', 'active')
        )
      )
      from public.investors i
      where i.id = uid
    ),
    '{}'::jsonb
  );
end;
$$;


ALTER FUNCTION "public"."current_principal"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_principal"() IS 'Internal security helper. Direct API execute is revoked; server-side callers use it through trusted application flows.';



CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  uid uuid := (event ->> 'user_id')::uuid;
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  account record;
  admin_row record;
  investor_row record;
begin
  select ua.account_type, ua.status into account
  from public.user_accounts ua where ua.id = uid;

  if account.account_type is null then
    -- An auth user with no domain account has no business holding claims.
    return event;
  end if;

  claims := claims
    || jsonb_build_object('account_type', account.account_type)
    || jsonb_build_object('account_status', account.status);

  if account.account_type = 'admin' then
    select a.id, a.role_id, r.key as role_key, r.permission_version, a.is_active
    into admin_row
    from public.admins a
    join public.roles r on r.id = a.role_id
    where a.id = uid;

    if admin_row.id is not null then
      claims := claims || jsonb_build_object(
        'admin_id', admin_row.id,
        'role_id', admin_row.role_id,
        'role_key', admin_row.role_key,
        'role_version', admin_row.permission_version,
        'admin_active', admin_row.is_active
      );
    end if;
  else
    select i.id, i.status into investor_row
    from public.investors i where i.id = uid;

    if investor_row.id is not null then
      claims := claims || jsonb_build_object(
        'investor_id', investor_row.id,
        'investor_status', investor_row.status
      );
    end if;
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") IS 'Stamps stable identity facts into the JWT. Never stamps granular permissions.';



CREATE OR REPLACE FUNCTION "public"."deactivate_admin_account"("p_admin_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_admin public.admins;
  v_account public.user_accounts;
  v_super_admin_role uuid;
  v_remaining integer;
begin
  select *
    into v_admin
  from public.admins
  where id = p_admin_id
  for update;

  if v_admin.id is null then
    raise exception 'Administrator % tidak ditemukan.', p_admin_id
      using errcode = 'P0002';
  end if;

  select *
    into v_account
  from public.user_accounts
  where id = p_admin_id
    and account_type = 'admin'
  for update;

  if v_account.id is null then
    raise exception 'Akun administrator % tidak ditemukan.', p_admin_id
      using errcode = 'P0002';
  end if;

  select id
    into v_super_admin_role
  from public.roles
  where key = 'super_admin';

  -- Never allow the last active Super Admin to be disabled.
  if v_admin.role_id = v_super_admin_role and v_admin.is_active then
    select count(*)
      into v_remaining
    from public.admins a
    join public.user_accounts ua
      on ua.id = a.id
    where a.role_id = v_super_admin_role
      and a.is_active
      and ua.status = 'active'
      and a.id <> p_admin_id;

    if v_remaining = 0 then
      raise exception 'The last Super Admin cannot be disabled.'
        using errcode = '42501';
    end if;
  end if;

  update public.user_accounts
  set status = 'disabled'
  where id = p_admin_id;

  update public.admins
  set
    is_active = false,
    disabled_at = now(),
    disabled_reason = nullif(btrim(coalesce(p_reason, '')), '')
  where id = p_admin_id;

  return jsonb_build_object(
    'adminId', p_admin_id,
    'status', 'disabled'
  );
end;
$$;


ALTER FUNCTION "public"."deactivate_admin_account"("p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."deactivate_admin_account"("p_admin_id" "uuid", "p_reason" "text") IS 'Atomically disables an administrator by setting both admins.is_active and user_accounts.status. The last active Super Admin cannot be disabled. Service-role only.';



CREATE OR REPLACE FUNCTION "public"."provision_admin_account"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_role_id" "uuid", "p_title" "text" DEFAULT NULL::"text", "p_created_by" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not exists (select 1 from public.roles where id = p_role_id) then
    raise exception 'Role % does not exist.', p_role_id using errcode = '23503';
  end if;

  insert into public.user_accounts (id, account_type, email, full_name)
  values (p_user_id, 'admin', lower(p_email), p_full_name);

  insert into public.admins (id, role_id, title, created_by)
  values (p_user_id, p_role_id, p_title, p_created_by);

  return jsonb_build_object('adminId', p_user_id);
end;
$$;


ALTER FUNCTION "public"."provision_admin_account"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_role_id" "uuid", "p_title" "text", "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_investor_account"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_legal_name" "text", "p_investor_type" "public"."investor_type", "p_phone" "text" DEFAULT NULL::"text", "p_country" "text" DEFAULT 'ID'::"text", "p_city" "text" DEFAULT NULL::"text", "p_address" "text" DEFAULT NULL::"text", "p_organization_name" "text" DEFAULT NULL::"text", "p_organization_role" "text" DEFAULT NULL::"text", "p_application_note" "text" DEFAULT NULL::"text", "p_identity_number_hash" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  reference text;
begin
  insert into public.user_accounts (id, account_type, email, full_name, phone)
  values (p_user_id, 'investor', lower(p_email), p_full_name, p_phone);

  insert into public.investors (
    id, legal_name, investor_type, country, city, address,
    organization_name, organization_role, application_note, identity_number_hash
  )
  values (
    p_user_id, p_legal_name, p_investor_type, upper(p_country), p_city, p_address,
    p_organization_name, p_organization_role, p_application_note, p_identity_number_hash
  )
  returning reference_code into reference;

  update public.investors set status = 'submitted' where id = p_user_id;

  return jsonb_build_object('investorId', p_user_id, 'referenceCode', reference);
end;
$$;


ALTER FUNCTION "public"."provision_investor_account"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_legal_name" "text", "p_investor_type" "public"."investor_type", "p_phone" "text", "p_country" "text", "p_city" "text", "p_address" "text", "p_organization_name" "text", "p_organization_role" "text", "p_application_note" "text", "p_identity_number_hash" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."provision_investor_account"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_legal_name" "text", "p_investor_type" "public"."investor_type", "p_phone" "text", "p_country" "text", "p_city" "text", "p_address" "text", "p_organization_name" "text", "p_organization_role" "text", "p_application_note" "text", "p_identity_number_hash" "text") IS 'Atomically creates the domain half of an investor account. Service-role only.';



CREATE OR REPLACE FUNCTION "public"."prune_rate_limits"("p_older_than_seconds" integer DEFAULT 86400) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  removed integer;
begin
  delete from public.rate_limits
  where updated_at < now() - make_interval(secs => p_older_than_seconds);
  get diagnostics removed = row_count;
  return removed;
end;
$$;


ALTER FUNCTION "public"."prune_rate_limits"("p_older_than_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_ownership_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_ownership_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_profit_distribution_payment_proof"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_profit_distribution_payment_proof"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_investor"("p_investor_id" "uuid", "p_to_status" "public"."investor_status", "p_reason" "text" DEFAULT NULL::"text") RETURNS "public"."investor_status"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  current_status public.investor_status;
begin
  select status into current_status from public.investors where id = p_investor_id;

  if current_status is null then
    -- Either the investor does not exist, or the caller cannot see it. Both
    -- report the same thing: telling them apart would confirm which ids exist.
    raise exception 'Investor not found.' using errcode = 'P0002';
  end if;

  update public.investors
  set status = p_to_status,
      rejection_reason = case when p_to_status = 'rejected' then p_reason else rejection_reason end
  where id = p_investor_id;

  return p_to_status;
end;
$$;


ALTER FUNCTION "public"."transition_investor"("p_investor_id" "uuid", "p_to_status" "public"."investor_status", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_admin_account"("p_admin_id" "uuid", "p_full_name" "text", "p_role_id" "uuid", "p_title" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_admin public.admins;
  v_role public.roles;
begin
  select *
    into v_admin
  from public.admins
  where id = p_admin_id
  for update;

  if v_admin.id is null then
    raise exception 'Administrator % tidak ditemukan.', p_admin_id
      using errcode = 'P0002';
  end if;

  select *
    into v_role
  from public.roles
  where id = p_role_id;

  if v_role.id is null then
    raise exception 'Role % tidak ditemukan.', p_role_id
      using errcode = '23503';
  end if;

  if v_role.key in ('super_admin', 'admin_internal') then
    raise exception 'Role tersebut tidak dapat diberikan melalui provisioning Administrator.'
      using errcode = '42501';
  end if;

  update public.user_accounts
  set
    full_name = btrim(p_full_name)
  where id = p_admin_id;

  update public.admins
  set
    role_id = p_role_id,
    title = nullif(btrim(coalesce(p_title, '')), '')
  where id = p_admin_id;

  return jsonb_build_object(
    'adminId', p_admin_id,
    'roleId', p_role_id
  );
end;
$$;


ALTER FUNCTION "public"."update_admin_account"("p_admin_id" "uuid", "p_full_name" "text", "p_role_id" "uuid", "p_title" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_admin_account"("p_admin_id" "uuid", "p_full_name" "text", "p_role_id" "uuid", "p_title" "text") IS 'Atomically updates administrator name, operational role and title. Service-role only.';



CREATE OR REPLACE FUNCTION "public"."update_role_permissions_atomic"("p_role_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_ids" "uuid"[], "p_expected_permission_version" integer) RETURNS TABLE("role_id" "uuid", "role_key" "text", "role_name" "text", "role_description" "text", "permission_version" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_role public.roles%rowtype;
  v_permission_count integer;
  v_distinct_permission_count integer;
begin
  if p_role_id is null then
    raise exception 'role_id is required'
      using errcode = '22023';
  end if;

  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'Role name cannot be blank'
      using errcode = '22023';
  end if;

  if length(p_name) > 100 then
    raise exception 'Role name is too long'
      using errcode = '22023';
  end if;

  if p_description is null then
    p_description := '';
  end if;

  if length(p_description) > 500 then
    raise exception 'Role description is too long'
      using errcode = '22023';
  end if;

  if p_expected_permission_version is null
     or p_expected_permission_version < 1 then
    raise exception 'Invalid permission version'
      using errcode = '22023';
  end if;

  select *
  into v_role
  from public.roles
  where id = p_role_id
  for update;

  if not found then
    raise exception 'Role not found'
      using errcode = 'P0002';
  end if;

  -- Super Admin is immutable.
  if v_role.key = 'super_admin' then
    raise exception 'Super Admin role cannot be modified'
      using errcode = '42501';
  end if;

  if v_role.permission_version <> p_expected_permission_version then
    raise exception 'ROLE_PERMISSION_VERSION_CONFLICT'
      using
        errcode = '40001',
        detail = v_role.permission_version::text;
  end if;

  select
    count(*),
    count(distinct p.id)
  into
    v_permission_count,
    v_distinct_permission_count
  from unnest(coalesce(p_permission_ids, '{}'::uuid[])) requested(id)
  left join public.permissions p
    on p.id = requested.id;

  if v_permission_count <> v_distinct_permission_count then
    raise exception 'One or more permission IDs do not exist'
      using errcode = '23503';
  end if;

  -- System role identity remains protected.
  -- Only permission membership is intended to be changed here.
  if v_role.is_system then
    update public.roles
    set
      updated_at = now()
    where id = p_role_id;
  else
    update public.roles
    set
      name = btrim(p_name),
      description = btrim(p_description),
      updated_at = now()
    where id = p_role_id;
  end if;

  delete from public.role_permissions rp
  where rp.role_id = p_role_id
    and not (
      rp.permission_id = any(
        coalesce(p_permission_ids, '{}'::uuid[])
      )
    );

  insert into public.role_permissions (
    role_id,
    permission_id
  )
  select
    p_role_id,
    requested.id
  from unnest(
    coalesce(p_permission_ids, '{}'::uuid[])
  ) requested(id)
  where not exists (
    select 1
    from public.role_permissions existing
    where existing.role_id = p_role_id
      and existing.permission_id = requested.id
  );

  return query
  select
    r.id,
    r.key,
    r.name,
    r.description,
    r.permission_version
  from public.roles r
  where r.id = p_role_id;
end;
$$;


ALTER FUNCTION "public"."update_role_permissions_atomic"("p_role_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_ids" "uuid"[], "p_expected_permission_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_profit_distribution_payment_proof"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  allocation_investor_id uuid;
begin
  select investor_id
    into allocation_investor_id
  from public.profit_distribution_allocations
  where id = new.allocation_id;

  if allocation_investor_id is null then
    raise exception 'Allocation distribusi tidak ditemukan.';
  end if;

  if allocation_investor_id <> new.investor_id then
    raise exception 'Investor proof tidak sesuai dengan allocation.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_profit_distribution_payment_proof"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "title" "text",
    "employee_ref" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "disabled_at" timestamp with time zone,
    "disabled_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "admins_disabled_consistent" CHECK ((("is_active" AND ("disabled_at" IS NULL)) OR ((NOT "is_active") AND ("disabled_at" IS NOT NULL))))
);

ALTER TABLE ONLY "public"."admins" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."admins" OWNER TO "postgres";


COMMENT ON TABLE "public"."admins" IS 'Internal staff. Created only via admins.create — there is no public admin sign-up.';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_id" "uuid",
    "actor_type" "text" DEFAULT 'system'::"text" NOT NULL,
    "actor_label" "text",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "summary" "text" DEFAULT ''::"text" NOT NULL,
    "changes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ip_hash" "text",
    "user_agent" "text",
    "correlation_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_logs_action_shape" CHECK (("action" ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'::"text")),
    CONSTRAINT "audit_logs_actor_type_valid" CHECK (("actor_type" = ANY (ARRAY['admin'::"text", 'investor'::"text", 'system'::"text", 'anonymous'::"text"]))),
    CONSTRAINT "audit_logs_changes_object" CHECK (("jsonb_typeof"("changes") = 'object'::"text"))
);

ALTER TABLE ONLY "public"."audit_logs" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Append-only. No UPDATE or DELETE path exists for any role, including Super Admin.';



CREATE TABLE IF NOT EXISTS "public"."broadcasts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject" "text" NOT NULL,
    "body_rich" "jsonb" DEFAULT '{"type": "doc", "content": []}'::"jsonb" NOT NULL,
    "audience" "public"."broadcast_audience" NOT NULL,
    "audience_filter" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "sent_at" timestamp with time zone,
    "recipient_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "broadcasts_body_object" CHECK (("jsonb_typeof"("body_rich") = 'object'::"text")),
    CONSTRAINT "broadcasts_filter_object" CHECK (("jsonb_typeof"("audience_filter") = 'object'::"text")),
    CONSTRAINT "broadcasts_recipient_count_non_negative" CHECK (("recipient_count" >= 0)),
    CONSTRAINT "broadcasts_subject_not_blank" CHECK (("length"("btrim"("subject")) > 0))
);

ALTER TABLE ONLY "public"."broadcasts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."broadcasts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_profile_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_profile_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "status" "public"."publication_status" DEFAULT 'draft'::"public"."publication_status" NOT NULL,
    "identity" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "legal_information" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "history" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "vision" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "mission" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "leadership" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "business_overview" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "business_ecosystem" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "strategic_direction" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "milestones" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "achievements" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "statistics" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "contact" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "brand_assets" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "change_note" "text",
    "created_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_profile_versions_blocks_are_objects" CHECK ((("jsonb_typeof"("identity") = 'object'::"text") AND ("jsonb_typeof"("legal_information") = 'object'::"text") AND ("jsonb_typeof"("history") = 'object'::"text") AND ("jsonb_typeof"("vision") = 'object'::"text") AND ("jsonb_typeof"("mission") = 'object'::"text") AND ("jsonb_typeof"("leadership") = 'object'::"text") AND ("jsonb_typeof"("business_overview") = 'object'::"text") AND ("jsonb_typeof"("business_ecosystem") = 'object'::"text") AND ("jsonb_typeof"("strategic_direction") = 'object'::"text") AND ("jsonb_typeof"("milestones") = 'object'::"text") AND ("jsonb_typeof"("achievements") = 'object'::"text") AND ("jsonb_typeof"("statistics") = 'object'::"text") AND ("jsonb_typeof"("contact") = 'object'::"text") AND ("jsonb_typeof"("brand_assets") = 'object'::"text"))),
    CONSTRAINT "company_profile_versions_number_positive" CHECK (("version_number" > 0)),
    CONSTRAINT "company_profile_versions_published_has_timestamp" CHECK ((("status" <> 'published'::"public"."publication_status") OR ("published_at" IS NOT NULL)))
);

ALTER TABLE ONLY "public"."company_profile_versions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_profile_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" DEFAULT 'nuzultrip'::"text" NOT NULL,
    "legal_name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "status" "public"."publication_status" DEFAULT 'draft'::"public"."publication_status" NOT NULL,
    "current_version_id" "uuid",
    "published_version_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "company_profiles_legal_name_not_blank" CHECK (("length"("btrim"("legal_name")) > 0)),
    CONSTRAINT "company_profiles_published_has_version" CHECK ((("status" <> 'published'::"public"."publication_status") OR ("published_version_id" IS NOT NULL)))
);

ALTER TABLE ONLY "public"."company_profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" character varying(200),
    "email" character varying(200),
    "phone" character varying(50),
    "subject" character varying(255),
    "message" "text",
    "status" character varying(30) DEFAULT 'new'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."contact_messages" REPLICA IDENTITY FULL;


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."data_room_access_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investor_id" "uuid",
    "token_id" "uuid",
    "document_id" "uuid",
    "action" character varying(50) NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."data_room_access_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_room_access_logs" IS 'Protected investor Data Room access audit log. Access exclusively through server Edge Functions.';



CREATE TABLE IF NOT EXISTS "public"."data_room_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(200),
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."data_room_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_room_categories" IS 'Protected investor Data Room categories. Access exclusively through server Edge Functions.';



CREATE TABLE IF NOT EXISTS "public"."data_room_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid",
    "title" character varying(255),
    "description" "text",
    "file_name" character varying(255),
    "file_url" "text",
    "file_size" bigint,
    "mime_type" character varying(100),
    "visibility" character varying(30) DEFAULT 'private'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "content" "jsonb" DEFAULT '{"sections": []}'::"jsonb" NOT NULL,
    "pages" integer DEFAULT 0 NOT NULL,
    "cover_image_url" "text",
    "embed_url" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."data_room_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_room_documents" IS 'Protected investor Data Room documents. Access exclusively through server Edge Functions and investor-token verification.';



COMMENT ON COLUMN "public"."data_room_documents"."content" IS 'Structured Data Room document content rendered by Admin and Investor Portal.';



COMMENT ON COLUMN "public"."data_room_documents"."cover_image_url" IS 'Optional document cover image.';



COMMENT ON COLUMN "public"."data_room_documents"."embed_url" IS 'Optional external embed reference. Must never bypass investor authorization for protected files.';



CREATE TABLE IF NOT EXISTS "public"."document_access_grants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    "revoked_by" "uuid",
    "note" "text",
    CONSTRAINT "document_access_grants_revoked_consistent" CHECK ((("revoked_at" IS NULL) = ("revoked_by" IS NULL)))
);

ALTER TABLE ONLY "public"."document_access_grants" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_access_grants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "title" "text" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "file_asset_id" "uuid",
    "change_note" "text",
    "status" "public"."publication_status" DEFAULT 'draft'::"public"."publication_status" NOT NULL,
    "created_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "document_versions_approved_consistent" CHECK ((("approved_at" IS NULL) = ("approved_by" IS NULL))),
    CONSTRAINT "document_versions_content_object" CHECK (("jsonb_typeof"("content") = 'object'::"text")),
    CONSTRAINT "document_versions_number_positive" CHECK (("version_number" > 0)),
    CONSTRAINT "document_versions_published_has_timestamp" CHECK ((("status" <> 'published'::"public"."publication_status") OR ("published_at" IS NOT NULL)))
);

ALTER TABLE ONLY "public"."document_versions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_versions" OWNER TO "postgres";


COMMENT ON TABLE "public"."document_versions" IS 'Immutable once published. Corrections create a new version, never an edit.';



CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kind" "public"."document_kind" NOT NULL,
    "title" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "summary" "text",
    "visibility" "public"."visibility" DEFAULT 'internal'::"public"."visibility" NOT NULL,
    "status" "public"."publication_status" DEFAULT 'draft'::"public"."publication_status" NOT NULL,
    "current_version_id" "uuid",
    "published_version_id" "uuid",
    "owner_admin_id" "uuid",
    "archived_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "documents_archived_consistent" CHECK ((("status" = 'archived'::"public"."publication_status") = ("archived_at" IS NOT NULL))),
    CONSTRAINT "documents_published_has_version" CHECK ((("status" <> 'published'::"public"."publication_status") OR ("published_version_id" IS NOT NULL))),
    CONSTRAINT "documents_slug_shape" CHECK (("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text")),
    CONSTRAINT "documents_title_not_blank" CHECK (("length"("btrim"("title")) > 0))
);

ALTER TABLE ONLY "public"."documents" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."documents" IS 'Document container: identity, visibility, and pointers to its current and published versions.';



CREATE TABLE IF NOT EXISTS "public"."financial_kpis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "financial_report_version_id" "uuid" NOT NULL,
    "kpi_key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "value" numeric(20,4) NOT NULL,
    "unit" "text" DEFAULT 'ratio'::"text" NOT NULL,
    "basis" "text" DEFAULT 'reported'::"text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "financial_kpis_basis_valid" CHECK (("basis" = ANY (ARRAY['reported'::"text", 'derived'::"text"]))),
    CONSTRAINT "financial_kpis_key_shape" CHECK (("kpi_key" ~ '^[a-z][a-z0-9_]*$'::"text")),
    CONSTRAINT "financial_kpis_unit_valid" CHECK (("unit" = ANY (ARRAY['ratio'::"text", 'percent'::"text", 'currency'::"text", 'count'::"text", 'days'::"text"])))
);

ALTER TABLE ONLY "public"."financial_kpis" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_kpis" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_line_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "financial_report_version_id" "uuid" NOT NULL,
    "statement" "public"."financial_statement" NOT NULL,
    "category" "public"."financial_category" NOT NULL,
    "line_key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "amount" numeric(20,2) NOT NULL,
    "currency" character(3) DEFAULT 'IDR'::"bpchar" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "parent_id" "uuid",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "financial_line_items_category_matches_statement" CHECK (
CASE "statement"
    WHEN 'income'::"public"."financial_statement" THEN ("category" = ANY (ARRAY['revenue'::"public"."financial_category", 'expense'::"public"."financial_category"]))
    WHEN 'balance'::"public"."financial_statement" THEN ("category" = ANY (ARRAY['asset'::"public"."financial_category", 'liability'::"public"."financial_category", 'equity'::"public"."financial_category"]))
    WHEN 'cash_flow'::"public"."financial_statement" THEN ("category" = ANY (ARRAY['operating'::"public"."financial_category", 'investing'::"public"."financial_category", 'financing'::"public"."financial_category"]))
    ELSE NULL::boolean
END),
    CONSTRAINT "financial_line_items_currency_iso" CHECK (("currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "financial_line_items_key_shape" CHECK (("line_key" ~ '^[a-z][a-z0-9_]*$'::"text")),
    CONSTRAINT "financial_line_items_label_not_blank" CHECK (("length"("btrim"("label")) > 0)),
    CONSTRAINT "financial_line_items_not_own_parent" CHECK (("parent_id" IS DISTINCT FROM "id"))
);

ALTER TABLE ONLY "public"."financial_line_items" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_line_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."financial_line_items" IS 'Normalised figures for querying and charting. Totals and margins are derived at read time, never stored.';



CREATE TABLE IF NOT EXISTS "public"."financial_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "period_type" "public"."period_type" NOT NULL,
    "fiscal_year" integer NOT NULL,
    "period_index" integer NOT NULL,
    "starts_on" "date" NOT NULL,
    "ends_on" "date" NOT NULL,
    "currency" character(3) DEFAULT 'IDR'::"bpchar" NOT NULL,
    "status" "public"."period_status" DEFAULT 'open'::"public"."period_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "financial_periods_currency_iso" CHECK (("currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "financial_periods_index_matches_type" CHECK (
CASE "period_type"
    WHEN 'monthly'::"public"."period_type" THEN (("period_index" >= 1) AND ("period_index" <= 12))
    WHEN 'quarterly'::"public"."period_type" THEN (("period_index" >= 1) AND ("period_index" <= 4))
    WHEN 'yearly'::"public"."period_type" THEN ("period_index" = 1)
    ELSE NULL::boolean
END),
    CONSTRAINT "financial_periods_range" CHECK (("ends_on" >= "starts_on")),
    CONSTRAINT "financial_periods_year_sane" CHECK ((("fiscal_year" >= 2000) AND ("fiscal_year" <= 2200)))
);

ALTER TABLE ONLY "public"."financial_periods" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_periods" OWNER TO "postgres";


COMMENT ON TABLE "public"."financial_periods" IS 'Reporting periods. A locked period accepts no new report versions.';



CREATE TABLE IF NOT EXISTS "public"."financial_report_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "financial_report_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "status" "public"."publication_status" DEFAULT 'draft'::"public"."publication_status" NOT NULL,
    "source" "public"."financial_source" NOT NULL,
    "prepared_by" "text",
    "notes" "text",
    "document_asset_id" "uuid",
    "change_note" "text",
    "created_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "financial_report_versions_number_positive" CHECK (("version_number" > 0)),
    CONSTRAINT "financial_report_versions_published_has_timestamp" CHECK ((("status" <> 'published'::"public"."publication_status") OR ("published_at" IS NOT NULL)))
);

ALTER TABLE ONLY "public"."financial_report_versions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_report_versions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."financial_report_versions"."source" IS 'Provenance: internal management reporting, limited review, or independent audit. Always shown to investors.';



CREATE TABLE IF NOT EXISTS "public"."financial_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "financial_period_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "summary" "text",
    "visibility" "public"."visibility" DEFAULT 'investors'::"public"."visibility" NOT NULL,
    "status" "public"."publication_status" DEFAULT 'draft'::"public"."publication_status" NOT NULL,
    "current_version_id" "uuid",
    "published_version_id" "uuid",
    "owner_admin_id" "uuid",
    "archived_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "financial_reports_not_public" CHECK (("visibility" <> 'public'::"public"."visibility")),
    CONSTRAINT "financial_reports_published_has_version" CHECK ((("status" <> 'published'::"public"."publication_status") OR ("published_version_id" IS NOT NULL))),
    CONSTRAINT "financial_reports_title_not_blank" CHECK (("length"("btrim"("title")) > 0))
);

ALTER TABLE ONLY "public"."financial_reports" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_reports" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."investor_reference_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."investor_reference_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investor_requests" (
    "id" "text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "company" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "country" "text" NOT NULL,
    "amount" "text" NOT NULL,
    "nda_signed" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "token" "text",
    "token_expires_at" timestamp with time zone,
    "access_link" "text",
    "approved_at" timestamp with time zone,
    "approved_by" "text",
    "approval_note" "text",
    "rejected_at" timestamp with time zone,
    "rejection_reason" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "investor_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);

ALTER TABLE ONLY "public"."investor_requests" REPLICA IDENTITY FULL;


ALTER TABLE "public"."investor_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investor_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "from_status" "public"."investor_status",
    "to_status" "public"."investor_status" NOT NULL,
    "changed_by" "uuid",
    "changed_by_label" "text",
    "reason" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "investor_status_history_metadata_object" CHECK (("jsonb_typeof"("metadata") = 'object'::"text"))
);

ALTER TABLE ONLY "public"."investor_status_history" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."investor_status_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."investor_status_history" IS 'Append-only lifecycle audit. Written by trigger on every status change.';



CREATE TABLE IF NOT EXISTS "public"."investor_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "token" character varying(100) NOT NULL,
    "period" character varying(20),
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "investor_name" "text",
    "investor_email" "text"
);


ALTER TABLE "public"."investor_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."investors" (
    "id" "uuid" NOT NULL,
    "reference_code" "text" NOT NULL,
    "status" "public"."investor_status" DEFAULT 'prospective'::"public"."investor_status" NOT NULL,
    "investor_type" "public"."investor_type" DEFAULT 'individual'::"public"."investor_type" NOT NULL,
    "legal_name" "text" NOT NULL,
    "identity_number_hash" "text",
    "country" "text" DEFAULT 'ID'::"text" NOT NULL,
    "city" "text",
    "address" "text",
    "organization_name" "text",
    "organization_role" "text",
    "application_note" "text",
    "rejection_reason" "text",
    "relationship_manager_id" "uuid",
    "applied_at" timestamp with time zone,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "approved_at" timestamp with time zone,
    "activated_at" timestamp with time zone,
    "deactivated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "whatsapp_number" "text",
    "bank_name" "text",
    "bank_account_name" "text",
    "bank_account_number" "text",
    "ktp_storage_bucket" "text",
    "ktp_storage_path" "text",
    "ktp_original_file_name" "text",
    "ktp_mime_type" "text",
    "ktp_file_size_bytes" bigint,
    "ktp_uploaded_at" timestamp with time zone,
    CONSTRAINT "investors_bank_account_name_not_blank" CHECK ((("bank_account_name" IS NULL) OR ("length"("btrim"("bank_account_name")) > 0))),
    CONSTRAINT "investors_bank_account_number_not_blank" CHECK ((("bank_account_number" IS NULL) OR ("length"("btrim"("bank_account_number")) > 0))),
    CONSTRAINT "investors_bank_name_not_blank" CHECK ((("bank_name" IS NULL) OR ("length"("btrim"("bank_name")) > 0))),
    CONSTRAINT "investors_country_iso" CHECK (("country" ~ '^[A-Z]{2}$'::"text")),
    CONSTRAINT "investors_institution_has_organization" CHECK ((("investor_type" <> 'institution'::"public"."investor_type") OR ("length"("btrim"(COALESCE("organization_name", ''::"text"))) > 0))),
    CONSTRAINT "investors_ktp_file_size_valid" CHECK ((("ktp_file_size_bytes" IS NULL) OR (("ktp_file_size_bytes" > 0) AND ("ktp_file_size_bytes" <= 10485760)))),
    CONSTRAINT "investors_ktp_metadata_complete" CHECK (((("ktp_storage_path" IS NULL) AND ("ktp_original_file_name" IS NULL) AND ("ktp_mime_type" IS NULL) AND ("ktp_file_size_bytes" IS NULL) AND ("ktp_uploaded_at" IS NULL)) OR (("ktp_storage_path" IS NOT NULL) AND ("ktp_original_file_name" IS NOT NULL) AND ("ktp_mime_type" IS NOT NULL) AND ("ktp_file_size_bytes" IS NOT NULL) AND ("ktp_uploaded_at" IS NOT NULL)))),
    CONSTRAINT "investors_ktp_mime_type_valid" CHECK ((("ktp_mime_type" IS NULL) OR ("ktp_mime_type" = ANY (ARRAY['image/jpeg'::"text", 'image/png'::"text", 'image/webp'::"text", 'application/pdf'::"text"])))),
    CONSTRAINT "investors_ktp_storage_bucket_valid" CHECK ((("ktp_storage_bucket" IS NULL) OR ("ktp_storage_bucket" = 'investor-documents'::"text"))),
    CONSTRAINT "investors_legal_name_not_blank" CHECK (("length"("btrim"("legal_name")) > 0)),
    CONSTRAINT "investors_rejected_has_reason" CHECK ((("status" <> 'rejected'::"public"."investor_status") OR ("length"("btrim"(COALESCE("rejection_reason", ''::"text"))) > 0))),
    CONSTRAINT "investors_whatsapp_number_not_blank" CHECK ((("whatsapp_number" IS NULL) OR ("length"("btrim"("whatsapp_number")) > 0)))
);

ALTER TABLE ONLY "public"."investors" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."investors" OWNER TO "postgres";


COMMENT ON TABLE "public"."investors" IS 'Investor records. Never hard-deleted — deactivated instead, so history survives.';



CREATE TABLE IF NOT EXISTS "public"."kv_store_b620c355" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);


ALTER TABLE "public"."kv_store_b620c355" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."legacy_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module" character varying(100),
    "action" character varying(100),
    "user_name" character varying(200),
    "description" "text",
    "ip_address" character varying(100),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."legacy_audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."legacy_investor_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "from_status" "text",
    "to_status" "text" NOT NULL,
    "reason" "text",
    "note" "text",
    "actor_id" "text",
    "actor_type" "text" DEFAULT 'admin'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."legacy_investor_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."legacy_investors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" character varying(200) NOT NULL,
    "email" character varying(200) NOT NULL,
    "phone" character varying(50),
    "company" character varying(200),
    "city" character varying(100),
    "country" character varying(100),
    "investment_interest" "text",
    "status" character varying(30) DEFAULT 'pending'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "verified_at" timestamp with time zone,
    "verified_by" "text",
    "rejection_reason" "text"
);

ALTER TABLE ONLY "public"."legacy_investors" REPLICA IDENTITY FULL;


ALTER TABLE "public"."legacy_investors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket" "text" NOT NULL,
    "path" "text" NOT NULL,
    "original_filename" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "byte_size" bigint NOT NULL,
    "checksum_sha256" "text",
    "width" integer,
    "height" integer,
    "duration_ms" integer,
    "visibility" "public"."asset_visibility" DEFAULT 'internal'::"public"."asset_visibility" NOT NULL,
    "alt_text" "text",
    "caption" "text",
    "uploaded_by" "uuid",
    "finalized_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "media_assets_byte_size_capped" CHECK (("byte_size" <= 104857600)),
    CONSTRAINT "media_assets_byte_size_positive" CHECK (("byte_size" > 0)),
    CONSTRAINT "media_assets_dimensions_positive" CHECK (((("width" IS NULL) OR ("width" > 0)) AND (("height" IS NULL) OR ("height" > 0)))),
    CONSTRAINT "media_assets_mime_shape" CHECK (("mime_type" ~ '^[a-z]+/[a-zA-Z0-9.+-]+$'::"text")),
    CONSTRAINT "media_assets_no_svg" CHECK (("mime_type" <> 'image/svg+xml'::"text"))
);

ALTER TABLE ONLY "public"."media_assets" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_assets" OWNER TO "postgres";


COMMENT ON TABLE "public"."media_assets" IS 'Metadata for objects in Supabase Storage. Never stores file bytes.';



CREATE TABLE IF NOT EXISTS "public"."meeting_bookings" (
    "id" "text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "company" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "type" "text" NOT NULL,
    "date_label" "text" NOT NULL,
    "time_label" "text" NOT NULL,
    "confirmation_code" "text" NOT NULL,
    "message" "text" DEFAULT ''::"text" NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "meeting_bookings_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'done'::"text", 'cancelled'::"text"])))
);

ALTER TABLE ONLY "public"."meeting_bookings" REPLICA IDENTITY FULL;


ALTER TABLE "public"."meeting_bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meetings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "investor_id" "uuid",
    "meeting_date" timestamp with time zone,
    "meeting_type" character varying(50),
    "location" character varying(255),
    "meeting_link" "text",
    "status" character varying(50),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meetings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "media_asset_id" "uuid" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY "public"."message_attachments" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reads" (
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."message_reads" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject" "text" NOT NULL,
    "thread_kind" "public"."thread_kind" DEFAULT 'investor_admin'::"public"."thread_kind" NOT NULL,
    "investor_id" "uuid",
    "broadcast_id" "uuid",
    "created_by" "uuid",
    "last_message_at" timestamp with time zone,
    "is_closed" boolean DEFAULT false NOT NULL,
    "closed_at" timestamp with time zone,
    "closed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "message_threads_closed_consistent" CHECK (("is_closed" = ("closed_at" IS NOT NULL))),
    CONSTRAINT "message_threads_investor_present" CHECK ((("thread_kind" <> 'investor_admin'::"public"."thread_kind") OR ("investor_id" IS NOT NULL))),
    CONSTRAINT "message_threads_subject_not_blank" CHECK (("length"("btrim"("subject")) > 0))
);

ALTER TABLE ONLY "public"."message_threads" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_threads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "sender_label" "text",
    "body_text" "text" NOT NULL,
    "body_rich" "jsonb" DEFAULT '{"type": "doc", "content": []}'::"jsonb" NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "edited_at" timestamp with time zone,
    CONSTRAINT "messages_body_length" CHECK (("length"("body_text") <= 20000)),
    CONSTRAINT "messages_body_not_blank" CHECK (("length"("btrim"("body_text")) > 0)),
    CONSTRAINT "messages_body_rich_object" CHECK (("jsonb_typeof"("body_rich") = 'object'::"text"))
);

ALTER TABLE ONLY "public"."messages" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_id" "uuid" NOT NULL,
    "channel" "public"."delivery_channel" NOT NULL,
    "status" "public"."delivery_status" DEFAULT 'pending'::"public"."delivery_status" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "scheduled_for" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notification_deliveries_attempts_non_negative" CHECK (("attempts" >= 0)),
    CONSTRAINT "notification_deliveries_sent_consistent" CHECK ((("status" = 'sent'::"public"."delivery_status") = ("sent_at" IS NOT NULL)))
);

ALTER TABLE ONLY "public"."notification_deliveries" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_deliveries" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_deliveries" IS 'Outbox for external channels. Drained by a worker; never sent inline during a request.';



CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "user_id" "uuid" NOT NULL,
    "kind" "public"."notification_kind" NOT NULL,
    "in_app" boolean DEFAULT true NOT NULL,
    "email" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."notification_preferences" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "kind" "public"."notification_kind" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" DEFAULT ''::"text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "action_url" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_action_url_internal" CHECK ((("action_url" IS NULL) OR ("action_url" ~ '^/'::"text"))),
    CONSTRAINT "notifications_payload_object" CHECK (("jsonb_typeof"("payload") = 'object'::"text")),
    CONSTRAINT "notifications_title_not_blank" CHECK (("length"("btrim"("title")) > 0))
);

ALTER TABLE ONLY "public"."notifications" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ownership_holdings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "offering_id" "uuid" NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "units" integer NOT NULL,
    "ownership_bps" integer NOT NULL,
    "acquisition_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "transfer_eligible_at" timestamp with time zone NOT NULL,
    "status" "public"."ownership_holding_status" DEFAULT 'reserved'::"public"."ownership_holding_status" NOT NULL,
    "acquisition_reference" "text",
    "notes" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ownership_holdings_ownership_positive" CHECK (("ownership_bps" > 0)),
    CONSTRAINT "ownership_holdings_transfer_date" CHECK (("transfer_eligible_at" >= "acquisition_at")),
    CONSTRAINT "ownership_holdings_units_positive" CHECK (("units" > 0))
);


ALTER TABLE "public"."ownership_holdings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ownership_inheritance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "holding_id" "uuid" NOT NULL,
    "current_investor_id" "uuid" NOT NULL,
    "beneficiary_name" "text" NOT NULL,
    "beneficiary_email" "text",
    "beneficiary_phone" "text",
    "units" integer NOT NULL,
    "status" "public"."ownership_inheritance_status" DEFAULT 'pending'::"public"."ownership_inheritance_status" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "completed_at" timestamp with time zone,
    "rejection_reason" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ownership_inheritance_beneficiary_not_blank" CHECK (("length"("btrim"("beneficiary_name")) > 0)),
    CONSTRAINT "ownership_inheritance_rejection_reason" CHECK ((("status" <> 'rejected'::"public"."ownership_inheritance_status") OR ("length"("btrim"(COALESCE("rejection_reason", ''::"text"))) > 0))),
    CONSTRAINT "ownership_inheritance_units_positive" CHECK (("units" > 0))
);


ALTER TABLE "public"."ownership_inheritance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ownership_offerings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "status" "public"."ownership_offering_status" DEFAULT 'draft'::"public"."ownership_offering_status" NOT NULL,
    "total_offered_bps" integer NOT NULL,
    "unit_ownership_bps" integer NOT NULL,
    "unit_price" numeric(20,2) NOT NULL,
    "total_units" integer NOT NULL,
    "distribution_cadence_months" smallint DEFAULT 6 NOT NULL,
    "transfer_lock_months" smallint DEFAULT 36 NOT NULL,
    "effective_from" timestamp with time zone,
    "effective_until" timestamp with time zone,
    "description" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ownership_offerings_cadence_valid" CHECK ((("distribution_cadence_months" >= 1) AND ("distribution_cadence_months" <= 24))),
    CONSTRAINT "ownership_offerings_code_format" CHECK (("code" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text")),
    CONSTRAINT "ownership_offerings_effective_dates" CHECK ((("effective_until" IS NULL) OR ("effective_from" IS NULL) OR ("effective_until" > "effective_from"))),
    CONSTRAINT "ownership_offerings_name_not_blank" CHECK (("length"("btrim"("name")) > 0)),
    CONSTRAINT "ownership_offerings_total_bps_positive" CHECK ((("total_offered_bps" > 0) AND ("total_offered_bps" <= 10000))),
    CONSTRAINT "ownership_offerings_transfer_lock_valid" CHECK ((("transfer_lock_months" >= 36) AND ("transfer_lock_months" <= 120))),
    CONSTRAINT "ownership_offerings_unit_bps_positive" CHECK ((("unit_ownership_bps" > 0) AND ("unit_ownership_bps" <= 10000))),
    CONSTRAINT "ownership_offerings_unit_math" CHECK (("total_offered_bps" = ("unit_ownership_bps" * "total_units"))),
    CONSTRAINT "ownership_offerings_unit_price_positive" CHECK (("unit_price" > (0)::numeric)),
    CONSTRAINT "ownership_offerings_units_positive" CHECK (("total_units" > 0))
);


ALTER TABLE "public"."ownership_offerings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ownership_transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "holding_id" "uuid" NOT NULL,
    "from_investor_id" "uuid" NOT NULL,
    "to_investor_id" "uuid",
    "units" integer NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "eligible_at" timestamp with time zone NOT NULL,
    "status" "public"."ownership_transfer_status" DEFAULT 'pending'::"public"."ownership_transfer_status" NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "completed_at" timestamp with time zone,
    "rejection_reason" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ownership_transfers_different_investors" CHECK ((("to_investor_id" IS NULL) OR ("from_investor_id" <> "to_investor_id"))),
    CONSTRAINT "ownership_transfers_rejection_reason" CHECK ((("status" <> 'rejected'::"public"."ownership_transfer_status") OR ("length"("btrim"(COALESCE("rejection_reason", ''::"text"))) > 0))),
    CONSTRAINT "ownership_transfers_units_positive" CHECK (("units" > 0))
);


ALTER TABLE "public"."ownership_transfers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "module" "text" NOT NULL,
    "action" "text" NOT NULL,
    "description" "text" NOT NULL,
    "is_dangerous" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "permissions_action_shape" CHECK (("action" ~ '^[a-z][a-z0-9_]*$'::"text")),
    CONSTRAINT "permissions_key_shape" CHECK (("key" = (("module" || '.'::"text") || "action"))),
    CONSTRAINT "permissions_module_shape" CHECK (("module" ~ '^[a-z][a-z0-9_]*$'::"text"))
);

ALTER TABLE ONLY "public"."permissions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."permissions" IS 'Atomic capabilities, keyed module.action. Reference data — mirrored by src/core/rbac/permissions.ts.';



CREATE TABLE IF NOT EXISTS "public"."portal_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "page" character varying(100) NOT NULL,
    "section" character varying(100) NOT NULL,
    "title" character varying(255),
    "slug" character varying(255),
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" character varying(30) DEFAULT 'draft'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."portal_content" REPLICA IDENTITY FULL;


ALTER TABLE "public"."portal_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_inquiries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "organization" "text",
    "message" "text" NOT NULL,
    "source_page" "text",
    "ip_hash" "text",
    "user_agent" "text",
    "status" "public"."inquiry_status" DEFAULT 'new'::"public"."inquiry_status" NOT NULL,
    "handled_by" "uuid",
    "handled_at" timestamp with time zone,
    "converted_investor_id" "uuid",
    "thread_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "portal_inquiries_email_format" CHECK (("email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::"text")),
    CONSTRAINT "portal_inquiries_email_lowercase" CHECK (("email" = "lower"("email"))),
    CONSTRAINT "portal_inquiries_message_length" CHECK ((("length"("btrim"("message")) >= 1) AND ("length"("btrim"("message")) <= 5000))),
    CONSTRAINT "portal_inquiries_name_length" CHECK ((("length"("btrim"("name")) >= 1) AND ("length"("btrim"("name")) <= 200))),
    CONSTRAINT "portal_inquiries_organization_length" CHECK ((("organization" IS NULL) OR ("length"("organization") <= 200)))
);

ALTER TABLE ONLY "public"."portal_inquiries" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_inquiries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_navigation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location" "public"."nav_location" NOT NULL,
    "label" "text" NOT NULL,
    "href" "text" NOT NULL,
    "target" "text" DEFAULT '_self'::"text" NOT NULL,
    "icon" "text",
    "position" integer DEFAULT 0 NOT NULL,
    "parent_id" "uuid",
    "is_visible" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "portal_navigation_href_safe" CHECK (("href" ~ '^(/|#|https://|mailto:|tel:)'::"text")),
    CONSTRAINT "portal_navigation_label_not_blank" CHECK (("length"("btrim"("label")) > 0)),
    CONSTRAINT "portal_navigation_not_own_parent" CHECK (("parent_id" IS DISTINCT FROM "id")),
    CONSTRAINT "portal_navigation_target_valid" CHECK (("target" = ANY (ARRAY['_self'::"text", '_blank'::"text"])))
);

ALTER TABLE ONLY "public"."portal_navigation" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_navigation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "page_kind" "public"."page_kind" DEFAULT 'standard'::"public"."page_kind" NOT NULL,
    "status" "public"."publication_status" DEFAULT 'draft'::"public"."publication_status" NOT NULL,
    "seo" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "portal_pages_published_has_timestamp" CHECK ((("status" <> 'published'::"public"."publication_status") OR ("published_at" IS NOT NULL))),
    CONSTRAINT "portal_pages_seo_object" CHECK (("jsonb_typeof"("seo") = 'object'::"text")),
    CONSTRAINT "portal_pages_slug_shape" CHECK ((("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text") OR ("slug" = 'home'::"text"))),
    CONSTRAINT "portal_pages_title_not_blank" CHECK (("length"("btrim"("title")) > 0))
);

ALTER TABLE ONLY "public"."portal_pages" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_section_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "version_number" integer NOT NULL,
    "status" "public"."publication_status" DEFAULT 'draft'::"public"."publication_status" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "change_note" "text",
    "created_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "portal_section_versions_content_object" CHECK (("jsonb_typeof"("content") = 'object'::"text")),
    CONSTRAINT "portal_section_versions_number_positive" CHECK (("version_number" > 0)),
    CONSTRAINT "portal_section_versions_published_has_timestamp" CHECK ((("status" <> 'published'::"public"."publication_status") OR ("published_at" IS NOT NULL)))
);

ALTER TABLE ONLY "public"."portal_section_versions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_section_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "page_id" "uuid" NOT NULL,
    "section_kind" "public"."section_kind" NOT NULL,
    "position" integer NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL,
    "anchor_id" "text",
    "status" "public"."publication_status" DEFAULT 'draft'::"public"."publication_status" NOT NULL,
    "current_version_id" "uuid",
    "published_version_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "portal_sections_anchor_shape" CHECK ((("anchor_id" IS NULL) OR ("anchor_id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::"text"))),
    CONSTRAINT "portal_sections_position_non_negative" CHECK (("position" >= 0)),
    CONSTRAINT "portal_sections_published_has_version" CHECK ((("status" <> 'published'::"public"."publication_status") OR ("published_version_id" IS NOT NULL)))
);

ALTER TABLE ONLY "public"."portal_sections" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portal_theme" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "logo_asset_id" "uuid",
    "logo_dark_asset_id" "uuid",
    "favicon_asset_id" "uuid",
    "og_image_asset_id" "uuid",
    "color_overrides" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "radius_preset" "text" DEFAULT 'balanced'::"text" NOT NULL,
    "typography_preset" "text" DEFAULT 'mizan'::"text" NOT NULL,
    "default_color_scheme" "text" DEFAULT 'system'::"text" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "portal_theme_color_overrides_object" CHECK (("jsonb_typeof"("color_overrides") = 'object'::"text")),
    CONSTRAINT "portal_theme_name_not_blank" CHECK (("length"("btrim"("name")) > 0)),
    CONSTRAINT "portal_theme_radius_valid" CHECK (("radius_preset" = ANY (ARRAY['sharp'::"text", 'balanced'::"text", 'soft'::"text"]))),
    CONSTRAINT "portal_theme_scheme_valid" CHECK (("default_color_scheme" = ANY (ARRAY['light'::"text", 'dark'::"text", 'system'::"text"]))),
    CONSTRAINT "portal_theme_typography_valid" CHECK (("typography_preset" = ANY (ARRAY['mizan'::"text", 'compact'::"text"])))
);

ALTER TABLE ONLY "public"."portal_theme" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."portal_theme" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profit_distribution_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "distribution_id" "uuid" NOT NULL,
    "holding_id" "uuid" NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "ownership_bps" integer NOT NULL,
    "investor_pool_share_bps" integer NOT NULL,
    "allocation_amount" numeric(20,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "paid_at" timestamp with time zone,
    "payment_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "distribution_allocations_amount_nonnegative" CHECK (("allocation_amount" >= (0)::numeric)),
    CONSTRAINT "distribution_allocations_ownership_positive" CHECK (("ownership_bps" > 0)),
    CONSTRAINT "distribution_allocations_pool_share_nonnegative" CHECK (("investor_pool_share_bps" >= 0)),
    CONSTRAINT "distribution_allocations_status_valid" CHECK (("status" = ANY (ARRAY['pending'::"text", 'payable'::"text", 'paid'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."profit_distribution_allocations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profit_distribution_payment_proofs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "allocation_id" "uuid" NOT NULL,
    "investor_id" "uuid" NOT NULL,
    "storage_bucket" "text" DEFAULT 'profit-distribution-proofs'::"text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "original_file_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "file_size_bytes" bigint NOT NULL,
    "payment_reference" "text",
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_proofs_file_name_not_blank" CHECK (("length"("btrim"("original_file_name")) > 0)),
    CONSTRAINT "payment_proofs_file_size_positive" CHECK ((("file_size_bytes" > 0) AND ("file_size_bytes" <= 10485760))),
    CONSTRAINT "payment_proofs_mime_type_allowed" CHECK (("mime_type" = ANY (ARRAY['application/pdf'::"text", 'image/jpeg'::"text", 'image/png'::"text", 'image/webp'::"text"]))),
    CONSTRAINT "payment_proofs_storage_path_not_blank" CHECK (("length"("btrim"("storage_path")) > 0))
);


ALTER TABLE "public"."profit_distribution_payment_proofs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profit_distributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "offering_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "revenue_amount" numeric(20,2) DEFAULT 0 NOT NULL,
    "opex_amount" numeric(20,2) DEFAULT 0 NOT NULL,
    "profit_amount" numeric(20,2) DEFAULT 0 NOT NULL,
    "company_share_bps" integer DEFAULT 6000 NOT NULL,
    "investor_pool_bps" integer DEFAULT 4000 NOT NULL,
    "investor_pool_amount" numeric(20,2) DEFAULT 0 NOT NULL,
    "status" "public"."profit_distribution_status" DEFAULT 'draft'::"public"."profit_distribution_status" NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "paid_at" timestamp with time zone,
    "notes" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profit_distributions_company_share_valid" CHECK ((("company_share_bps" >= 0) AND ("company_share_bps" <= 10000))),
    CONSTRAINT "profit_distributions_investor_pool_valid" CHECK ((("investor_pool_bps" >= 0) AND ("investor_pool_bps" <= 10000))),
    CONSTRAINT "profit_distributions_opex_nonnegative" CHECK (("opex_amount" >= (0)::numeric)),
    CONSTRAINT "profit_distributions_period_valid" CHECK (("period_end" >= "period_start")),
    CONSTRAINT "profit_distributions_pool_nonnegative" CHECK (("investor_pool_amount" >= (0)::numeric)),
    CONSTRAINT "profit_distributions_profit_nonnegative" CHECK (("profit_amount" >= (0)::numeric)),
    CONSTRAINT "profit_distributions_revenue_nonnegative" CHECK (("revenue_amount" >= (0)::numeric)),
    CONSTRAINT "profit_distributions_split_valid" CHECK ((("company_share_bps" + "investor_pool_bps") = 10000))
);


ALTER TABLE "public"."profit_distributions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "bucket" "text" NOT NULL,
    "hits" integer DEFAULT 0 NOT NULL,
    "window_started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rate_limits_hits_non_negative" CHECK (("hits" >= 0))
);

ALTER TABLE ONLY "public"."rate_limits" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


COMMENT ON TABLE "public"."rate_limits" IS 'Fixed-window counters. Service-role only; never exposed to clients.';



CREATE TABLE IF NOT EXISTS "public"."realtime_emit_failures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "error_message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."realtime_emit_failures" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."realtime_emit_failures" OWNER TO "postgres";


COMMENT ON TABLE "public"."realtime_emit_failures" IS 'Events that could not be broadcast. Losing a notification is recoverable; losing the transaction is not.';



CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."role_permissions" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."role_permissions" IS 'Explicit RBAC grants for non-Super-Admin roles. Super Admin receives all permissions through app.has_permission().';



CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "permission_version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "roles_key_shape" CHECK (("key" ~ '^[a-z][a-z0-9_]*$'::"text")),
    CONSTRAINT "roles_name_not_blank" CHECK (("length"("btrim"("name")) > 0))
);

ALTER TABLE ONLY "public"."roles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" OWNER TO "postgres";


COMMENT ON TABLE "public"."roles" IS 'A named set of permissions. An admin holds exactly one.';



COMMENT ON COLUMN "public"."roles"."permission_version" IS 'Incremented on any change to this role''s permission set; drives client token refresh.';



CREATE TABLE IF NOT EXISTS "public"."settings" (
    "key" character varying(150) NOT NULL,
    "value" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    CONSTRAINT "site_settings_key_shape" CHECK (("key" ~ '^[a-z][a-z0-9_.]*$'::"text")),
    CONSTRAINT "site_settings_value_not_null" CHECK (("value" IS NOT NULL))
);

ALTER TABLE ONLY "public"."site_settings" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."site_settings" IS 'Operational key/value configuration managed by authorized administrators.';



CREATE TABLE IF NOT EXISTS "public"."thread_participants" (
    "thread_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."participant_role" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "muted_at" timestamp with time zone
);

ALTER TABLE ONLY "public"."thread_participants" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."thread_participants" OWNER TO "postgres";


COMMENT ON TABLE "public"."thread_participants" IS 'The authorisation edge for messaging. Membership here is what grants thread access.';



CREATE TABLE IF NOT EXISTS "public"."user_accounts" (
    "id" "uuid" NOT NULL,
    "account_type" "public"."account_type" NOT NULL,
    "status" "public"."account_status" DEFAULT 'active'::"public"."account_status" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "avatar_path" "text",
    "locale" "text" DEFAULT 'id'::"text" NOT NULL,
    "timezone" "text" DEFAULT 'Asia/Jakarta'::"text" NOT NULL,
    "last_seen_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_accounts_email_format" CHECK (("email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::"text")),
    CONSTRAINT "user_accounts_email_lowercase" CHECK (("email" = "lower"("email"))),
    CONSTRAINT "user_accounts_full_name_not_blank" CHECK (("length"("btrim"("full_name")) > 0)),
    CONSTRAINT "user_accounts_locale_valid" CHECK (("locale" = ANY (ARRAY['id'::"text", 'en'::"text"])))
);

ALTER TABLE ONLY "public"."user_accounts" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_accounts" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_accounts" IS 'Domain profile for an authenticated principal. Subtype is in admins or investors.';



COMMENT ON COLUMN "public"."user_accounts"."status" IS 'Disabling takes effect on the next request because the principal is resolved from this table, not from the JWT.';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "role" "public"."app_role" DEFAULT 'ir'::"public"."app_role" NOT NULL,
    "status" "public"."user_status" DEFAULT 'active'::"public"."user_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."broadcasts"
    ADD CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_profile_versions"
    ADD CONSTRAINT "company_profile_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_profile_versions"
    ADD CONSTRAINT "company_profile_versions_unique" UNIQUE ("company_profile_id", "version_number");



ALTER TABLE ONLY "public"."company_profiles"
    ADD CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_profiles"
    ADD CONSTRAINT "company_profiles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_room_access_logs"
    ADD CONSTRAINT "data_room_access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_room_categories"
    ADD CONSTRAINT "data_room_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_room_documents"
    ADD CONSTRAINT "data_room_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_access_grants"
    ADD CONSTRAINT "document_access_grants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_versions"
    ADD CONSTRAINT "document_versions_document_number_unique" UNIQUE ("document_id", "version_number");



ALTER TABLE ONLY "public"."document_versions"
    ADD CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_kind_slug_unique" UNIQUE ("kind", "slug");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_kpis"
    ADD CONSTRAINT "financial_kpis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_kpis"
    ADD CONSTRAINT "financial_kpis_unique" UNIQUE ("financial_report_version_id", "kpi_key");



ALTER TABLE ONLY "public"."financial_line_items"
    ADD CONSTRAINT "financial_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_line_items"
    ADD CONSTRAINT "financial_line_items_unique" UNIQUE ("financial_report_version_id", "statement", "line_key");



ALTER TABLE ONLY "public"."financial_periods"
    ADD CONSTRAINT "financial_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_periods"
    ADD CONSTRAINT "financial_periods_unique" UNIQUE ("period_type", "fiscal_year", "period_index");



ALTER TABLE ONLY "public"."financial_report_versions"
    ADD CONSTRAINT "financial_report_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_report_versions"
    ADD CONSTRAINT "financial_report_versions_unique" UNIQUE ("financial_report_id", "version_number");



ALTER TABLE ONLY "public"."financial_reports"
    ADD CONSTRAINT "financial_reports_period_unique" UNIQUE ("financial_period_id");



ALTER TABLE ONLY "public"."financial_reports"
    ADD CONSTRAINT "financial_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_requests"
    ADD CONSTRAINT "investor_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_status_history"
    ADD CONSTRAINT "investor_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_tokens"
    ADD CONSTRAINT "investor_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investor_tokens"
    ADD CONSTRAINT "investor_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."investors"
    ADD CONSTRAINT "investors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."investors"
    ADD CONSTRAINT "investors_reference_code_key" UNIQUE ("reference_code");



ALTER TABLE ONLY "public"."kv_store_b620c355"
    ADD CONSTRAINT "kv_store_b620c355_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."legacy_audit_logs"
    ADD CONSTRAINT "legacy_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legacy_investor_status_history"
    ADD CONSTRAINT "legacy_investor_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legacy_investors"
    ADD CONSTRAINT "legacy_investors_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."legacy_investors"
    ADD CONSTRAINT "legacy_investors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_bucket_path_unique" UNIQUE ("bucket", "path");



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meeting_bookings"
    ADD CONSTRAINT "meeting_bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_unique" UNIQUE ("message_id", "media_asset_id");



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_pkey" PRIMARY KEY ("message_id", "user_id");



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_deliveries"
    ADD CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_deliveries"
    ADD CONSTRAINT "notification_deliveries_unique" UNIQUE ("notification_id", "channel");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id", "kind");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ownership_holdings"
    ADD CONSTRAINT "ownership_holdings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ownership_inheritance"
    ADD CONSTRAINT "ownership_inheritance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ownership_offerings"
    ADD CONSTRAINT "ownership_offerings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ownership_transfers"
    ADD CONSTRAINT "ownership_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_module_action_unique" UNIQUE ("module", "action");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_content"
    ADD CONSTRAINT "portal_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_inquiries"
    ADD CONSTRAINT "portal_inquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_navigation"
    ADD CONSTRAINT "portal_navigation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_pages"
    ADD CONSTRAINT "portal_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_pages"
    ADD CONSTRAINT "portal_pages_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."portal_section_versions"
    ADD CONSTRAINT "portal_section_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_section_versions"
    ADD CONSTRAINT "portal_section_versions_unique" UNIQUE ("section_id", "version_number");



ALTER TABLE ONLY "public"."portal_sections"
    ADD CONSTRAINT "portal_sections_page_position_unique" UNIQUE ("page_id", "position") DEFERRABLE INITIALLY DEFERRED;



ALTER TABLE ONLY "public"."portal_sections"
    ADD CONSTRAINT "portal_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_theme"
    ADD CONSTRAINT "portal_theme_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portal_content"
    ADD CONSTRAINT "portal_unique" UNIQUE ("page", "section");



ALTER TABLE ONLY "public"."profit_distribution_allocations"
    ADD CONSTRAINT "profit_distribution_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profit_distribution_payment_proofs"
    ADD CONSTRAINT "profit_distribution_payment_proofs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profit_distributions"
    ADD CONSTRAINT "profit_distributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("bucket");



ALTER TABLE ONLY "public"."realtime_emit_failures"
    ADD CONSTRAINT "realtime_emit_failures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id", "permission_id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."thread_participants"
    ADD CONSTRAINT "thread_participants_pkey" PRIMARY KEY ("thread_id", "user_id");



ALTER TABLE ONLY "public"."user_accounts"
    ADD CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "admins_active_idx" ON "public"."admins" USING "btree" ("is_active") WHERE "is_active";



CREATE INDEX "admins_role_idx" ON "public"."admins" USING "btree" ("role_id");



CREATE INDEX "audit_logs_action_idx" ON "public"."audit_logs" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "audit_logs_actor_idx" ON "public"."audit_logs" USING "btree" ("actor_id", "created_at" DESC);



CREATE INDEX "audit_logs_created_idx" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "audit_logs_entity_idx" ON "public"."audit_logs" USING "btree" ("entity_type", "entity_id", "created_at" DESC);



CREATE INDEX "broadcasts_sent_idx" ON "public"."broadcasts" USING "btree" ("sent_at" DESC);



CREATE INDEX "company_profile_versions_profile_idx" ON "public"."company_profile_versions" USING "btree" ("company_profile_id", "version_number" DESC);



CREATE UNIQUE INDEX "distribution_allocations_distribution_holding_key" ON "public"."profit_distribution_allocations" USING "btree" ("distribution_id", "holding_id");



CREATE INDEX "distribution_allocations_investor_idx" ON "public"."profit_distribution_allocations" USING "btree" ("investor_id");



CREATE INDEX "distribution_allocations_status_idx" ON "public"."profit_distribution_allocations" USING "btree" ("status");



CREATE INDEX "document_access_grants_investor_idx" ON "public"."document_access_grants" USING "btree" ("investor_id") WHERE ("revoked_at" IS NULL);



CREATE UNIQUE INDEX "document_access_grants_live_unique" ON "public"."document_access_grants" USING "btree" ("document_id", "investor_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "document_versions_asset_idx" ON "public"."document_versions" USING "btree" ("file_asset_id") WHERE ("file_asset_id" IS NOT NULL);



CREATE INDEX "document_versions_document_idx" ON "public"."document_versions" USING "btree" ("document_id", "version_number" DESC);



CREATE INDEX "documents_kind_status_idx" ON "public"."documents" USING "btree" ("kind", "status", "visibility");



CREATE INDEX "documents_owner_idx" ON "public"."documents" USING "btree" ("owner_admin_id");



CREATE INDEX "documents_published_idx" ON "public"."documents" USING "btree" ("published_version_id") WHERE ("published_version_id" IS NOT NULL);



CREATE INDEX "financial_kpis_version_idx" ON "public"."financial_kpis" USING "btree" ("financial_report_version_id", "position");



CREATE INDEX "financial_line_items_parent_idx" ON "public"."financial_line_items" USING "btree" ("parent_id") WHERE ("parent_id" IS NOT NULL);



CREATE INDEX "financial_line_items_version_idx" ON "public"."financial_line_items" USING "btree" ("financial_report_version_id", "statement", "position");



CREATE INDEX "financial_periods_lookup_idx" ON "public"."financial_periods" USING "btree" ("period_type", "fiscal_year" DESC, "period_index" DESC);



CREATE INDEX "financial_report_versions_report_idx" ON "public"."financial_report_versions" USING "btree" ("financial_report_id", "version_number" DESC);



CREATE INDEX "financial_reports_status_idx" ON "public"."financial_reports" USING "btree" ("status", "visibility");



CREATE INDEX "idx_data_room_access_logs_created" ON "public"."data_room_access_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_data_room_access_logs_document" ON "public"."data_room_access_logs" USING "btree" ("document_id");



CREATE INDEX "idx_data_room_access_logs_investor" ON "public"."data_room_access_logs" USING "btree" ("investor_id");



CREATE INDEX "idx_data_room_access_logs_token" ON "public"."data_room_access_logs" USING "btree" ("token_id");



CREATE INDEX "idx_data_room_documents_active_visibility" ON "public"."data_room_documents" USING "btree" ("is_active", "visibility");



CREATE INDEX "idx_data_room_documents_sort_order" ON "public"."data_room_documents" USING "btree" ("sort_order");



CREATE INDEX "idx_portal_page" ON "public"."portal_content" USING "btree" ("page");



CREATE INDEX "idx_portal_section" ON "public"."portal_content" USING "btree" ("section");



CREATE INDEX "investor_status_history_changed_by_idx" ON "public"."investor_status_history" USING "btree" ("changed_by") WHERE ("changed_by" IS NOT NULL);



CREATE INDEX "investor_status_history_investor_idx" ON "public"."investor_status_history" USING "btree" ("investor_id", "created_at" DESC);



CREATE INDEX "investor_tokens_expires_at_idx" ON "public"."investor_tokens" USING "btree" ("expires_at");



CREATE INDEX "investor_tokens_investor_id_idx" ON "public"."investor_tokens" USING "btree" ("investor_id");



CREATE INDEX "investor_tokens_period_idx" ON "public"."investor_tokens" USING "btree" ("period");



CREATE INDEX "investor_tokens_token_idx" ON "public"."investor_tokens" USING "btree" ("token");



CREATE INDEX "investors_legal_name_trgm_idx" ON "public"."investors" USING "gin" ("legal_name" "extensions"."gin_trgm_ops");



CREATE INDEX "investors_relationship_manager_idx" ON "public"."investors" USING "btree" ("relationship_manager_id") WHERE ("relationship_manager_id" IS NOT NULL);



CREATE INDEX "investors_status_created_idx" ON "public"."investors" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "investors_whatsapp_idx" ON "public"."investors" USING "btree" ("whatsapp_number") WHERE ("whatsapp_number" IS NOT NULL);



CREATE INDEX "kv_store_b620c355_key_idx" ON "public"."kv_store_b620c355" USING "btree" ("key" "text_pattern_ops");



CREATE INDEX "legacy_investor_status_history_created_idx" ON "public"."legacy_investor_status_history" USING "btree" ("created_at" DESC);



CREATE INDEX "legacy_investor_status_history_investor_idx" ON "public"."legacy_investor_status_history" USING "btree" ("investor_id");



CREATE INDEX "legacy_investors_status_idx" ON "public"."legacy_investors" USING "btree" ("status");



CREATE INDEX "legacy_investors_verified_at_idx" ON "public"."legacy_investors" USING "btree" ("verified_at");



CREATE INDEX "media_assets_unfinalized_idx" ON "public"."media_assets" USING "btree" ("created_at") WHERE ("finalized_at" IS NULL);



CREATE INDEX "media_assets_uploaded_by_idx" ON "public"."media_assets" USING "btree" ("uploaded_by");



CREATE INDEX "media_assets_visibility_idx" ON "public"."media_assets" USING "btree" ("visibility", "created_at" DESC);



CREATE INDEX "message_attachments_message_idx" ON "public"."message_attachments" USING "btree" ("message_id", "position");



CREATE INDEX "message_reads_user_idx" ON "public"."message_reads" USING "btree" ("user_id", "read_at" DESC);



CREATE INDEX "message_threads_investor_idx" ON "public"."message_threads" USING "btree" ("investor_id", "last_message_at" DESC NULLS LAST);



CREATE INDEX "message_threads_recent_idx" ON "public"."message_threads" USING "btree" ("last_message_at" DESC NULLS LAST);



CREATE INDEX "messages_sender_idx" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "messages_thread_idx" ON "public"."messages" USING "btree" ("thread_id", "sent_at" DESC);



CREATE INDEX "notification_deliveries_pending_idx" ON "public"."notification_deliveries" USING "btree" ("scheduled_for") WHERE ("status" = 'pending'::"public"."delivery_status");



CREATE INDEX "notifications_entity_idx" ON "public"."notifications" USING "btree" ("entity_type", "entity_id") WHERE ("entity_id" IS NOT NULL);



CREATE INDEX "notifications_recipient_idx" ON "public"."notifications" USING "btree" ("recipient_id", "created_at" DESC);



CREATE INDEX "notifications_unread_idx" ON "public"."notifications" USING "btree" ("recipient_id", "created_at" DESC) WHERE ("read_at" IS NULL);



CREATE INDEX "ownership_holdings_investor_idx" ON "public"."ownership_holdings" USING "btree" ("investor_id");



CREATE INDEX "ownership_holdings_offering_idx" ON "public"."ownership_holdings" USING "btree" ("offering_id");



CREATE INDEX "ownership_holdings_status_idx" ON "public"."ownership_holdings" USING "btree" ("status");



CREATE INDEX "ownership_holdings_transfer_eligible_idx" ON "public"."ownership_holdings" USING "btree" ("transfer_eligible_at");



CREATE INDEX "ownership_inheritance_current_investor_idx" ON "public"."ownership_inheritance" USING "btree" ("current_investor_id");



CREATE INDEX "ownership_inheritance_holding_idx" ON "public"."ownership_inheritance" USING "btree" ("holding_id");



CREATE INDEX "ownership_inheritance_status_idx" ON "public"."ownership_inheritance" USING "btree" ("status");



CREATE UNIQUE INDEX "ownership_offerings_code_key" ON "public"."ownership_offerings" USING "btree" ("code");



CREATE INDEX "ownership_transfers_from_investor_idx" ON "public"."ownership_transfers" USING "btree" ("from_investor_id");



CREATE INDEX "ownership_transfers_holding_idx" ON "public"."ownership_transfers" USING "btree" ("holding_id");



CREATE INDEX "ownership_transfers_status_idx" ON "public"."ownership_transfers" USING "btree" ("status");



CREATE INDEX "ownership_transfers_to_investor_idx" ON "public"."ownership_transfers" USING "btree" ("to_investor_id");



CREATE INDEX "permissions_module_idx" ON "public"."permissions" USING "btree" ("module", "action");



CREATE UNIQUE INDEX "portal_content_slug_unique" ON "public"."portal_content" USING "btree" ("slug");



CREATE INDEX "portal_inquiries_status_idx" ON "public"."portal_inquiries" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "portal_navigation_location_idx" ON "public"."portal_navigation" USING "btree" ("location", "position") WHERE "is_visible";



CREATE INDEX "portal_navigation_parent_idx" ON "public"."portal_navigation" USING "btree" ("parent_id") WHERE ("parent_id" IS NOT NULL);



CREATE INDEX "portal_pages_status_idx" ON "public"."portal_pages" USING "btree" ("status", "position");



CREATE INDEX "portal_section_versions_section_idx" ON "public"."portal_section_versions" USING "btree" ("section_id", "version_number" DESC);



CREATE INDEX "portal_sections_page_idx" ON "public"."portal_sections" USING "btree" ("page_id", "position");



CREATE UNIQUE INDEX "portal_theme_single_active" ON "public"."portal_theme" USING "btree" ("is_active") WHERE "is_active";



CREATE UNIQUE INDEX "profit_distribution_payment_proofs_allocation_unique" ON "public"."profit_distribution_payment_proofs" USING "btree" ("allocation_id");



CREATE INDEX "profit_distribution_payment_proofs_investor_idx" ON "public"."profit_distribution_payment_proofs" USING "btree" ("investor_id");



CREATE INDEX "profit_distribution_payment_proofs_uploaded_by_idx" ON "public"."profit_distribution_payment_proofs" USING "btree" ("uploaded_by");



CREATE INDEX "profit_distributions_offering_idx" ON "public"."profit_distributions" USING "btree" ("offering_id");



CREATE INDEX "profit_distributions_period_idx" ON "public"."profit_distributions" USING "btree" ("period_start", "period_end");



CREATE INDEX "profit_distributions_status_idx" ON "public"."profit_distributions" USING "btree" ("status");



CREATE INDEX "rate_limits_window_idx" ON "public"."rate_limits" USING "btree" ("window_started_at");



CREATE INDEX "role_permissions_permission_idx" ON "public"."role_permissions" USING "btree" ("permission_id");



CREATE INDEX "thread_participants_user_idx" ON "public"."thread_participants" USING "btree" ("user_id");



CREATE INDEX "user_accounts_account_type_status_idx" ON "public"."user_accounts" USING "btree" ("account_type", "status");



CREATE UNIQUE INDEX "user_accounts_email_key" ON "public"."user_accounts" USING "btree" ("email");



CREATE INDEX "user_accounts_full_name_trgm_idx" ON "public"."user_accounts" USING "gin" ("full_name" "extensions"."gin_trgm_ops");



CREATE INDEX "user_profiles_role_idx" ON "public"."user_profiles" USING "btree" ("role");



CREATE INDEX "user_profiles_status_idx" ON "public"."user_profiles" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "admins_account_type_check" BEFORE INSERT OR UPDATE ON "public"."admins" FOR EACH ROW EXECUTE FUNCTION "app"."assert_account_type"('admin');



CREATE OR REPLACE TRIGGER "admins_guard" BEFORE INSERT OR UPDATE ON "public"."admins" FOR EACH ROW EXECUTE FUNCTION "app"."guard_admin_change"();



CREATE OR REPLACE TRIGGER "admins_guard_delete" BEFORE DELETE ON "public"."admins" FOR EACH ROW EXECUTE FUNCTION "app"."guard_admin_delete"();



CREATE OR REPLACE TRIGGER "admins_set_updated_at" BEFORE UPDATE ON "public"."admins" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "audit_logs_append_only" BEFORE DELETE OR UPDATE ON "public"."audit_logs" FOR EACH ROW EXECUTE FUNCTION "app"."forbid_mutation"();



CREATE OR REPLACE TRIGGER "company_profile_versions_assign_number" BEFORE INSERT ON "public"."company_profile_versions" FOR EACH ROW EXECUTE FUNCTION "app"."assign_company_profile_version_number"();



CREATE OR REPLACE TRIGGER "company_profile_versions_guard_delete" BEFORE DELETE ON "public"."company_profile_versions" FOR EACH ROW EXECUTE FUNCTION "app"."forbid_published_version_delete"();



CREATE OR REPLACE TRIGGER "company_profile_versions_guard_update" BEFORE UPDATE ON "public"."company_profile_versions" FOR EACH ROW EXECUTE FUNCTION "app"."guard_company_profile_version_update"();



CREATE OR REPLACE TRIGGER "company_profiles_set_updated_at" BEFORE UPDATE ON "public"."company_profiles" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "contact_messages_updated_at" BEFORE UPDATE ON "public"."contact_messages" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "distribution_allocations_updated_at" BEFORE UPDATE ON "public"."profit_distribution_allocations" FOR EACH ROW EXECUTE FUNCTION "public"."touch_ownership_updated_at"();



CREATE OR REPLACE TRIGGER "document_access_grants_emit_events" AFTER INSERT OR UPDATE ON "public"."document_access_grants" FOR EACH ROW EXECUTE FUNCTION "app"."emit_document_grant_events"();



CREATE OR REPLACE TRIGGER "document_versions_assign_number" BEFORE INSERT ON "public"."document_versions" FOR EACH ROW EXECUTE FUNCTION "app"."assign_document_version_number"();



CREATE OR REPLACE TRIGGER "document_versions_guard_delete" BEFORE DELETE ON "public"."document_versions" FOR EACH ROW EXECUTE FUNCTION "app"."forbid_published_version_delete"();



CREATE OR REPLACE TRIGGER "document_versions_guard_update" BEFORE UPDATE ON "public"."document_versions" FOR EACH ROW EXECUTE FUNCTION "app"."guard_document_version_update"();



CREATE OR REPLACE TRIGGER "documents_emit_events" AFTER UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "app"."emit_document_events"();



CREATE OR REPLACE TRIGGER "documents_guard_update" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "app"."guard_document_update"();



CREATE OR REPLACE TRIGGER "documents_set_updated_at" BEFORE UPDATE ON "public"."documents" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "financial_kpis_guard" BEFORE INSERT OR DELETE OR UPDATE ON "public"."financial_kpis" FOR EACH ROW EXECUTE FUNCTION "app"."guard_financial_line_item"();



CREATE OR REPLACE TRIGGER "financial_line_items_guard" BEFORE INSERT OR DELETE OR UPDATE ON "public"."financial_line_items" FOR EACH ROW EXECUTE FUNCTION "app"."guard_financial_line_item"();



CREATE OR REPLACE TRIGGER "financial_periods_guard_update" BEFORE UPDATE ON "public"."financial_periods" FOR EACH ROW EXECUTE FUNCTION "app"."guard_financial_period_update"();



CREATE OR REPLACE TRIGGER "financial_periods_set_updated_at" BEFORE UPDATE ON "public"."financial_periods" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "financial_report_versions_assign_number" BEFORE INSERT ON "public"."financial_report_versions" FOR EACH ROW EXECUTE FUNCTION "app"."assign_financial_version_number"();



CREATE OR REPLACE TRIGGER "financial_report_versions_guard_delete" BEFORE DELETE ON "public"."financial_report_versions" FOR EACH ROW EXECUTE FUNCTION "app"."forbid_published_version_delete"();



CREATE OR REPLACE TRIGGER "financial_report_versions_guard_update" BEFORE UPDATE ON "public"."financial_report_versions" FOR EACH ROW EXECUTE FUNCTION "app"."guard_financial_version_update"();



CREATE OR REPLACE TRIGGER "financial_reports_emit_events" AFTER UPDATE ON "public"."financial_reports" FOR EACH ROW EXECUTE FUNCTION "app"."emit_financial_events"();



CREATE OR REPLACE TRIGGER "financial_reports_set_updated_at" BEFORE UPDATE ON "public"."financial_reports" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "investor_requests_updated_at" BEFORE UPDATE ON "public"."investor_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "investor_status_history_append_only" BEFORE DELETE OR UPDATE ON "public"."investor_status_history" FOR EACH ROW EXECUTE FUNCTION "app"."forbid_mutation"();



CREATE OR REPLACE TRIGGER "investors_account_type_check" BEFORE INSERT OR UPDATE ON "public"."investors" FOR EACH ROW EXECUTE FUNCTION "app"."assert_account_type"('investor');



CREATE OR REPLACE TRIGGER "investors_assign_reference" BEFORE INSERT ON "public"."investors" FOR EACH ROW EXECUTE FUNCTION "app"."assign_investor_reference"();



CREATE OR REPLACE TRIGGER "investors_emit_events" AFTER INSERT OR UPDATE OF "status" ON "public"."investors" FOR EACH ROW EXECUTE FUNCTION "app"."emit_investor_events"();



CREATE OR REPLACE TRIGGER "investors_reference_code_immutable" BEFORE UPDATE ON "public"."investors" FOR EACH ROW EXECUTE FUNCTION "app"."forbid_column_change"('reference_code');



CREATE OR REPLACE TRIGGER "investors_set_updated_at" BEFORE UPDATE ON "public"."investors" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "investors_status_record" AFTER INSERT OR UPDATE OF "status" ON "public"."investors" FOR EACH ROW EXECUTE FUNCTION "app"."investor_status_record"();



CREATE OR REPLACE TRIGGER "investors_status_validate" BEFORE INSERT OR UPDATE OF "status" ON "public"."investors" FOR EACH ROW EXECUTE FUNCTION "app"."investor_status_validate"();



CREATE OR REPLACE TRIGGER "media_assets_location_immutable" BEFORE UPDATE ON "public"."media_assets" FOR EACH ROW EXECUTE FUNCTION "app"."forbid_column_change"('bucket', 'path', 'checksum_sha256');



CREATE OR REPLACE TRIGGER "media_assets_set_updated_at" BEFORE UPDATE ON "public"."media_assets" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "meeting_bookings_updated_at" BEFORE UPDATE ON "public"."meeting_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "message_threads_set_updated_at" BEFORE UPDATE ON "public"."message_threads" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "messages_emit_events" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "app"."emit_message_events"();



CREATE OR REPLACE TRIGGER "messages_no_delete" BEFORE DELETE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "app"."forbid_mutation"();



CREATE OR REPLACE TRIGGER "messages_touch_thread" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "app"."touch_thread_on_message"();



CREATE OR REPLACE TRIGGER "notification_deliveries_set_updated_at" BEFORE UPDATE ON "public"."notification_deliveries" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "notification_preferences_set_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "notifications_emit_events" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "app"."emit_notification_events"();



CREATE OR REPLACE TRIGGER "ownership_holdings_updated_at" BEFORE UPDATE ON "public"."ownership_holdings" FOR EACH ROW EXECUTE FUNCTION "public"."touch_ownership_updated_at"();



CREATE OR REPLACE TRIGGER "ownership_inheritance_updated_at" BEFORE UPDATE ON "public"."ownership_inheritance" FOR EACH ROW EXECUTE FUNCTION "public"."touch_ownership_updated_at"();



CREATE OR REPLACE TRIGGER "ownership_offerings_updated_at" BEFORE UPDATE ON "public"."ownership_offerings" FOR EACH ROW EXECUTE FUNCTION "public"."touch_ownership_updated_at"();



CREATE OR REPLACE TRIGGER "ownership_transfers_updated_at" BEFORE UPDATE ON "public"."ownership_transfers" FOR EACH ROW EXECUTE FUNCTION "public"."touch_ownership_updated_at"();



CREATE OR REPLACE TRIGGER "portal_inquiries_emit_events" AFTER INSERT ON "public"."portal_inquiries" FOR EACH ROW EXECUTE FUNCTION "app"."emit_inquiry_events"();



CREATE OR REPLACE TRIGGER "portal_inquiries_set_updated_at" BEFORE UPDATE ON "public"."portal_inquiries" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "portal_navigation_emit_events" AFTER INSERT OR DELETE OR UPDATE ON "public"."portal_navigation" FOR EACH ROW EXECUTE FUNCTION "app"."emit_portal_navigation_events"();



CREATE OR REPLACE TRIGGER "portal_navigation_set_updated_at" BEFORE UPDATE ON "public"."portal_navigation" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "portal_pages_emit_events" AFTER INSERT OR DELETE OR UPDATE ON "public"."portal_pages" FOR EACH ROW EXECUTE FUNCTION "app"."emit_portal_page_events"();



CREATE OR REPLACE TRIGGER "portal_pages_guard_delete" BEFORE DELETE ON "public"."portal_pages" FOR EACH ROW EXECUTE FUNCTION "app"."guard_portal_page_delete"();



CREATE OR REPLACE TRIGGER "portal_pages_set_updated_at" BEFORE UPDATE ON "public"."portal_pages" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "portal_section_versions_assign_number" BEFORE INSERT ON "public"."portal_section_versions" FOR EACH ROW EXECUTE FUNCTION "app"."assign_section_version_number"();



CREATE OR REPLACE TRIGGER "portal_section_versions_content_kind" BEFORE INSERT OR UPDATE OF "content" ON "public"."portal_section_versions" FOR EACH ROW EXECUTE FUNCTION "app"."assert_section_content_kind"();



CREATE OR REPLACE TRIGGER "portal_section_versions_guard_delete" BEFORE DELETE ON "public"."portal_section_versions" FOR EACH ROW EXECUTE FUNCTION "app"."forbid_published_version_delete"();



CREATE OR REPLACE TRIGGER "portal_section_versions_guard_update" BEFORE UPDATE ON "public"."portal_section_versions" FOR EACH ROW EXECUTE FUNCTION "app"."guard_section_version_update"();



CREATE OR REPLACE TRIGGER "portal_sections_emit_events" AFTER INSERT OR DELETE OR UPDATE ON "public"."portal_sections" FOR EACH ROW EXECUTE FUNCTION "app"."emit_portal_section_events"();



CREATE OR REPLACE TRIGGER "portal_sections_set_updated_at" BEFORE UPDATE ON "public"."portal_sections" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "portal_theme_emit_events" AFTER INSERT OR UPDATE ON "public"."portal_theme" FOR EACH ROW EXECUTE FUNCTION "app"."emit_portal_theme_events"();



CREATE OR REPLACE TRIGGER "portal_theme_set_updated_at" BEFORE UPDATE ON "public"."portal_theme" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profit_distributions_updated_at" BEFORE UPDATE ON "public"."profit_distributions" FOR EACH ROW EXECUTE FUNCTION "public"."touch_ownership_updated_at"();



CREATE OR REPLACE TRIGGER "role_permissions_bump_version" AFTER INSERT OR DELETE ON "public"."role_permissions" FOR EACH ROW EXECUTE FUNCTION "app"."bump_role_version"();



CREATE OR REPLACE TRIGGER "role_permissions_guard" BEFORE INSERT OR DELETE ON "public"."role_permissions" FOR EACH ROW EXECUTE FUNCTION "app"."guard_role_permission_change"();



CREATE OR REPLACE TRIGGER "roles_guard_delete" BEFORE DELETE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "app"."guard_role_delete"();



CREATE OR REPLACE TRIGGER "roles_key_immutable" BEFORE UPDATE ON "public"."roles" FOR EACH ROW WHEN ("old"."is_system") EXECUTE FUNCTION "app"."forbid_column_change"('key', 'is_system');



CREATE OR REPLACE TRIGGER "roles_set_updated_at" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "site_settings_set_updated_at" BEFORE UPDATE ON "public"."site_settings" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "touch_profit_distribution_payment_proof_trigger" BEFORE UPDATE ON "public"."profit_distribution_payment_proofs" FOR EACH ROW EXECUTE FUNCTION "public"."touch_profit_distribution_payment_proof"();



CREATE OR REPLACE TRIGGER "user_accounts_account_type_immutable" BEFORE UPDATE ON "public"."user_accounts" FOR EACH ROW EXECUTE FUNCTION "app"."forbid_column_change"('account_type');



CREATE OR REPLACE TRIGGER "user_accounts_set_updated_at" BEFORE UPDATE ON "public"."user_accounts" FOR EACH ROW EXECUTE FUNCTION "app"."set_updated_at"();



CREATE OR REPLACE TRIGGER "validate_profit_distribution_payment_proof_trigger" BEFORE INSERT OR UPDATE ON "public"."profit_distribution_payment_proofs" FOR EACH ROW EXECUTE FUNCTION "public"."validate_profit_distribution_payment_proof"();



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."user_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."user_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."broadcasts"
    ADD CONSTRAINT "broadcasts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_profile_versions"
    ADD CONSTRAINT "company_profile_versions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_profile_versions"
    ADD CONSTRAINT "company_profile_versions_company_profile_id_fkey" FOREIGN KEY ("company_profile_id") REFERENCES "public"."company_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_profile_versions"
    ADD CONSTRAINT "company_profile_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_profiles"
    ADD CONSTRAINT "company_profiles_current_version_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."company_profile_versions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_profiles"
    ADD CONSTRAINT "company_profiles_published_version_fk" FOREIGN KEY ("published_version_id") REFERENCES "public"."company_profile_versions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."data_room_access_logs"
    ADD CONSTRAINT "data_room_access_logs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."data_room_documents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."data_room_access_logs"
    ADD CONSTRAINT "data_room_access_logs_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."legacy_investors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."data_room_access_logs"
    ADD CONSTRAINT "data_room_access_logs_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "public"."investor_tokens"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."data_room_documents"
    ADD CONSTRAINT "data_room_documents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."data_room_categories"("id");



ALTER TABLE ONLY "public"."document_access_grants"
    ADD CONSTRAINT "document_access_grants_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_access_grants"
    ADD CONSTRAINT "document_access_grants_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."document_access_grants"
    ADD CONSTRAINT "document_access_grants_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_access_grants"
    ADD CONSTRAINT "document_access_grants_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."document_versions"
    ADD CONSTRAINT "document_versions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."document_versions"
    ADD CONSTRAINT "document_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."document_versions"
    ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_versions"
    ADD CONSTRAINT "document_versions_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_current_version_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."document_versions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_owner_admin_id_fkey" FOREIGN KEY ("owner_admin_id") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_published_version_fk" FOREIGN KEY ("published_version_id") REFERENCES "public"."document_versions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financial_kpis"
    ADD CONSTRAINT "financial_kpis_financial_report_version_id_fkey" FOREIGN KEY ("financial_report_version_id") REFERENCES "public"."financial_report_versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_line_items"
    ADD CONSTRAINT "financial_line_items_financial_report_version_id_fkey" FOREIGN KEY ("financial_report_version_id") REFERENCES "public"."financial_report_versions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_line_items"
    ADD CONSTRAINT "financial_line_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."financial_line_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_report_versions"
    ADD CONSTRAINT "financial_report_versions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financial_report_versions"
    ADD CONSTRAINT "financial_report_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financial_report_versions"
    ADD CONSTRAINT "financial_report_versions_document_asset_id_fkey" FOREIGN KEY ("document_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financial_report_versions"
    ADD CONSTRAINT "financial_report_versions_financial_report_id_fkey" FOREIGN KEY ("financial_report_id") REFERENCES "public"."financial_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_reports"
    ADD CONSTRAINT "financial_reports_current_version_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."financial_report_versions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financial_reports"
    ADD CONSTRAINT "financial_reports_financial_period_id_fkey" FOREIGN KEY ("financial_period_id") REFERENCES "public"."financial_periods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financial_reports"
    ADD CONSTRAINT "financial_reports_owner_admin_id_fkey" FOREIGN KEY ("owner_admin_id") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."financial_reports"
    ADD CONSTRAINT "financial_reports_published_version_fk" FOREIGN KEY ("published_version_id") REFERENCES "public"."financial_report_versions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."investor_status_history"
    ADD CONSTRAINT "investor_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."user_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."legacy_investor_status_history"
    ADD CONSTRAINT "investor_status_history_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."legacy_investors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investor_status_history"
    ADD CONSTRAINT "investor_status_history_investor_id_fkey1" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investor_tokens"
    ADD CONSTRAINT "investor_tokens_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."legacy_investors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investors"
    ADD CONSTRAINT "investors_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."user_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."investors"
    ADD CONSTRAINT "investors_relationship_manager_id_fkey" FOREIGN KEY ("relationship_manager_id") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."investors"
    ADD CONSTRAINT "investors_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meetings"
    ADD CONSTRAINT "meetings_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."legacy_investors"("id");



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."message_attachments"
    ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reads"
    ADD CONSTRAINT "message_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcasts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."user_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_deliveries"
    ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."user_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ownership_holdings"
    ADD CONSTRAINT "ownership_holdings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ownership_holdings"
    ADD CONSTRAINT "ownership_holdings_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ownership_holdings"
    ADD CONSTRAINT "ownership_holdings_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "public"."ownership_offerings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ownership_holdings"
    ADD CONSTRAINT "ownership_holdings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ownership_inheritance"
    ADD CONSTRAINT "ownership_inheritance_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ownership_inheritance"
    ADD CONSTRAINT "ownership_inheritance_current_investor_id_fkey" FOREIGN KEY ("current_investor_id") REFERENCES "public"."investors"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ownership_inheritance"
    ADD CONSTRAINT "ownership_inheritance_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "public"."ownership_holdings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ownership_offerings"
    ADD CONSTRAINT "ownership_offerings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ownership_offerings"
    ADD CONSTRAINT "ownership_offerings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ownership_transfers"
    ADD CONSTRAINT "ownership_transfers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ownership_transfers"
    ADD CONSTRAINT "ownership_transfers_from_investor_id_fkey" FOREIGN KEY ("from_investor_id") REFERENCES "public"."investors"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ownership_transfers"
    ADD CONSTRAINT "ownership_transfers_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "public"."ownership_holdings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ownership_transfers"
    ADD CONSTRAINT "ownership_transfers_to_investor_id_fkey" FOREIGN KEY ("to_investor_id") REFERENCES "public"."investors"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."portal_inquiries"
    ADD CONSTRAINT "portal_inquiries_converted_investor_id_fkey" FOREIGN KEY ("converted_investor_id") REFERENCES "public"."investors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."portal_inquiries"
    ADD CONSTRAINT "portal_inquiries_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."portal_inquiries"
    ADD CONSTRAINT "portal_inquiries_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."portal_navigation"
    ADD CONSTRAINT "portal_navigation_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."portal_navigation"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portal_section_versions"
    ADD CONSTRAINT "portal_section_versions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."portal_section_versions"
    ADD CONSTRAINT "portal_section_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."portal_section_versions"
    ADD CONSTRAINT "portal_section_versions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."portal_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portal_sections"
    ADD CONSTRAINT "portal_sections_current_version_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."portal_section_versions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."portal_sections"
    ADD CONSTRAINT "portal_sections_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."portal_pages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portal_sections"
    ADD CONSTRAINT "portal_sections_published_version_fk" FOREIGN KEY ("published_version_id") REFERENCES "public"."portal_section_versions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."portal_theme"
    ADD CONSTRAINT "portal_theme_favicon_asset_id_fkey" FOREIGN KEY ("favicon_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."portal_theme"
    ADD CONSTRAINT "portal_theme_logo_asset_id_fkey" FOREIGN KEY ("logo_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."portal_theme"
    ADD CONSTRAINT "portal_theme_logo_dark_asset_id_fkey" FOREIGN KEY ("logo_dark_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."portal_theme"
    ADD CONSTRAINT "portal_theme_og_image_asset_id_fkey" FOREIGN KEY ("og_image_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profit_distribution_allocations"
    ADD CONSTRAINT "profit_distribution_allocations_distribution_id_fkey" FOREIGN KEY ("distribution_id") REFERENCES "public"."profit_distributions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profit_distribution_allocations"
    ADD CONSTRAINT "profit_distribution_allocations_holding_id_fkey" FOREIGN KEY ("holding_id") REFERENCES "public"."ownership_holdings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profit_distribution_allocations"
    ADD CONSTRAINT "profit_distribution_allocations_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profit_distribution_payment_proofs"
    ADD CONSTRAINT "profit_distribution_payment_proofs_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "public"."profit_distribution_allocations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profit_distribution_payment_proofs"
    ADD CONSTRAINT "profit_distribution_payment_proofs_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "public"."investors"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profit_distribution_payment_proofs"
    ADD CONSTRAINT "profit_distribution_payment_proofs_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profit_distributions"
    ADD CONSTRAINT "profit_distributions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profit_distributions"
    ADD CONSTRAINT "profit_distributions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profit_distributions"
    ADD CONSTRAINT "profit_distributions_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "public"."ownership_offerings"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profit_distributions"
    ADD CONSTRAINT "profit_distributions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."thread_participants"
    ADD CONSTRAINT "thread_participants_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."thread_participants"
    ADD CONSTRAINT "thread_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_accounts"
    ADD CONSTRAINT "user_accounts_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admins_insert" ON "public"."admins" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('admins.create'::"text"));



CREATE POLICY "admins_select_auth_admin" ON "public"."admins" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "admins_select_permitted" ON "public"."admins" FOR SELECT TO "authenticated" USING ("app"."has_permission"('admins.view'::"text"));



CREATE POLICY "admins_select_self" ON "public"."admins" FOR SELECT TO "authenticated" USING (("id" = "app"."current_user_id"()));



CREATE POLICY "admins_update" ON "public"."admins" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('admins.update'::"text")) WITH CHECK ("app"."has_permission"('admins.update'::"text"));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_insert" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK ((NOT ("actor_id" IS DISTINCT FROM "app"."current_user_id"())));



CREATE POLICY "audit_logs_select" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ("app"."has_permission"('audit_logs.view'::"text"));



CREATE POLICY "audit_logs_select_own_investor" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING ((("entity_type" = 'investor'::"text") AND ("entity_id" = "app"."current_user_id"())));



ALTER TABLE "public"."broadcasts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "broadcasts_insert_admin" ON "public"."broadcasts" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('messages.broadcast'::"text"));



CREATE POLICY "broadcasts_select_admin" ON "public"."broadcasts" FOR SELECT TO "authenticated" USING ("app"."has_permission"('messages.view'::"text"));



CREATE POLICY "broadcasts_update_admin" ON "public"."broadcasts" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('messages.broadcast'::"text")) WITH CHECK ("app"."has_permission"('messages.broadcast'::"text"));



ALTER TABLE "public"."company_profile_versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_profile_versions_insert_admin" ON "public"."company_profile_versions" FOR INSERT TO "authenticated" WITH CHECK (("app"."has_permission"('company_profile.update'::"text") AND ("status" = 'draft'::"public"."publication_status")));



CREATE POLICY "company_profile_versions_select_admin" ON "public"."company_profile_versions" FOR SELECT TO "authenticated" USING ("app"."has_permission"('company_profile.view'::"text"));



CREATE POLICY "company_profile_versions_select_published" ON "public"."company_profile_versions" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."company_profiles" "p"
  WHERE (("p"."id" = "company_profile_versions"."company_profile_id") AND ("p"."published_version_id" = "company_profile_versions"."id")))));



CREATE POLICY "company_profile_versions_update_admin" ON "public"."company_profile_versions" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('company_profile.update'::"text")) WITH CHECK ("app"."has_permission"('company_profile.update'::"text"));



ALTER TABLE "public"."company_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "company_profiles_insert_admin" ON "public"."company_profiles" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('company_profile.update'::"text"));



CREATE POLICY "company_profiles_select_admin" ON "public"."company_profiles" FOR SELECT TO "authenticated" USING ("app"."has_permission"('company_profile.view'::"text"));



CREATE POLICY "company_profiles_select_published" ON "public"."company_profiles" FOR SELECT TO "authenticated", "anon" USING (("status" = 'published'::"public"."publication_status"));



CREATE POLICY "company_profiles_update_admin" ON "public"."company_profiles" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('company_profile.update'::"text")) WITH CHECK ("app"."has_permission"('company_profile.update'::"text"));



ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_messages_admin_manage" ON "public"."contact_messages" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "contact_messages_public_insert" ON "public"."contact_messages" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



ALTER TABLE "public"."data_room_access_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "data_room_access_logs_client_deny" ON "public"."data_room_access_logs" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."data_room_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "data_room_categories_client_deny" ON "public"."data_room_categories" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."data_room_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "data_room_documents_client_deny" ON "public"."data_room_documents" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."document_access_grants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "document_access_grants_insert_admin" ON "public"."document_access_grants" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('investor_documents.assign'::"text"));



CREATE POLICY "document_access_grants_select_admin" ON "public"."document_access_grants" FOR SELECT TO "authenticated" USING ("app"."has_permission"('investor_documents.view'::"text"));



CREATE POLICY "document_access_grants_select_self" ON "public"."document_access_grants" FOR SELECT TO "authenticated" USING (("investor_id" = "app"."current_user_id"()));



CREATE POLICY "document_access_grants_update_admin" ON "public"."document_access_grants" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('investor_documents.revoke'::"text")) WITH CHECK ("app"."has_permission"('investor_documents.revoke'::"text"));



ALTER TABLE "public"."document_versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "document_versions_delete_admin" ON "public"."document_versions" FOR DELETE TO "authenticated" USING ("app"."has_permission"('documents.delete'::"text"));



CREATE POLICY "document_versions_insert_admin" ON "public"."document_versions" FOR INSERT TO "authenticated" WITH CHECK (("app"."has_permission"('documents.create'::"text") AND ("status" = 'draft'::"public"."publication_status")));



CREATE POLICY "document_versions_select_admin" ON "public"."document_versions" FOR SELECT TO "authenticated" USING ("app"."has_permission"('documents.view'::"text"));



CREATE POLICY "document_versions_select_via_document" ON "public"."document_versions" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."documents" "d"
  WHERE (("d"."id" = "document_versions"."document_id") AND ("d"."published_version_id" = "document_versions"."id")))));



CREATE POLICY "document_versions_update_admin" ON "public"."document_versions" FOR UPDATE TO "authenticated" USING (("app"."has_permission"('documents.update'::"text") OR "app"."has_permission"('documents.review'::"text") OR "app"."has_permission"('documents.approve'::"text") OR "app"."has_permission"('documents.publish'::"text"))) WITH CHECK (("app"."has_permission"('documents.update'::"text") OR "app"."has_permission"('documents.review'::"text") OR "app"."has_permission"('documents.approve'::"text") OR "app"."has_permission"('documents.publish'::"text")));



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documents_insert_admin" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK (("app"."has_permission"('documents.create'::"text") AND ("status" = 'draft'::"public"."publication_status")));



CREATE POLICY "documents_select_admin" ON "public"."documents" FOR SELECT TO "authenticated" USING ("app"."has_permission"('documents.view'::"text"));



CREATE POLICY "documents_select_investor" ON "public"."documents" FOR SELECT TO "authenticated" USING ((("app"."current_investor_id"() IS NOT NULL) AND ("status" = 'published'::"public"."publication_status") AND (("visibility" = 'investors'::"public"."visibility") OR (("visibility" = 'restricted'::"public"."visibility") AND "app"."investor_granted_document"("id")))));



CREATE POLICY "documents_select_public" ON "public"."documents" FOR SELECT TO "authenticated", "anon" USING ((("status" = 'published'::"public"."publication_status") AND ("visibility" = 'public'::"public"."visibility")));



CREATE POLICY "documents_update_admin" ON "public"."documents" FOR UPDATE TO "authenticated" USING (("app"."has_permission"('documents.update'::"text") OR "app"."has_permission"('documents.review'::"text") OR "app"."has_permission"('documents.approve'::"text") OR "app"."has_permission"('documents.publish'::"text") OR "app"."has_permission"('documents.archive'::"text"))) WITH CHECK (("app"."has_permission"('documents.update'::"text") OR "app"."has_permission"('documents.review'::"text") OR "app"."has_permission"('documents.approve'::"text") OR "app"."has_permission"('documents.publish'::"text") OR "app"."has_permission"('documents.archive'::"text")));



ALTER TABLE "public"."financial_kpis" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "financial_kpis_delete_admin" ON "public"."financial_kpis" FOR DELETE TO "authenticated" USING ("app"."has_permission"('financial_reports.update'::"text"));



CREATE POLICY "financial_kpis_select" ON "public"."financial_kpis" FOR SELECT TO "authenticated" USING (("app"."has_permission"('financial_reports.view'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."financial_report_versions" "v"
     JOIN "public"."financial_reports" "r" ON (("r"."id" = "v"."financial_report_id")))
  WHERE (("v"."id" = "financial_kpis"."financial_report_version_id") AND ("r"."published_version_id" = "v"."id") AND ("r"."status" = 'published'::"public"."publication_status") AND ("r"."visibility" = 'investors'::"public"."visibility") AND ("app"."current_investor_id"() IS NOT NULL))))));



CREATE POLICY "financial_kpis_update_admin" ON "public"."financial_kpis" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('financial_reports.update'::"text")) WITH CHECK ("app"."has_permission"('financial_reports.update'::"text"));



CREATE POLICY "financial_kpis_write_admin" ON "public"."financial_kpis" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('financial_reports.update'::"text"));



ALTER TABLE "public"."financial_line_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "financial_line_items_delete_admin" ON "public"."financial_line_items" FOR DELETE TO "authenticated" USING ("app"."has_permission"('financial_reports.update'::"text"));



CREATE POLICY "financial_line_items_select" ON "public"."financial_line_items" FOR SELECT TO "authenticated" USING (("app"."has_permission"('financial_reports.view'::"text") OR (EXISTS ( SELECT 1
   FROM ("public"."financial_report_versions" "v"
     JOIN "public"."financial_reports" "r" ON (("r"."id" = "v"."financial_report_id")))
  WHERE (("v"."id" = "financial_line_items"."financial_report_version_id") AND ("r"."published_version_id" = "v"."id") AND ("r"."status" = 'published'::"public"."publication_status") AND ("r"."visibility" = 'investors'::"public"."visibility") AND ("app"."current_investor_id"() IS NOT NULL))))));



CREATE POLICY "financial_line_items_update_admin" ON "public"."financial_line_items" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('financial_reports.update'::"text")) WITH CHECK ("app"."has_permission"('financial_reports.update'::"text"));



CREATE POLICY "financial_line_items_write_admin" ON "public"."financial_line_items" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('financial_reports.update'::"text"));



ALTER TABLE "public"."financial_periods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "financial_periods_insert_admin" ON "public"."financial_periods" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('financial_periods.create'::"text"));



CREATE POLICY "financial_periods_select_admin" ON "public"."financial_periods" FOR SELECT TO "authenticated" USING ("app"."has_permission"('financial_periods.view'::"text"));



CREATE POLICY "financial_periods_select_investor" ON "public"."financial_periods" FOR SELECT TO "authenticated" USING (("app"."current_investor_id"() IS NOT NULL));



CREATE POLICY "financial_periods_update_admin" ON "public"."financial_periods" FOR UPDATE TO "authenticated" USING (("app"."has_permission"('financial_periods.update'::"text") OR "app"."has_permission"('financial_periods.close'::"text"))) WITH CHECK (("app"."has_permission"('financial_periods.update'::"text") OR "app"."has_permission"('financial_periods.close'::"text")));



ALTER TABLE "public"."financial_report_versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "financial_report_versions_insert_admin" ON "public"."financial_report_versions" FOR INSERT TO "authenticated" WITH CHECK (("app"."has_permission"('financial_reports.create'::"text") AND ("status" = 'draft'::"public"."publication_status")));



CREATE POLICY "financial_report_versions_select_admin" ON "public"."financial_report_versions" FOR SELECT TO "authenticated" USING ("app"."has_permission"('financial_reports.view'::"text"));



CREATE POLICY "financial_report_versions_select_investor" ON "public"."financial_report_versions" FOR SELECT TO "authenticated" USING ((("app"."current_investor_id"() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."financial_reports" "r"
  WHERE (("r"."id" = "financial_report_versions"."financial_report_id") AND ("r"."published_version_id" = "financial_report_versions"."id") AND ("r"."status" = 'published'::"public"."publication_status") AND ("r"."visibility" = 'investors'::"public"."visibility"))))));



CREATE POLICY "financial_report_versions_update_admin" ON "public"."financial_report_versions" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('financial_reports.update'::"text")) WITH CHECK ("app"."has_permission"('financial_reports.update'::"text"));



ALTER TABLE "public"."financial_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "financial_reports_insert_admin" ON "public"."financial_reports" FOR INSERT TO "authenticated" WITH CHECK (("app"."has_permission"('financial_reports.create'::"text") AND ("status" = 'draft'::"public"."publication_status")));



CREATE POLICY "financial_reports_select_admin" ON "public"."financial_reports" FOR SELECT TO "authenticated" USING ("app"."has_permission"('financial_reports.view'::"text"));



CREATE POLICY "financial_reports_select_investor" ON "public"."financial_reports" FOR SELECT TO "authenticated" USING ((("app"."current_investor_id"() IS NOT NULL) AND ("status" = 'published'::"public"."publication_status") AND ("visibility" = 'investors'::"public"."visibility")));



CREATE POLICY "financial_reports_update_admin" ON "public"."financial_reports" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('financial_reports.update'::"text")) WITH CHECK ("app"."has_permission"('financial_reports.update'::"text"));



ALTER TABLE "public"."investor_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investor_requests_admin_manage" ON "public"."investor_requests" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "investor_requests_public_insert" ON "public"."investor_requests" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



ALTER TABLE "public"."investor_status_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investor_status_history_select_admin" ON "public"."investor_status_history" FOR SELECT TO "authenticated" USING ("app"."has_permission"('investors.view'::"text"));



CREATE POLICY "investor_status_history_select_self" ON "public"."investor_status_history" FOR SELECT TO "authenticated" USING (("investor_id" = "app"."current_user_id"()));



ALTER TABLE "public"."investor_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investor_tokens_client_deny" ON "public"."investor_tokens" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."investors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "investors_select_admin" ON "public"."investors" FOR SELECT TO "authenticated" USING ("app"."has_permission"('investors.view'::"text"));



CREATE POLICY "investors_select_auth_admin" ON "public"."investors" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "investors_select_self" ON "public"."investors" FOR SELECT TO "authenticated" USING (("id" = "app"."current_user_id"()));



CREATE POLICY "investors_update_admin" ON "public"."investors" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('investors.update'::"text")) WITH CHECK ("app"."has_permission"('investors.update'::"text"));



CREATE POLICY "investors_update_self" ON "public"."investors" FOR UPDATE TO "authenticated" USING ((("id" = "app"."current_user_id"()) AND ("status" = ANY (ARRAY['prospective'::"public"."investor_status", 'rejected'::"public"."investor_status"])))) WITH CHECK ((("id" = "app"."current_user_id"()) AND ("status" = ANY (ARRAY['prospective'::"public"."investor_status", 'rejected'::"public"."investor_status", 'submitted'::"public"."investor_status"]))));



ALTER TABLE "public"."kv_store_b620c355" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kv_store_b620c355_client_deny" ON "public"."kv_store_b620c355" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."legacy_audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "legacy_audit_logs_client_deny" ON "public"."legacy_audit_logs" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."legacy_investor_status_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "legacy_investor_status_history_client_deny" ON "public"."legacy_investor_status_history" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."legacy_investors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "legacy_investors_client_deny" ON "public"."legacy_investors" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."media_assets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "media_assets_select_admin" ON "public"."media_assets" FOR SELECT TO "authenticated" USING ("app"."has_permission"('media.view'::"text"));



CREATE POLICY "media_assets_select_public" ON "public"."media_assets" FOR SELECT TO "authenticated", "anon" USING ((("visibility" = 'public'::"public"."asset_visibility") AND ("finalized_at" IS NOT NULL)));



ALTER TABLE "public"."meeting_bookings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "meeting_bookings_admin_manage" ON "public"."meeting_bookings" TO "authenticated" USING ("app"."is_admin"()) WITH CHECK ("app"."is_admin"());



CREATE POLICY "meeting_bookings_public_insert" ON "public"."meeting_bookings" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



ALTER TABLE "public"."meetings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "meetings_client_deny" ON "public"."meetings" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."message_attachments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "message_attachments_select" ON "public"."message_attachments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE ("m"."id" = "message_attachments"."message_id"))));



ALTER TABLE "public"."message_reads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "message_reads_insert_own" ON "public"."message_reads" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "app"."current_user_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."messages" "m"
  WHERE (("m"."id" = "message_reads"."message_id") AND "app"."participates_in_thread"("m"."thread_id"))))));



CREATE POLICY "message_reads_select_own" ON "public"."message_reads" FOR SELECT TO "authenticated" USING (("user_id" = "app"."current_user_id"()));



ALTER TABLE "public"."message_threads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "message_threads_insert_admin" ON "public"."message_threads" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('messages.send'::"text"));



CREATE POLICY "message_threads_insert_investor" ON "public"."message_threads" FOR INSERT TO "authenticated" WITH CHECK ((("thread_kind" = 'investor_admin'::"public"."thread_kind") AND ("investor_id" = "app"."current_investor_id"()) AND ("created_by" = "app"."current_user_id"())));



CREATE POLICY "message_threads_select_admin" ON "public"."message_threads" FOR SELECT TO "authenticated" USING ("app"."has_permission"('messages.view'::"text"));



CREATE POLICY "message_threads_select_participant" ON "public"."message_threads" FOR SELECT TO "authenticated" USING ("app"."participates_in_thread"("id"));



CREATE POLICY "message_threads_update_admin" ON "public"."message_threads" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('messages.close_thread'::"text")) WITH CHECK ("app"."has_permission"('messages.close_thread'::"text"));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_insert_admin" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (("app"."has_permission"('messages.send'::"text") AND ("sender_id" = "app"."current_user_id"())));



CREATE POLICY "messages_insert_participant" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (("app"."participates_in_thread"("thread_id") AND ("sender_id" = "app"."current_user_id"()) AND (NOT "is_system") AND (EXISTS ( SELECT 1
   FROM "public"."message_threads" "t"
  WHERE (("t"."id" = "messages"."thread_id") AND (NOT "t"."is_closed"))))));



CREATE POLICY "messages_select_admin" ON "public"."messages" FOR SELECT TO "authenticated" USING ("app"."has_permission"('messages.view'::"text"));



CREATE POLICY "messages_select_participant" ON "public"."messages" FOR SELECT TO "authenticated" USING ("app"."participates_in_thread"("thread_id"));



ALTER TABLE "public"."notification_deliveries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_deliveries_client_deny" ON "public"."notification_deliveries" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_preferences_insert_own" ON "public"."notification_preferences" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "app"."current_user_id"()));



CREATE POLICY "notification_preferences_select_own" ON "public"."notification_preferences" FOR SELECT TO "authenticated" USING (("user_id" = "app"."current_user_id"()));



CREATE POLICY "notification_preferences_update_own" ON "public"."notification_preferences" FOR UPDATE TO "authenticated" USING (("user_id" = "app"."current_user_id"())) WITH CHECK (("user_id" = "app"."current_user_id"()));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("recipient_id" = "app"."current_user_id"()));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("recipient_id" = "app"."current_user_id"())) WITH CHECK (("recipient_id" = "app"."current_user_id"()));



ALTER TABLE "public"."ownership_holdings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ownership_holdings_select_admin" ON "public"."ownership_holdings" FOR SELECT TO "authenticated" USING ("app"."has_permission"('profit_distributions.view'::"text"));



CREATE POLICY "ownership_holdings_select_self" ON "public"."ownership_holdings" FOR SELECT TO "authenticated" USING (("investor_id" = "app"."current_user_id"()));



ALTER TABLE "public"."ownership_inheritance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ownership_inheritance_client_deny" ON "public"."ownership_inheritance" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."ownership_offerings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ownership_offerings_insert_admin" ON "public"."ownership_offerings" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('ownership_offerings.create'::"text"));



CREATE POLICY "ownership_offerings_select_admin" ON "public"."ownership_offerings" FOR SELECT TO "authenticated" USING ("app"."has_permission"('ownership_offerings.view'::"text"));



CREATE POLICY "ownership_offerings_update_admin" ON "public"."ownership_offerings" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('ownership_offerings.update'::"text")) WITH CHECK ("app"."has_permission"('ownership_offerings.update'::"text"));



ALTER TABLE "public"."ownership_transfers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ownership_transfers_client_deny" ON "public"."ownership_transfers" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "permissions_select" ON "public"."permissions" FOR SELECT TO "authenticated" USING (("app"."has_permission"('permissions.view'::"text") OR "app"."has_permission"('roles.view'::"text")));



ALTER TABLE "public"."portal_content" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_content_public_read" ON "public"."portal_content" FOR SELECT TO "authenticated", "anon" USING ((("status")::"text" = 'published'::"text"));



ALTER TABLE "public"."portal_inquiries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_inquiries_insert_anon" ON "public"."portal_inquiries" FOR INSERT TO "authenticated", "anon" WITH CHECK ((("status" = 'new'::"public"."inquiry_status") AND ("handled_by" IS NULL) AND ("converted_investor_id" IS NULL)));



CREATE POLICY "portal_inquiries_select_admin" ON "public"."portal_inquiries" FOR SELECT TO "authenticated" USING ("app"."has_permission"('inquiries.view'::"text"));



CREATE POLICY "portal_inquiries_update_admin" ON "public"."portal_inquiries" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('inquiries.handle'::"text")) WITH CHECK ("app"."has_permission"('inquiries.handle'::"text"));



ALTER TABLE "public"."portal_navigation" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_navigation_delete_admin" ON "public"."portal_navigation" FOR DELETE TO "authenticated" USING ("app"."has_permission"('portal.manage_navigation'::"text"));



CREATE POLICY "portal_navigation_insert_admin" ON "public"."portal_navigation" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('portal.manage_navigation'::"text"));



CREATE POLICY "portal_navigation_select_admin" ON "public"."portal_navigation" FOR SELECT TO "authenticated" USING ("app"."has_permission"('portal.view'::"text"));



CREATE POLICY "portal_navigation_select_visible" ON "public"."portal_navigation" FOR SELECT TO "authenticated", "anon" USING ("is_visible");



CREATE POLICY "portal_navigation_update_admin" ON "public"."portal_navigation" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('portal.manage_navigation'::"text")) WITH CHECK ("app"."has_permission"('portal.manage_navigation'::"text"));



ALTER TABLE "public"."portal_pages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_pages_delete_admin" ON "public"."portal_pages" FOR DELETE TO "authenticated" USING (("app"."has_permission"('portal.update'::"text") AND (NOT "is_system")));



CREATE POLICY "portal_pages_insert_admin" ON "public"."portal_pages" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('portal.update'::"text"));



CREATE POLICY "portal_pages_select_admin" ON "public"."portal_pages" FOR SELECT TO "authenticated" USING ("app"."has_permission"('portal.view'::"text"));



CREATE POLICY "portal_pages_select_published" ON "public"."portal_pages" FOR SELECT TO "authenticated", "anon" USING (("status" = 'published'::"public"."publication_status"));



CREATE POLICY "portal_pages_update_admin" ON "public"."portal_pages" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('portal.update'::"text")) WITH CHECK ("app"."has_permission"('portal.update'::"text"));



ALTER TABLE "public"."portal_section_versions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_section_versions_insert_admin" ON "public"."portal_section_versions" FOR INSERT TO "authenticated" WITH CHECK (("app"."has_permission"('portal.update'::"text") AND ("status" = 'draft'::"public"."publication_status")));



CREATE POLICY "portal_section_versions_select_admin" ON "public"."portal_section_versions" FOR SELECT TO "authenticated" USING ("app"."has_permission"('portal.view'::"text"));



CREATE POLICY "portal_section_versions_select_published" ON "public"."portal_section_versions" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."portal_sections" "s"
  WHERE (("s"."id" = "portal_section_versions"."section_id") AND ("s"."published_version_id" = "portal_section_versions"."id")))));



CREATE POLICY "portal_section_versions_update_admin" ON "public"."portal_section_versions" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('portal.update'::"text")) WITH CHECK ("app"."has_permission"('portal.update'::"text"));



ALTER TABLE "public"."portal_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_sections_delete_admin" ON "public"."portal_sections" FOR DELETE TO "authenticated" USING ("app"."has_permission"('portal.update'::"text"));



CREATE POLICY "portal_sections_insert_admin" ON "public"."portal_sections" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('portal.update'::"text"));



CREATE POLICY "portal_sections_select_admin" ON "public"."portal_sections" FOR SELECT TO "authenticated" USING ("app"."has_permission"('portal.view'::"text"));



CREATE POLICY "portal_sections_select_published" ON "public"."portal_sections" FOR SELECT TO "authenticated", "anon" USING (("is_visible" AND ("status" = 'published'::"public"."publication_status") AND (EXISTS ( SELECT 1
   FROM "public"."portal_pages" "p"
  WHERE (("p"."id" = "portal_sections"."page_id") AND ("p"."status" = 'published'::"public"."publication_status"))))));



CREATE POLICY "portal_sections_update_admin" ON "public"."portal_sections" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('portal.update'::"text")) WITH CHECK ("app"."has_permission"('portal.update'::"text"));



ALTER TABLE "public"."portal_theme" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "portal_theme_insert_admin" ON "public"."portal_theme" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('portal.manage_theme'::"text"));



CREATE POLICY "portal_theme_select_active" ON "public"."portal_theme" FOR SELECT TO "authenticated", "anon" USING ("is_active");



CREATE POLICY "portal_theme_select_admin" ON "public"."portal_theme" FOR SELECT TO "authenticated" USING ("app"."has_permission"('portal.view'::"text"));



CREATE POLICY "portal_theme_update_admin" ON "public"."portal_theme" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('portal.manage_theme'::"text")) WITH CHECK ("app"."has_permission"('portal.manage_theme'::"text"));



ALTER TABLE "public"."profit_distribution_allocations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profit_distribution_allocations_select_admin" ON "public"."profit_distribution_allocations" FOR SELECT TO "authenticated" USING (("app"."has_permission"('profit_distributions.view'::"text") OR "app"."has_permission"('profit_distribution_payments.view'::"text")));



CREATE POLICY "profit_distribution_allocations_select_self" ON "public"."profit_distribution_allocations" FOR SELECT TO "authenticated" USING (("investor_id" = "app"."current_user_id"()));



ALTER TABLE "public"."profit_distribution_payment_proofs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profit_distribution_payment_proofs_insert_admin" ON "public"."profit_distribution_payment_proofs" FOR INSERT TO "authenticated" WITH CHECK (("app"."has_permission"('profit_distribution_payments.upload_proof'::"text") AND ("uploaded_by" = "app"."current_user_id"())));



CREATE POLICY "profit_distribution_payment_proofs_no_public_access" ON "public"."profit_distribution_payment_proofs" TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "profit_distribution_payment_proofs_select_admin" ON "public"."profit_distribution_payment_proofs" FOR SELECT TO "authenticated" USING ("app"."has_permission"('profit_distribution_payments.view'::"text"));



CREATE POLICY "profit_distribution_payment_proofs_select_self" ON "public"."profit_distribution_payment_proofs" FOR SELECT TO "authenticated" USING (("investor_id" = "app"."current_user_id"()));



CREATE POLICY "profit_distribution_payment_proofs_update_admin" ON "public"."profit_distribution_payment_proofs" FOR UPDATE TO "authenticated" USING (("app"."has_permission"('profit_distribution_payments.replace_proof'::"text") OR "app"."has_permission"('profit_distribution_payments.mark_paid'::"text"))) WITH CHECK (("app"."has_permission"('profit_distribution_payments.replace_proof'::"text") OR "app"."has_permission"('profit_distribution_payments.mark_paid'::"text")));



ALTER TABLE "public"."profit_distributions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profit_distributions_insert_admin" ON "public"."profit_distributions" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('profit_distributions.create'::"text"));



CREATE POLICY "profit_distributions_select_admin" ON "public"."profit_distributions" FOR SELECT TO "authenticated" USING ("app"."has_permission"('profit_distributions.view'::"text"));



CREATE POLICY "profit_distributions_update_admin" ON "public"."profit_distributions" FOR UPDATE TO "authenticated" USING (("app"."has_permission"('profit_distributions.update'::"text") OR "app"."has_permission"('profit_distributions.approve'::"text") OR "app"."has_permission"('profit_distributions.publish'::"text"))) WITH CHECK (("app"."has_permission"('profit_distributions.update'::"text") OR "app"."has_permission"('profit_distributions.approve'::"text") OR "app"."has_permission"('profit_distributions.publish'::"text")));



ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rate_limits_client_deny" ON "public"."rate_limits" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."realtime_emit_failures" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "realtime_emit_failures_select_admin" ON "public"."realtime_emit_failures" FOR SELECT TO "authenticated" USING ("app"."has_permission"('settings.view'::"text"));



ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permissions_delete" ON "public"."role_permissions" FOR DELETE TO "authenticated" USING ("app"."has_permission"('roles.update'::"text"));



CREATE POLICY "role_permissions_insert" ON "public"."role_permissions" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('roles.update'::"text"));



CREATE POLICY "role_permissions_select" ON "public"."role_permissions" FOR SELECT TO "authenticated" USING ("app"."has_permission"('roles.view'::"text"));



ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "roles_delete" ON "public"."roles" FOR DELETE TO "authenticated" USING (("app"."has_permission"('roles.delete'::"text") AND (NOT "is_system")));



CREATE POLICY "roles_insert" ON "public"."roles" FOR INSERT TO "authenticated" WITH CHECK (("app"."has_permission"('roles.create'::"text") AND (NOT "is_system")));



CREATE POLICY "roles_select" ON "public"."roles" FOR SELECT TO "authenticated" USING ("app"."has_permission"('roles.view'::"text"));



CREATE POLICY "roles_select_auth_admin" ON "public"."roles" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "roles_update" ON "public"."roles" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('roles.update'::"text")) WITH CHECK ("app"."has_permission"('roles.update'::"text"));



ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "settings_client_deny" ON "public"."settings" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "site_settings_insert_admin" ON "public"."site_settings" FOR INSERT TO "authenticated" WITH CHECK ("app"."has_permission"('settings.update'::"text"));



CREATE POLICY "site_settings_select_admin" ON "public"."site_settings" FOR SELECT TO "authenticated" USING ("app"."has_permission"('settings.view'::"text"));



CREATE POLICY "site_settings_select_public" ON "public"."site_settings" FOR SELECT TO "authenticated", "anon" USING ("is_public");



CREATE POLICY "site_settings_update_admin" ON "public"."site_settings" FOR UPDATE TO "authenticated" USING ("app"."has_permission"('settings.update'::"text")) WITH CHECK ("app"."has_permission"('settings.update'::"text"));



ALTER TABLE "public"."thread_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "thread_participants_select_admin" ON "public"."thread_participants" FOR SELECT TO "authenticated" USING ("app"."has_permission"('messages.view'::"text"));



CREATE POLICY "thread_participants_select_own" ON "public"."thread_participants" FOR SELECT TO "authenticated" USING (("user_id" = "app"."current_user_id"()));



ALTER TABLE "public"."user_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_accounts_select_admin" ON "public"."user_accounts" FOR SELECT TO "authenticated" USING (((("account_type" = 'investor'::"public"."account_type") AND "app"."has_permission"('investors.view'::"text")) OR (("account_type" = 'admin'::"public"."account_type") AND "app"."has_permission"('admins.view'::"text"))));



CREATE POLICY "user_accounts_select_auth_admin" ON "public"."user_accounts" FOR SELECT TO "supabase_auth_admin" USING (true);



CREATE POLICY "user_accounts_select_self" ON "public"."user_accounts" FOR SELECT TO "authenticated" USING (("id" = "app"."current_user_id"()));



CREATE POLICY "user_accounts_update_admin" ON "public"."user_accounts" FOR UPDATE TO "authenticated" USING (((("account_type" = 'investor'::"public"."account_type") AND "app"."has_permission"('investors.update'::"text")) OR (("account_type" = 'admin'::"public"."account_type") AND "app"."has_permission"('admins.update'::"text")))) WITH CHECK (((("account_type" = 'investor'::"public"."account_type") AND "app"."has_permission"('investors.update'::"text")) OR (("account_type" = 'admin'::"public"."account_type") AND "app"."has_permission"('admins.update'::"text"))));



CREATE POLICY "user_accounts_update_self" ON "public"."user_accounts" FOR UPDATE TO "authenticated" USING ((("id" = "app"."current_user_id"()) AND ("status" = 'active'::"public"."account_status"))) WITH CHECK ((("id" = "app"."current_user_id"()) AND ("status" = 'active'::"public"."account_status")));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_client_deny" ON "public"."user_profiles" TO "authenticated", "anon" USING (false) WITH CHECK (false);



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_client_deny" ON "public"."user_roles" TO "authenticated", "anon" USING (false) WITH CHECK (false);



GRANT USAGE ON SCHEMA "app" TO "anon";
GRANT USAGE ON SCHEMA "app" TO "authenticated";
GRANT USAGE ON SCHEMA "app" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";



REVOKE ALL ON FUNCTION "app"."admin_role_key"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."assert_account_type"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."assert_role_assignable"("p_role_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."assert_section_content_kind"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."assign_company_profile_version_number"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."assign_document_version_number"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."assign_financial_version_number"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."assign_investor_reference"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."assign_section_version_number"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."bump_role_version"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."create_document_with_draft"("p_title" "text", "p_slug" "text", "p_kind" "public"."document_kind", "p_summary" "text", "p_visibility" "public"."visibility", "p_file_asset_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."create_document_with_draft"("p_title" "text", "p_slug" "text", "p_kind" "public"."document_kind", "p_summary" "text", "p_visibility" "public"."visibility", "p_file_asset_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "app"."create_investor_message_thread"("p_investor_id" "uuid", "p_subject" "text", "p_body" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."current_actor_type"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."current_investor_id"() FROM PUBLIC;



GRANT ALL ON FUNCTION "app"."current_user_id"() TO "anon";
GRANT ALL ON FUNCTION "app"."current_user_id"() TO "authenticated";



REVOKE ALL ON FUNCTION "app"."document_workflow_permission_allowed"("p_target" "public"."publication_status") FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."effective_permissions"("p_admin_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."emit_document_events"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."emit_document_grant_events"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."emit_event"("p_topic" "text", "p_kind" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_actor_type" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."emit_financial_events"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."emit_inquiry_events"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."emit_investor_events"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."emit_message_events"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."emit_notification_events"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."emit_portal_navigation_events"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."emit_portal_page_events"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."emit_portal_section_events"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."emit_portal_theme_events"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."guard_admin_change"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."guard_admin_delete"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."guard_financial_line_item"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."guard_financial_period_update"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."guard_role_delete"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."guard_role_permission_change"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."has_permission"("p_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."has_permission"("p_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."investor_granted_document"("p_document_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."investor_status_record"() FROM PUBLIC;



GRANT ALL ON FUNCTION "app"."investor_transition_allowed"("p_from" "public"."investor_status", "p_to" "public"."investor_status") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."is_admin"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."is_investor"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."participates_in_thread"("p_thread_id" "uuid") FROM PUBLIC;



GRANT ALL ON FUNCTION "app"."publication_transition_allowed"("p_from" "public"."publication_status", "p_to" "public"."publication_status") TO "authenticated";



GRANT ALL ON FUNCTION "app"."topic_admin"() TO "anon";
GRANT ALL ON FUNCTION "app"."topic_admin"() TO "authenticated";



GRANT ALL ON FUNCTION "app"."topic_all_investors"() TO "anon";
GRANT ALL ON FUNCTION "app"."topic_all_investors"() TO "authenticated";



GRANT ALL ON FUNCTION "app"."topic_investor"("p_investor_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "app"."topic_investor"("p_investor_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "app"."topic_portal"() TO "anon";
GRANT ALL ON FUNCTION "app"."topic_portal"() TO "authenticated";



GRANT ALL ON FUNCTION "app"."topic_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "app"."topic_user"("p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "app"."touch_thread_on_message"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "app"."transition_portal_page"("p_page_id" "uuid", "p_to_status" "public"."publication_status") FROM PUBLIC;
GRANT ALL ON FUNCTION "app"."transition_portal_page"("p_page_id" "uuid", "p_to_status" "public"."publication_status") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."activate_admin_account"("p_admin_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."activate_admin_account"("p_admin_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."consume_rate_limit"("p_bucket" "text", "p_limit" integer, "p_window_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_rate_limit"("p_bucket" "text", "p_limit" integer, "p_window_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_kind" "public"."notification_kind", "p_title" "text", "p_body" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_action_url" "text", "p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_kind" "public"."notification_kind", "p_title" "text", "p_body" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_action_url" "text", "p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_principal"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_principal"() TO "service_role";
GRANT ALL ON FUNCTION "public"."current_principal"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_principal"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



REVOKE ALL ON FUNCTION "public"."deactivate_admin_account"("p_admin_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."deactivate_admin_account"("p_admin_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."provision_admin_account"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_role_id" "uuid", "p_title" "text", "p_created_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."provision_admin_account"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_role_id" "uuid", "p_title" "text", "p_created_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."provision_investor_account"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_legal_name" "text", "p_investor_type" "public"."investor_type", "p_phone" "text", "p_country" "text", "p_city" "text", "p_address" "text", "p_organization_name" "text", "p_organization_role" "text", "p_application_note" "text", "p_identity_number_hash" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."provision_investor_account"("p_user_id" "uuid", "p_email" "text", "p_full_name" "text", "p_legal_name" "text", "p_investor_type" "public"."investor_type", "p_phone" "text", "p_country" "text", "p_city" "text", "p_address" "text", "p_organization_name" "text", "p_organization_role" "text", "p_application_note" "text", "p_identity_number_hash" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."prune_rate_limits"("p_older_than_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."prune_rate_limits"("p_older_than_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_ownership_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."touch_profit_distribution_payment_proof"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."touch_profit_distribution_payment_proof"() TO "service_role";



GRANT ALL ON FUNCTION "public"."transition_investor"("p_investor_id" "uuid", "p_to_status" "public"."investor_status", "p_reason" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."transition_investor"("p_investor_id" "uuid", "p_to_status" "public"."investor_status", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_admin_account"("p_admin_id" "uuid", "p_full_name" "text", "p_role_id" "uuid", "p_title" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_admin_account"("p_admin_id" "uuid", "p_full_name" "text", "p_role_id" "uuid", "p_title" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_role_permissions_atomic"("p_role_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_ids" "uuid"[], "p_expected_permission_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_role_permissions_atomic"("p_role_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_ids" "uuid"[], "p_expected_permission_version" integer) TO "service_role";
GRANT ALL ON FUNCTION "public"."update_role_permissions_atomic"("p_role_id" "uuid", "p_name" "text", "p_description" "text", "p_permission_ids" "uuid"[], "p_expected_permission_version" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."validate_profit_distribution_payment_proof"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_profit_distribution_payment_proof"() TO "service_role";



GRANT ALL ON TABLE "public"."admins" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."admins" TO "authenticated";
GRANT SELECT ON TABLE "public"."admins" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."audit_logs" TO "authenticated";



GRANT ALL ON TABLE "public"."broadcasts" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."broadcasts" TO "authenticated";



GRANT ALL ON TABLE "public"."company_profile_versions" TO "service_role";
GRANT SELECT ON TABLE "public"."company_profile_versions" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."company_profile_versions" TO "authenticated";



GRANT ALL ON TABLE "public"."company_profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."company_profiles" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."company_profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."data_room_access_logs" TO "service_role";



GRANT ALL ON TABLE "public"."data_room_categories" TO "service_role";



GRANT ALL ON TABLE "public"."data_room_documents" TO "service_role";



GRANT ALL ON TABLE "public"."document_access_grants" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."document_access_grants" TO "authenticated";



GRANT ALL ON TABLE "public"."document_versions" TO "service_role";
GRANT SELECT ON TABLE "public"."document_versions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."document_versions" TO "authenticated";



GRANT ALL ON TABLE "public"."documents" TO "service_role";
GRANT SELECT ON TABLE "public"."documents" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."documents" TO "authenticated";



GRANT ALL ON TABLE "public"."financial_kpis" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."financial_kpis" TO "authenticated";



GRANT ALL ON TABLE "public"."financial_line_items" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."financial_line_items" TO "authenticated";



GRANT ALL ON TABLE "public"."financial_periods" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."financial_periods" TO "authenticated";



GRANT ALL ON TABLE "public"."financial_report_versions" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."financial_report_versions" TO "authenticated";



GRANT ALL ON TABLE "public"."financial_reports" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."financial_reports" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."investor_reference_seq" TO "service_role";



GRANT ALL ON TABLE "public"."investor_requests" TO "service_role";



GRANT ALL ON TABLE "public"."investor_status_history" TO "service_role";
GRANT SELECT ON TABLE "public"."investor_status_history" TO "authenticated";



GRANT ALL ON TABLE "public"."investor_tokens" TO "anon";
GRANT ALL ON TABLE "public"."investor_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."investor_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."investors" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."investors" TO "authenticated";
GRANT SELECT ON TABLE "public"."investors" TO "supabase_auth_admin";



GRANT UPDATE("legal_name") ON TABLE "public"."investors" TO "authenticated";



GRANT UPDATE("city") ON TABLE "public"."investors" TO "authenticated";



GRANT UPDATE("address") ON TABLE "public"."investors" TO "authenticated";



GRANT UPDATE("organization_name") ON TABLE "public"."investors" TO "authenticated";



GRANT UPDATE("organization_role") ON TABLE "public"."investors" TO "authenticated";



GRANT UPDATE("application_note") ON TABLE "public"."investors" TO "authenticated";



GRANT ALL ON TABLE "public"."kv_store_b620c355" TO "anon";
GRANT ALL ON TABLE "public"."kv_store_b620c355" TO "authenticated";
GRANT ALL ON TABLE "public"."kv_store_b620c355" TO "service_role";



GRANT ALL ON TABLE "public"."legacy_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."legacy_investor_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."legacy_investors" TO "service_role";



GRANT ALL ON TABLE "public"."media_assets" TO "service_role";
GRANT SELECT ON TABLE "public"."media_assets" TO "anon";
GRANT SELECT ON TABLE "public"."media_assets" TO "authenticated";



GRANT ALL ON TABLE "public"."meeting_bookings" TO "service_role";



GRANT ALL ON TABLE "public"."meetings" TO "service_role";



GRANT ALL ON TABLE "public"."message_attachments" TO "service_role";
GRANT SELECT ON TABLE "public"."message_attachments" TO "authenticated";



GRANT ALL ON TABLE "public"."message_reads" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."message_reads" TO "authenticated";



GRANT ALL ON TABLE "public"."message_threads" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."message_threads" TO "authenticated";



GRANT ALL ON TABLE "public"."messages" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."messages" TO "authenticated";



GRANT ALL ON TABLE "public"."notification_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."notification_preferences" TO "authenticated";



GRANT ALL ON TABLE "public"."notifications" TO "service_role";
GRANT SELECT ON TABLE "public"."notifications" TO "authenticated";



GRANT UPDATE("read_at") ON TABLE "public"."notifications" TO "authenticated";



GRANT ALL ON TABLE "public"."ownership_holdings" TO "service_role";
GRANT SELECT ON TABLE "public"."ownership_holdings" TO "authenticated";



GRANT ALL ON TABLE "public"."ownership_inheritance" TO "service_role";



GRANT ALL ON TABLE "public"."ownership_offerings" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."ownership_offerings" TO "authenticated";



GRANT ALL ON TABLE "public"."ownership_transfers" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "service_role";
GRANT SELECT ON TABLE "public"."permissions" TO "authenticated";



GRANT ALL ON TABLE "public"."portal_content" TO "anon";
GRANT ALL ON TABLE "public"."portal_content" TO "authenticated";
GRANT ALL ON TABLE "public"."portal_content" TO "service_role";



GRANT ALL ON TABLE "public"."portal_inquiries" TO "service_role";
GRANT INSERT ON TABLE "public"."portal_inquiries" TO "anon";
GRANT SELECT,UPDATE ON TABLE "public"."portal_inquiries" TO "authenticated";



GRANT ALL ON TABLE "public"."portal_navigation" TO "service_role";
GRANT SELECT ON TABLE "public"."portal_navigation" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_navigation" TO "authenticated";



GRANT ALL ON TABLE "public"."portal_pages" TO "service_role";
GRANT SELECT ON TABLE "public"."portal_pages" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_pages" TO "authenticated";



GRANT ALL ON TABLE "public"."portal_section_versions" TO "service_role";
GRANT SELECT ON TABLE "public"."portal_section_versions" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."portal_section_versions" TO "authenticated";



GRANT ALL ON TABLE "public"."portal_sections" TO "service_role";
GRANT SELECT ON TABLE "public"."portal_sections" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."portal_sections" TO "authenticated";



GRANT ALL ON TABLE "public"."portal_theme" TO "service_role";
GRANT SELECT ON TABLE "public"."portal_theme" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."portal_theme" TO "authenticated";



GRANT ALL ON TABLE "public"."profit_distribution_allocations" TO "service_role";
GRANT SELECT ON TABLE "public"."profit_distribution_allocations" TO "authenticated";



GRANT ALL ON TABLE "public"."profit_distribution_payment_proofs" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."profit_distribution_payment_proofs" TO "authenticated";



GRANT ALL ON TABLE "public"."profit_distributions" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."profit_distributions" TO "authenticated";



GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."realtime_emit_failures" TO "service_role";
GRANT SELECT ON TABLE "public"."realtime_emit_failures" TO "authenticated";



GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."role_permissions" TO "authenticated";



GRANT ALL ON TABLE "public"."roles" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."roles" TO "authenticated";
GRANT SELECT ON TABLE "public"."roles" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."site_settings" TO "service_role";
GRANT SELECT ON TABLE "public"."site_settings" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."site_settings" TO "authenticated";



GRANT ALL ON TABLE "public"."thread_participants" TO "service_role";
GRANT SELECT ON TABLE "public"."thread_participants" TO "authenticated";



GRANT ALL ON TABLE "public"."user_accounts" TO "service_role";
GRANT SELECT ON TABLE "public"."user_accounts" TO "authenticated";
GRANT SELECT ON TABLE "public"."user_accounts" TO "supabase_auth_admin";



GRANT UPDATE("full_name") ON TABLE "public"."user_accounts" TO "authenticated";



GRANT UPDATE("phone") ON TABLE "public"."user_accounts" TO "authenticated";



GRANT UPDATE("avatar_path") ON TABLE "public"."user_accounts" TO "authenticated";



GRANT UPDATE("locale") ON TABLE "public"."user_accounts" TO "authenticated";



GRANT UPDATE("timezone") ON TABLE "public"."user_accounts" TO "authenticated";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







