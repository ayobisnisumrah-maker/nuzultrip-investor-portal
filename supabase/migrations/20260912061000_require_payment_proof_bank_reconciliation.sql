-- =============================================================================
-- Payment proof + bank reconciliation as the authoritative payment-status gate.
--
-- Safe/backward-compatible:
-- - Existing confirmed payments are preserved unchanged.
-- - New payments created through the canonical RPC start as pending.
-- - A payment can become confirmed only through app.reconcile_finance_payment,
--   with a proof asset and a matched bank-reconciliation row.
-- =============================================================================

create type public.finance_reconciliation_status as enum (
  'matched',
  'rejected'
);

create table public.finance_bank_reconciliations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.finance_payments(id) on delete restrict,
  invoice_id uuid not null references public.finance_invoices(id) on delete restrict,
  status public.finance_reconciliation_status not null,
  bank_reference text not null check (length(btrim(bank_reference)) between 2 and 200),
  bank_amount numeric(20,2) not null check (bank_amount > 0),
  bank_received_at timestamptz not null,
  proof_asset_id uuid not null references public.media_assets(id) on delete restrict,
  notes text,
  reconciled_by uuid references auth.users(id) on delete set null,
  reconciled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint finance_bank_reconciliation_payment_unique unique(payment_id)
);

create index finance_bank_reconciliations_invoice_idx
  on public.finance_bank_reconciliations(invoice_id, reconciled_at desc);

alter table public.finance_bank_reconciliations enable row level security;

create policy finance_bank_reconciliations_read
on public.finance_bank_reconciliations
for select
to authenticated
using (app.has_permission('financial_reports.view'));

revoke all on public.finance_bank_reconciliations from public, anon, authenticated;
grant select on public.finance_bank_reconciliations to authenticated;

create or replace function app.record_finance_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text,
  p_received_at timestamptz,
  p_external_reference text,
  p_notes text,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_invoice public.finance_invoices%rowtype;
  v_prefix text;
