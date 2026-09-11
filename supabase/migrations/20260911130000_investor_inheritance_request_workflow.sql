-- Investor inheritance request workflow: validated, cancellable, and RLS-safe.
create or replace function app.create_ownership_inheritance_request(
  p_holding_id uuid,
  p_beneficiary_name text,
  p_beneficiary_email text default null,
  p_beneficiary_phone text default null,
  p_units integer default null,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := app.current_user_id(); v_h public.ownership_holdings; v_units integer; v_id uuid;
begin
  if v_user is null then raise exception 'Anda harus masuk sebagai investor.' using errcode='42501'; end if;
  if not exists (select 1 from public.investors where id=v_user and status in ('approved','active')) then
    raise exception 'Investor tidak memiliki akses.' using errcode='42501';
  end if;
  if length(btrim(coalesce(p_beneficiary_name,'')))=0 then raise exception 'Nama pewaris wajib diisi.' using errcode='22023'; end if;
  select * into v_h from public.ownership_holdings where id=p_holding_id for update;
  if not found or v_h.investor_id <> v_user then raise exception 'Kepemilikan tidak ditemukan atau bukan milik Anda.' using errcode='42501'; end if;
  if v_h.status <> 'active' then raise exception 'Hanya kepemilikan aktif yang dapat diwariskan.' using errcode='22023'; end if;
  v_units := coalesce(p_units, v_h.units);
  if v_units <= 0 or v_units > v_h.units then raise exception 'Jumlah unit pewarisan tidak valid.' using errcode='22023'; end if;
  if exists (select 1 from public.ownership_inheritance where holding_id=p_holding_id and status in ('pending','approved')) then
    raise exception 'Masih ada pengajuan pewarisan aktif untuk kepemilikan ini.' using errcode='23505';
  end if;
  insert into public.ownership_inheritance(holding_id,current_investor_id,beneficiary_name,beneficiary_email,beneficiary_phone,units,status,notes)
  values(p_holding_id,v_user,btrim(p_beneficiary_name),nullif(btrim(coalesce(p_beneficiary_email,'')),''),nullif(btrim(coalesce(p_beneficiary_phone,'')),''),v_units,'pending',nullif(btrim(coalesce(p_notes,'')),''))
  returning id into v_id;
  return v_id;
end; $$;

create or replace function app.list_my_ownership_inheritance()
returns setof public.ownership_inheritance
language sql stable security definer set search_path=''
as $$ select oi.* from public.ownership_inheritance oi where oi.current_investor_id=app.current_user_id() order by oi.requested_at desc $$;

create or replace function app.cancel_ownership_inheritance_request(p_request_id uuid)
returns void language plpgsql security definer set search_path=''
as $$
begin
  if not exists (select 1 from public.ownership_inheritance where id=p_request_id and current_investor_id=app.current_user_id() and status='pending') then
    raise exception 'Pengajuan tidak ditemukan atau tidak dapat dibatalkan.' using errcode='42501';
  end if;
  update public.ownership_inheritance set status='cancelled', updated_at=now() where id=p_request_id;
end; $$;

grant execute on function app.create_ownership_inheritance_request(uuid,text,text,text,integer,text) to authenticated;
grant execute on function app.list_my_ownership_inheritance() to authenticated;
grant execute on function app.cancel_ownership_inheritance_request(uuid) to authenticated;

grant select on public.ownership_inheritance to authenticated;
drop policy if exists ownership_inheritance_investor_read on public.ownership_inheritance;
create policy ownership_inheritance_investor_read on public.ownership_inheritance for select to authenticated
using (current_investor_id=app.current_user_id());
