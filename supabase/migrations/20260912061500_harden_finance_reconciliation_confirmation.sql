-- =============================================================================
-- Harden payment confirmation: require an authoritative matched reconciliation
-- row rather than trusting a session flag.
-- =============================================================================

create or replace function app.guard_finance_payment_confirmation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'confirmed'
     and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    if new.proof_asset_id is null then
      raise exception 'Bukti pembayaran wajib tersedia sebelum pembayaran dikonfirmasi.' using errcode='23514';
    end if;

    if not exists (
      select 1
      from public.finance_bank_reconciliations r
      where r.payment_id = new.id
        and r.invoice_id = new.invoice_id
        and r.status = 'matched'
        and r.proof_asset_id = new.proof_asset_id
        and r.bank_amount = new.amount
    ) then
      raise exception 'Status pembayaran hanya dapat dikonfirmasi setelah bukti pembayaran cocok dengan rekonsiliasi bank.' using errcode='42501';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function app.guard_finance_payment_confirmation() from public, anon, authenticated;