begin
  if not app.has_permission('financial_reports.update') then
    raise exception 'Anda tidak memiliki izin untuk mencatat pembayaran.' using errcode='42501';
  end if;

  select * into v_invoice
  from public.finance_invoices
  where id = p_invoice_id
  for update;

  if v_invoice.id is null then
    raise exception 'Invoice tidak ditemukan.' using errcode='P0002';
  end if;

  if v_invoice.status not in ('issued','partially_paid') then
    raise exception 'Pembayaran hanya dapat dicatat untuk invoice yang sudah diterbitkan dan belum lunas.' using errcode='23514';
  end if;

  if p_amount is null
     or p_amount <= 0
     or p_amount > v_invoice.grand_total - v_invoice.paid_total + v_invoice.refunded_total then
    raise exception 'Nominal pembayaran melebihi sisa tagihan invoice.' using errcode='23514';
  end if;

  if length(btrim(coalesce(p_method, ''))) < 2 then
    raise exception 'Metode pembayaran wajib diisi.' using errcode='22023';
  end if;

  select receipt_prefix into v_prefix
  from public.finance_settings
  where singleton = true;

  insert into public.finance_payments(
    invoice_id,
    reference,
    status,
    amount,
    currency,
    method,
    external_reference,
    idempotency_key,
    received_at,
    notes,
    recorded_by
  )
  values(
    p_invoice_id,
    app.finance_reference(v_prefix),
    'pending',
    p_amount,
    v_invoice.currency,
    btrim(p_method),
    nullif(btrim(coalesce(p_external_reference, '')), ''),
    nullif(btrim(coalesce(p_idempotency_key, '')), ''),
    p_received_at,
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function app.guard_finance_payment_confirmation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'confirmed'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    if coalesce(current_setting('app.finance_reconciliation_rpc', true), '') <> '1' then
      raise exception 'Status pembayaran hanya dapat dikonfirmasi melalui rekonsiliasi bank.' using errcode='42501';
    end if;

    if new.proof_asset_id is null then
      raise exception 'Bukti pembayaran wajib tersedia sebelum pembayaran dikonfirmasi.' using errcode='23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists finance_payment_confirmation_guard on public.finance_payments;
create trigger finance_payment_confirmation_guard
before insert or update of status on public.finance_payments
for each row execute function app.guard_finance_payment_confirmation();

revoke execute on function app.guard_finance_payment_confirmation() from public, anon, authenticated;

create or replace function app.reconcile_finance_payment(
  p_payment_id uuid,
  p_proof_asset_id uuid,
  p_bank_reference text,
  p_bank_amount numeric,
  p_bank_received_at timestamptz,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.finance_payments%rowtype;
  v_reconciliation_id uuid;
begin
  if not app.has_permission('financial_reports.update') then
    raise exception 'Anda tidak memiliki izin untuk melakukan rekonsiliasi pembayaran.' using errcode='42501';
  end if;

  select * into v_payment
  from public.finance_payments
  where id = p_payment_id
  for update;

  if v_payment.id is null then
    raise exception 'Pembayaran tidak ditemukan.' using errcode='P0002';
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'Hanya pembayaran berstatus Menunggu Rekonsiliasi yang dapat dikonfirmasi.' using errcode='23514';
  end if;

  if not exists (
    select 1
    from public.media_assets a
    where a.id = p_proof_asset_id
  ) then
    raise exception 'Bukti pembayaran tidak ditemukan.' using errcode='P0002';
  end if;

  if length(btrim(coalesce(p_bank_reference, ''))) < 2 then
    raise exception 'Referensi transaksi bank wajib diisi.' using errcode='22023';
  end if;

  if p_bank_amount is null or p_bank_amount <> v_payment.amount then
    raise exception 'Nominal transaksi bank harus sama dengan nominal pembayaran yang dicatat.' using errcode='23514';
  end if;

  if p_bank_received_at is null then
    raise exception 'Waktu penerimaan dana dari bank wajib diisi.' using errcode='22023';
  end if;

  insert into public.finance_bank_reconciliations(
    payment_id,
    invoice_id,
    status,
    bank_reference,
    bank_amount,
    bank_received_at,
    proof_asset_id,
    notes,
    reconciled_by
  )
  values(
    v_payment.id,
    v_payment.invoice_id,
    'matched',
    btrim(p_bank_reference),
    p_bank_amount,
    p_bank_received_at,
    p_proof_asset_id,
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning id into v_reconciliation_id;

  perform set_config('app.finance_reconciliation_rpc', '1', true);

  update public.finance_payments
  set
    status = 'confirmed',
    proof_asset_id = p_proof_asset_id,
    external_reference = btrim(p_bank_reference),
    received_at = p_bank_received_at,
    updated_at = now()
  where id = v_payment.id;

  return v_reconciliation_id;
end;
$$;

revoke all on function app.record_finance_payment(uuid,numeric,text,timestamptz,text,text,text)
  from public, anon;
grant execute on function app.record_finance_payment(uuid,numeric,text,timestamptz,text,text,text)
  to authenticated;

revoke all on function app.reconcile_finance_payment(uuid,uuid,text,numeric,timestamptz,text)
  from public, anon;
grant execute on function app.reconcile_finance_payment(uuid,uuid,text,numeric,timestamptz,text)
  to authenticated;

create or replace function app.audit_finance_bank_reconciliation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs(
    actor_id,
    actor_type,
    action,
    entity_type,
    entity_id,
    summary,
    changes
  )
  values(
    app.current_user_id(),
    app.current_actor_type(),
    'finance.payment.reconcile',
    'finance_bank_reconciliation',
    new.id,
    'Pembayaran dikonfirmasi berdasarkan bukti pembayaran dan rekonsiliasi bank.',
    jsonb_build_object(
      'payment_id', new.payment_id,
      'invoice_id', new.invoice_id,
      'status', new.status::text,
      'bank_amount', new.bank_amount,
      'bank_received_at', new.bank_received_at,
      'proof_asset_id', new.proof_asset_id
    )
  );
  return null;
end;
$$;

create trigger finance_bank_reconciliation_audit
after insert on public.finance_bank_reconciliations
for each row execute function app.audit_finance_bank_reconciliation();

revoke execute on function app.audit_finance_bank_reconciliation() from public, anon, authenticated;
