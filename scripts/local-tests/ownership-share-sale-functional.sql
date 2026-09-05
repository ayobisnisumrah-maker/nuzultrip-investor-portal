begin;

do $$
declare
  v_admin uuid :=
    '10000000-0000-4000-8000-000000000001';

  v_investor_a uuid :=
    '20000000-0000-4000-8000-000000000001';

  v_investor_b uuid :=
    '20000000-0000-4000-8000-000000000002';

  v_offering uuid :=
    '30000000-0000-4000-8000-000000000001';

  v_holding_a uuid :=
    '40000000-0000-4000-8000-000000000001';

  v_super_admin_role uuid;

  v_sale_1 uuid;
  v_sale_2 uuid;
  v_sale_3 uuid;
  v_sale_full uuid;

  v_buyer_holding_1 uuid;
  v_buyer_holding_2 uuid;

  v_units integer;
  v_bps integer;
  v_holding_status public.ownership_holding_status;
  v_transfer_status public.ownership_transfer_status;

  v_total_units integer;
  v_total_bps integer;

  v_failed boolean;
begin
  raise notice '================================================';
  raise notice 'NUZULTRIP LOCAL SHARE-SALE FUNCTIONAL TEST';
  raise notice '================================================';

  select id
  into strict v_super_admin_role
  from public.roles
  where key = 'super_admin';

  if not has_function_privilege(
    'authenticated',
    'app.create_ownership_sale_request(uuid,integer,numeric,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated tidak memiliki EXECUTE create sale';
  end if;

  if not has_function_privilege(
    'authenticated',
    'app.cancel_ownership_sale_request(uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated tidak memiliki EXECUTE cancel sale';
  end if;

  if not has_function_privilege(
    'authenticated',
    'app.approve_ownership_sale(uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated tidak memiliki EXECUTE approve sale';
  end if;

  if not has_function_privilege(
    'authenticated',
    'app.reject_ownership_sale(uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated tidak memiliki EXECUTE reject sale';
  end if;

  if not has_function_privilege(
    'authenticated',
    'app.process_ownership_sale(uuid,uuid,numeric)',
    'EXECUTE'
  ) then
    raise exception 'authenticated tidak memiliki EXECUTE process sale';
  end if;

  if not has_function_privilege(
    'authenticated',
    'app.complete_ownership_sale(uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated tidak memiliki EXECUTE complete sale';
  end if;

  raise notice 'PASS 01 - seluruh RPC memiliki EXECUTE untuk authenticated';

  insert into auth.users (
    id,
    email,
    created_at,
    updated_at
  )
  values
    (
      v_admin,
      'admin-share-sale-local@nuzultrip.test',
      now(),
      now()
    ),
    (
      v_investor_a,
      'investor-a-local@nuzultrip.test',
      now(),
      now()
    ),
    (
      v_investor_b,
      'investor-b-local@nuzultrip.test',
      now(),
      now()
    );

  insert into public.user_accounts (
    id,
    account_type,
    status,
    email,
    full_name
  )
  values
    (
      v_admin,
      'admin',
      'active',
      'admin-share-sale-local@nuzultrip.test',
      'Admin Share Sale Lokal'
    ),
    (
      v_investor_a,
      'investor',
      'active',
      'investor-a-local@nuzultrip.test',
      'Investor A Lokal'
    ),
    (
      v_investor_b,
      'investor',
      'active',
      'investor-b-local@nuzultrip.test',
      'Investor B Lokal'
    );

  insert into public.admins (
    id,
    role_id,
    title,
    is_active
  )
  values (
    v_admin,
    v_super_admin_role,
    'Admin Test Share Sale',
    true
  );

  insert into public.investors (
    id,
    reference_code,
    status,
    investor_type,
    legal_name,
    country,
    applied_at,
    reviewed_at,
    reviewed_by,
    approved_at,
    activated_at
  )
  values
    (
      v_investor_a,
      'LOCAL-INV-A',
      'active',
      'individual',
      'Investor A Lokal',
      'ID',
      now() - interval '10 days',
      now() - interval '9 days',
      v_admin,
      now() - interval '8 days',
      now() - interval '7 days'
    ),
    (
      v_investor_b,
      'LOCAL-INV-B',
      'active',
      'individual',
      'Investor B Lokal',
      'ID',
      now() - interval '10 days',
      now() - interval '9 days',
      v_admin,
      now() - interval '8 days',
      now() - interval '7 days'
    );

  insert into public.ownership_offerings (
    id,
    name,
    code,
    status,
    total_offered_bps,
    unit_ownership_bps,
    unit_price,
    total_units,
    distribution_cadence_months,
    transfer_lock_months,
    effective_from,
    created_by,
    updated_by
  )
  values (
    v_offering,
    'Offering Functional Test Lokal',
    'local-sale-e2e',
    'open',
    5000,
    50,
    1000000,
    100,
    6,
    36,
    now() - interval '1 year',
    v_admin,
    v_admin
  );

  insert into public.ownership_holdings (
    id,
    offering_id,
    investor_id,
    units,
    ownership_bps,
    acquisition_at,
    transfer_eligible_at,
    status,
    acquisition_reference,
    created_by,
    updated_by
  )
  values (
    v_holding_a,
    v_offering,
    v_investor_a,
    10,
    500,
    now() - interval '4 years',
    now() - interval '1 day',
    'active',
    'LOCAL-HOLDING-A',
    v_admin,
    v_admin
  );

  raise notice 'PASS 02 - fixture Admin, Investor A/B, Offering dan Holding dibuat';

  perform set_config(
    'request.jwt.claim.sub',
    v_investor_a::text,
    true
  );

  if app.current_user_id() is distinct from v_investor_a then
    raise exception 'auth.uid simulation Investor A gagal';
  end if;

  select app.create_ownership_sale_request(
    v_holding_a,
    4,
    1000000,
    'Partial sale lokal'
  )
  into v_sale_1;

  if v_sale_1 is null then
    raise exception 'create sale pertama tidak mengembalikan ID';
  end if;

  select units, ownership_bps, status
  into v_units, v_bps, v_holding_status
  from public.ownership_holdings
  where id = v_holding_a;

  if v_units <> 10
     or v_bps <> 500
     or v_holding_status <> 'active'
  then
    raise exception
      'Holding berubah saat submit: units %, bps %, status %',
      v_units,
      v_bps,
      v_holding_status;
  end if;

  raise notice 'PASS 03 - submit 4 unit TIDAK mengurangi holding';

  select app.create_ownership_sale_request(
    v_holding_a,
    3,
    1000000,
    'Reservation test'
  )
  into v_sale_2;

  v_failed := false;

  begin
    perform app.create_ownership_sale_request(
      v_holding_a,
      4,
      1000000,
      'HARUS OVERSELL'
    );
  exception
    when others then
      v_failed := true;
      raise notice 'EXPECTED oversell rejection: %', sqlerrm;
  end;

  if not v_failed then
    raise exception 'BUG: oversell ternyata diizinkan';
  end if;

  raise notice 'PASS 04 - oversell berhasil ditolak';

  perform app.cancel_ownership_sale_request(v_sale_2);

  select status
  into strict v_transfer_status
  from public.ownership_transfers
  where id = v_sale_2;

  if v_transfer_status <> 'cancelled' then
    raise exception 'Cancel gagal, status %', v_transfer_status;
  end if;

  select app.create_ownership_sale_request(
    v_holding_a,
    6,
    1050000,
    'Exact available after cancel'
  )
  into v_sale_3;

  if v_sale_3 is null then
    raise exception 'Reserved unit tidak dibebaskan setelah cancel';
  end if;

  perform app.cancel_ownership_sale_request(v_sale_3);

  raise notice 'PASS 05 - cancel membebaskan reserved units';

  perform set_config(
    'request.jwt.claim.sub',
    v_admin::text,
    true
  );

  if not app.has_permission(
    'ownership_transfers.approve'
  ) then
    raise exception 'Admin tidak punya approve permission';
  end if;

  if not app.has_permission(
    'ownership_transfers.process'
  ) then
    raise exception 'Admin tidak punya process permission';
  end if;

  if not app.has_permission(
    'ownership_transfers.complete'
  ) then
    raise exception 'Admin tidak punya complete permission';
  end if;

  raise notice 'PASS 06 - permission Admin tervalidasi';

  perform app.approve_ownership_sale(v_sale_1);

  select status
  into strict v_transfer_status
  from public.ownership_transfers
  where id = v_sale_1;

  if v_transfer_status <> 'approved' then
    raise exception 'Approve gagal, status %', v_transfer_status;
  end if;

  raise notice 'PASS 07 - sale berhasil disetujui';

  v_failed := false;

  begin
    perform app.process_ownership_sale(
      v_sale_1,
      v_investor_a,
      950000
    );
  exception
    when others then
      v_failed := true;
      raise notice
        'EXPECTED seller-as-buyer rejection: %',
        sqlerrm;
  end;

  if not v_failed then
    raise exception 'BUG: seller diperbolehkan menjadi buyer';
  end if;

  raise notice 'PASS 08 - seller tidak dapat menjadi buyer';

  perform app.process_ownership_sale(
    v_sale_1,
    v_investor_b,
    950000
  );

  select status
  into strict v_transfer_status
  from public.ownership_transfers
  where id = v_sale_1;

  if v_transfer_status <> 'processing' then
    raise exception 'Process gagal, status %', v_transfer_status;
  end if;

  select units, ownership_bps
  into v_units, v_bps
  from public.ownership_holdings
  where id = v_holding_a;

  if v_units <> 10 or v_bps <> 500 then
    raise exception
      'Holding berubah sebelum completion: units %, bps %',
      v_units,
      v_bps;
  end if;

  raise notice 'PASS 09 - process belum memindahkan ownership';

  select app.complete_ownership_sale(v_sale_1)
  into v_buyer_holding_1;

  if v_buyer_holding_1 is null then
    raise exception 'Complete tidak menghasilkan buyer holding';
  end if;

  select units, ownership_bps, status
  into v_units, v_bps, v_holding_status
  from public.ownership_holdings
  where id = v_holding_a;

  if v_units <> 6
     or v_bps <> 300
     or v_holding_status <> 'active'
  then
    raise exception
      'Partial sale source salah: units %, bps %, status %',
      v_units,
      v_bps,
      v_holding_status;
  end if;

  select units, ownership_bps, status
  into v_units, v_bps, v_holding_status
  from public.ownership_holdings
  where id = v_buyer_holding_1
    and investor_id = v_investor_b;

  if v_units <> 4
     or v_bps <> 200
     or v_holding_status <> 'active'
  then
    raise exception
      'Buyer holding salah: units %, bps %, status %',
      v_units,
      v_bps,
      v_holding_status;
  end if;

  raise notice 'PASS 10 - partial sale memindahkan 4 unit / 200 bps tepat';

  v_failed := false;

  begin
    perform app.complete_ownership_sale(v_sale_1);
  exception
    when others then
      v_failed := true;
      raise notice
        'EXPECTED double-complete rejection: %',
        sqlerrm;
  end;

  if not v_failed then
    raise exception 'BUG: transaksi dapat completed dua kali';
  end if;

  raise notice 'PASS 11 - double completion ditolak';

  perform set_config(
    'request.jwt.claim.sub',
    v_investor_a::text,
    true
  );

  select app.create_ownership_sale_request(
    v_holding_a,
    6,
    1100000,
    'Full sale remaining holding'
  )
  into v_sale_full;

  if v_sale_full is null then
    raise exception 'Full sale request gagal';
  end if;

  select units, ownership_bps, status
  into v_units, v_bps, v_holding_status
  from public.ownership_holdings
  where id = v_holding_a;

  if v_units <> 6
     or v_bps <> 300
     or v_holding_status <> 'active'
  then
    raise exception 'Full-sale submit mengubah source holding';
  end if;

  perform set_config(
    'request.jwt.claim.sub',
    v_admin::text,
    true
  );

  perform app.approve_ownership_sale(v_sale_full);

  perform app.process_ownership_sale(
    v_sale_full,
    v_investor_b,
    1075000
  );

  select app.complete_ownership_sale(v_sale_full)
  into v_buyer_holding_2;

  select units, ownership_bps, status
  into v_units, v_bps, v_holding_status
  from public.ownership_holdings
  where id = v_holding_a;

  if v_units <> 6
     or v_bps <> 300
     or v_holding_status <> 'transferred'
  then
    raise exception
      'Full-sale source salah: units %, bps %, status %',
      v_units,
      v_bps,
      v_holding_status;
  end if;

  raise notice 'PASS 12 - full sale menandai source sebagai transferred';

  select
    coalesce(sum(units), 0),
    coalesce(sum(ownership_bps), 0)
  into
    v_total_units,
    v_total_bps
  from public.ownership_holdings
  where investor_id = v_investor_a
    and status = 'active';

  if v_total_units <> 0 or v_total_bps <> 0 then
    raise exception
      'Investor A masih punya active ownership: units %, bps %',
      v_total_units,
      v_total_bps;
  end if;

  select
    coalesce(sum(units), 0),
    coalesce(sum(ownership_bps), 0)
  into
    v_total_units,
    v_total_bps
  from public.ownership_holdings
  where investor_id = v_investor_b
    and offering_id = v_offering
    and status = 'active';

  if v_total_units <> 10
     or v_total_bps <> 500
  then
    raise exception
      'Total buyer salah: units %, bps %',
      v_total_units,
      v_total_bps;
  end if;

  raise notice 'PASS 13 - buyer memiliki total 10 unit / 500 bps';

  if (
    select count(*)
    from public.ownership_transfers
    where id in (v_sale_1, v_sale_full)
      and status = 'completed'
  ) <> 2 then
    raise exception 'Tidak semua transaksi utama completed';
  end if;

  select
    coalesce(sum(units), 0),
    coalesce(sum(ownership_bps), 0)
  into
    v_total_units,
    v_total_bps
  from public.ownership_holdings
  where offering_id = v_offering
    and status = 'active';

  if v_total_units <> 10
     or v_total_bps <> 500
  then
    raise exception
      'Ownership conservation gagal: units %, bps %',
      v_total_units,
      v_total_bps;
  end if;

  raise notice 'PASS 14 - total active ownership tetap konservatif';

  raise notice '================================================';
  raise notice 'SEMUA SHARE-SALE FUNCTIONAL TEST PASS';
  raise notice 'Fixture akan di-ROLLBACK';
  raise notice '================================================';
end
$$;

rollback;
