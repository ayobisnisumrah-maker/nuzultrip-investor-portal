create or replace function app.emit_public_brand_profile_events()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor text := app.current_actor_type();
  profile_id uuid;
  is_public_change boolean := false;
begin
  if tg_table_name = 'company_profiles' then
    profile_id := case when tg_op = 'DELETE' then old.id else new.id end;
    is_public_change :=
      (tg_op <> 'DELETE' and new.status = 'published') or
      (tg_op = 'DELETE' and old.status = 'published') or
      (tg_op = 'UPDATE' and old.status = 'published');
  else
    profile_id := case when tg_op = 'DELETE' then old.company_profile_id else new.company_profile_id end;

    select p.status = 'published'
      into is_public_change
    from public.company_profiles p
    where p.id = profile_id;

    is_public_change := coalesce(is_public_change, false);
  end if;

  if is_public_change then
    perform app.emit_event(
      app.topic_portal(),
      'portal.theme_updated',
      'company_profile',
      profile_id,
      actor
    );
  end if;

  return null;
end;
$function$;

create or replace function app.emit_public_brand_setting_events()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  actor text := app.current_actor_type();
  setting_key text;
  public_before boolean := false;
  public_after boolean := false;
begin
  setting_key := case when tg_op = 'DELETE' then old.key else new.key end;

  if setting_key <> 'brand.logo' then
    return null;
  end if;

  if tg_op <> 'INSERT' then
    public_before := old.is_public;
  end if;

  if tg_op <> 'DELETE' then
    public_after := new.is_public;
  end if;

  if public_before or public_after then
    perform app.emit_event(
      app.topic_portal(),
      'portal.theme_updated',
      'site_setting',
      null,
      actor
    );
  end if;

  return null;
end;
$function$;

drop trigger if exists company_profiles_emit_public_brand_events on public.company_profiles;
create trigger company_profiles_emit_public_brand_events
after insert or update or delete on public.company_profiles
for each row execute function app.emit_public_brand_profile_events();

drop trigger if exists company_profile_versions_emit_public_brand_events on public.company_profile_versions;
create trigger company_profile_versions_emit_public_brand_events
after insert or update or delete on public.company_profile_versions
for each row execute function app.emit_public_brand_profile_events();

drop trigger if exists site_settings_emit_public_brand_events on public.site_settings;
create trigger site_settings_emit_public_brand_events
after insert or update or delete on public.site_settings
for each row execute function app.emit_public_brand_setting_events();
