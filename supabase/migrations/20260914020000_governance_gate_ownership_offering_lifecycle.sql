-- =============================================================================
-- Ownership offering lifecycle enforcement + D05 Reserved Matters execution.
--
-- Security goals:
--   * editing offering content must never allow a caller to change lifecycle status;
--   * every lifecycle transition uses its dedicated RBAC permission;
--   * draft -> open (new ownership/share offering) is a D05 controlled action;
--   * governance approval, canonical status mutation, and approval consumption occur
--     atomically in one SECURITY DEFINER transaction;
--   * all other transitions remain permission-gated but are not treated as Reserved
--     Matters unless policy explicitly requires that in a future ratified rule.
-- =============================================================================

-- Generic authenticated UPDATE remains available only for editable content fields.
-- Removing table-level UPDATE is critical: PostgreSQL table-level UPDATE would also
-- authorize the status column and therefore bypass lifecycle permissions/RPCs.
revoke update on table public.ownership_offerings from authenticated;

grant update (
  name,
  code,
  total_offered_bps,
  unit_ownership_bps,
  unit_price,
  total_units,
  distribution_cadence_months,
  transfer_lock_months,
  effective_from,
  effective_until,
  description,
  updated_by
) on table public.ownership_offerings to authenticated;

create or replace function app.transition_ownership_offering(
  p_offering_id uuid,
  p_target_status public.ownership_offering_status
)
returns public.ownership_offerings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := app.current_user_id();
  v_offering public.ownership_offerings;
  v_permission text;
  v_audit_action text;
  v_matter_id uuid;
begin
  if v_actor is null then
    raise exception 'Autentikasi diperlukan untuk mengubah lifecycle penawaran.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.admins a
    where a.id = v_actor
      and a.is_active = true
  ) then
    raise exception 'Admin aktif diperlukan untuk mengubah lifecycle penawaran.' using errcode = '42501';
  end if;

  select oo.*
  into v_offering
  from public.ownership_offerings oo
  where oo.id = p_offering_id
  for update;

  if not found then
    raise exception 'Penawaran kepemilikan tidak ditemukan.' using errcode = 'P0002';
  end if;

  -- Resolve the only allowed lifecycle edges and their dedicated permission.
  if v_offering.status = 'draft' and p_target_status = 'open' then
    v_permission := 'ownership_offerings.publish';
    v_audit_action := 'ownership_offering.publish';
  elsif v_offering.status = 'open' and p_target_status = 'paused' then
    v_permission := 'ownership_offerings.pause';
    v_audit_action := 'ownership_offering.pause';
  elsif v_offering.status = 'paused' and p_target_status = 'open' then
    v_permission := 'ownership_offerings.resume';
    v_audit_action := 'ownership_offering.resume';
  elsif v_offering.status in ('open', 'paused') and p_target_status = 'closed' then
    v_permission := 'ownership_offerings.close';
    v_audit_action := 'ownership_offering.close';
  elsif v_offering.status = 'closed' and p_target_status = 'archived' then
    v_permission := 'ownership_offerings.archive';
    v_audit_action := 'ownership_offering.archive';
  else
    raise exception 'Transisi status penawaran dari % ke % tidak diizinkan.', v_offering.status, p_target_status
      using errcode = '55000';
  end if;

  if not app.has_permission(v_permission) then
    raise exception 'Anda tidak memiliki izin % untuk transisi penawaran ini.', v_permission
      using errcode = '42501';
  end if;

  -- Publishing is the controlled action for issuing/opening a new ownership offer.
  -- Validate the canonical economic contract in the database because this RPC is
  -- callable independently from the TypeScript service layer.
  if v_offering.status = 'draft' and p_target_status = 'open' then
    if not app.has_permission('reserved_matters.execute') then
      raise exception 'Eksekusi penerbitan penawaran memerlukan izin Reserved Matters execute.'
        using errcode = '42501';
    end if;

    if btrim(v_offering.name) = '' then
      raise exception 'Nama penawaran wajib diisi sebelum diterbitkan.' using errcode = '22023';
    end if;

    if v_offering.code !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
      raise exception 'Kode penawaran tidak valid untuk diterbitkan.' using errcode = '22023';
    end if;

    if v_offering.total_offered_bps <= 0
      or v_offering.total_offered_bps > 10000
      or v_offering.unit_ownership_bps <= 0
      or v_offering.unit_ownership_bps > 10000
      or v_offering.total_units <= 0
      or v_offering.unit_ownership_bps * v_offering.total_units <> v_offering.total_offered_bps
      or v_offering.unit_price <= 0
      or v_offering.distribution_cadence_months < 1
      or v_offering.distribution_cadence_months > 24
      or v_offering.transfer_lock_months < 36
      or v_offering.transfer_lock_months > 120
    then
      raise exception 'Kontrak ekonomi penawaran tidak valid untuk diterbitkan.' using errcode = '22023';
    end if;

    if v_offering.effective_from is not null
      and v_offering.effective_until is not null
      and v_offering.effective_until <= v_offering.effective_from
    then
      raise exception 'Tanggal efektif penawaran tidak valid.' using errcode = '22023';
    end if;

    v_matter_id := app.require_reserved_matter_authorization(
      'ownership_offerings.publish',
      'ownership_offering',
      p_offering_id
    );
  end if;

  update public.ownership_offerings oo
  set
    status = p_target_status,
    updated_by = v_actor,
    effective_from = case
      when v_offering.status = 'draft' and p_target_status = 'open'
        then coalesce(oo.effective_from, now())
      else oo.effective_from
    end
  where oo.id = p_offering_id
  returning oo.* into v_offering;

  -- Consume only after the canonical mutation succeeds. Any later exception in
  -- this function rolls back both the status mutation and the consumption.
  if v_matter_id is not null then
    perform app.consume_reserved_matter_authorization(v_matter_id);
  end if;

  insert into public.audit_logs (
    actor_id,
    actor_type,
    action,
    entity_type,
    entity_id,
    summary,
    changes
  )
  values (
    v_actor,
    app.current_actor_type(),
    v_audit_action,
    'ownership_offering',
    p_offering_id,
    'Mengubah lifecycle penawaran kepemilikan melalui RPC terkontrol.',
    jsonb_build_object(
      'from_status', v_offering.status,
      'to_status', p_target_status,
      'reserved_matter_id', v_matter_id
    )
  );

  return v_offering;
end;
$$;

revoke all on function app.transition_ownership_offering(uuid, public.ownership_offering_status)
  from public, anon, authenticated;
grant execute on function app.transition_ownership_offering(uuid, public.ownership_offering_status)
  to authenticated;

comment on function app.transition_ownership_offering(uuid, public.ownership_offering_status) is
  'Canonical ownership-offering lifecycle RPC. draft->open atomically enforces and consumes D05 Reserved Matters approval for ownership_offerings.publish.';
