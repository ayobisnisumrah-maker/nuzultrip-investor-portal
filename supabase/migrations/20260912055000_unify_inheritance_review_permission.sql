-- =============================================================================
-- Keep inheritance review lifecycle under the existing approve permission.
-- Reject/complete are review decisions in the same workflow, so no extra RBAC
-- vocabulary is required. Remove transient permission rows introduced earlier
-- in this unreleased migration chain and harden RPC checks accordingly.
-- =============================================================================

delete from public.role_permissions
where permission_id in (
  select id
  from public.permissions
  where key in (
    'ownership_inheritance.reject',
    'ownership_inheritance.complete'
  )
);

delete from public.permissions
where key in (
  'ownership_inheritance.reject',
  'ownership_inheritance.complete'
);

create or replace function app.reject_ownership_inheritance(
  p_request_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.ownership_inheritance;
begin
  if not app.has_permission('ownership_inheritance.approve') then
    raise exception 'Anda tidak memiliki izin untuk menolak pewarisan kepemilikan.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Alasan penolakan wajib diisi.' using errcode = '22023';
  end if;

  select oi.* into v_request
  from public.ownership_inheritance oi
  where oi.id = p_request_id
  for update;

  if not found then
    raise exception 'Pengajuan pewarisan tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_request.status not in ('pending', 'approved') then
    raise exception 'Pengajuan pada tahap ini tidak dapat ditolak.' using errcode = '22023';
  end if;

  update public.ownership_inheritance
  set
    status = 'rejected',
    rejection_reason = btrim(p_reason),
    updated_at = now()
  where id = p_request_id;
end;
$$;

create or replace function app.complete_ownership_inheritance(
  p_request_id uuid,
  p_beneficiary_investor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := app.current_user_id();
  v_request public.ownership_inheritance;
  v_source public.ownership_holdings;
  v_offering public.ownership_offerings;
  v_new_holding_id uuid;
  v_transferred_bps integer;
  v_remaining_units integer;
  v_remaining_bps integer;
begin
  if not app.has_permission('ownership_inheritance.approve') then
    raise exception 'Anda tidak memiliki izin untuk menyelesaikan pewarisan kepemilikan.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.investors i
    where i.id = p_beneficiary_investor_id
      and i.status in ('approved', 'active')
  ) then
    raise exception 'Investor penerima harus berstatus approved atau active.' using errcode = '22023';
  end if;

  select oi.* into v_request
  from public.ownership_inheritance oi
  where oi.id = p_request_id
  for update;

  if not found then
    raise exception 'Pengajuan pewarisan tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_request.status <> 'approved' then
    raise exception 'Hanya pengajuan yang telah disetujui yang dapat diselesaikan.' using errcode = '22023';
  end if;

  if v_request.current_investor_id = p_beneficiary_investor_id then
    raise exception 'Investor asal dan investor penerima tidak boleh sama.' using errcode = '22023';
  end if;

  select h.* into v_source
  from public.ownership_holdings h
  where h.id = v_request.holding_id
  for update;

  if not found then
    raise exception 'Holding sumber tidak ditemukan.' using errcode = 'P0002';
  end if;

  if v_source.status <> 'active'
     or v_source.investor_id <> v_request.current_investor_id then
    raise exception 'Holding sumber tidak lagi valid untuk penyelesaian pewarisan.' using errcode = '22023';
  end if;

  if v_source.units < v_request.units then
    raise exception 'Unit holding sumber tidak mencukupi.' using errcode = '22023';
  end if;

  select o.* into v_offering
  from public.ownership_offerings o
  where o.id = v_source.offering_id;

  if not found then
    raise exception 'Penawaran kepemilikan terkait tidak ditemukan.' using errcode = 'P0002';
  end if;

  v_transferred_bps := v_request.units * v_offering.unit_ownership_bps;
  v_remaining_units := v_source.units - v_request.units;
  v_remaining_bps := v_source.ownership_bps - v_transferred_bps;

  if v_transferred_bps <= 0 or v_transferred_bps > v_source.ownership_bps then
    raise exception 'Porsi kepemilikan hasil pewarisan tidak valid.' using errcode = '22023';
  end if;

  insert into public.ownership_holdings (
    offering_id,
    investor_id,
    units,
    ownership_bps,
    acquisition_at,
    transfer_eligible_at,
    status,
    acquisition_reference,
    notes,
    created_by,
    updated_by
  )
  values (
    v_source.offering_id,
    p_beneficiary_investor_id,
    v_request.units,
    v_transferred_bps,
    now(),
    greatest(now(), v_source.transfer_eligible_at),
    'active',
    'INH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
    'Kepemilikan hasil penyelesaian pewarisan.',
    v_admin_id,
    v_admin_id
  )
  returning id into v_new_holding_id;

  if v_remaining_units = 0 then
    update public.ownership_holdings
    set
      status = 'transferred',
      updated_by = v_admin_id,
      updated_at = now()
    where id = v_source.id;
  else
    update public.ownership_holdings
    set
      units = v_remaining_units,
      ownership_bps = v_remaining_bps,
      updated_by = v_admin_id,
      updated_at = now()
    where id = v_source.id;
  end if;

  update public.ownership_inheritance
  set
    beneficiary_investor_id = p_beneficiary_investor_id,
    status = 'completed',
    completed_at = now(),
    completed_by = v_admin_id,
    updated_at = now()
  where id = p_request_id;

  return v_new_holding_id;
end;
$$;

revoke all on function app.reject_ownership_inheritance(uuid,text) from public;
revoke all on function app.complete_ownership_inheritance(uuid,uuid) from public;
grant execute on function app.reject_ownership_inheritance(uuid,text) to authenticated;
grant execute on function app.complete_ownership_inheritance(uuid,uuid) to authenticated;
