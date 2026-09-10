create or replace function app.record_finance_payment(
  p_invoice_id uuid, p_amount numeric, p_method text, p_received_at timestamptz,
  p_external_reference text, p_notes text, p_idempotency_key text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_invoice public.finance_invoices%rowtype; v_prefix text;
begin
  if not app.has_permission('financial_reports.update') then raise exception 'Missing permission' using errcode='42501'; end if;
  select * into v_invoice from public.finance_invoices where id=p_invoice_id for update;
  if v_invoice.status not in ('issued','partially_paid') then
    raise exception 'Payments require an issued unpaid invoice' using errcode='23514'; end if;
  if p_amount<=0 or p_amount>v_invoice.grand_total-v_invoice.paid_total+v_invoice.refunded_total then
    raise exception 'Payment exceeds the outstanding invoice amount' using errcode='23514'; end if;
  select receipt_prefix into v_prefix from public.finance_settings where singleton=true;
  insert into public.finance_payments(invoice_id,reference,status,amount,currency,method,external_reference,
    idempotency_key,received_at,notes,recorded_by)
  values(p_invoice_id,app.finance_reference(v_prefix),'confirmed',p_amount,v_invoice.currency,btrim(p_method),
    nullif(btrim(p_external_reference),''),nullif(btrim(p_idempotency_key),''),coalesce(p_received_at,now()),
    nullif(btrim(p_notes),''),auth.uid()) returning id into v_id;
  return v_id;
end; $$;

create or replace function app.process_finance_refund(
  p_invoice_id uuid, p_payment_id uuid, p_amount numeric, p_reason text, p_notes text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_paid numeric; v_refunded numeric; v_prefix text;
begin
  if not app.has_permission('financial_reports.update') then raise exception 'Missing permission' using errcode='42501'; end if;
  perform 1 from public.finance_invoices where id=p_invoice_id and status in ('partially_paid','paid') for update;
  if not found then raise exception 'Refunds require a paid invoice' using errcode='23514'; end if;
  if p_payment_id is not null and not exists(select 1 from public.finance_payments where id=p_payment_id and invoice_id=p_invoice_id and status='confirmed') then
    raise exception 'Payment does not belong to this invoice' using errcode='23514'; end if;
  select coalesce(sum(amount),0) into v_paid from public.finance_payments where invoice_id=p_invoice_id and status='confirmed';
  select coalesce(sum(amount),0) into v_refunded from public.finance_refunds where invoice_id=p_invoice_id and status='processed';
  if p_amount<=0 or p_amount>v_paid-v_refunded then raise exception 'Refund exceeds refundable amount' using errcode='23514'; end if;
  select refund_prefix into v_prefix from public.finance_settings where singleton=true;
  insert into public.finance_refunds(invoice_id,payment_id,reference,status,amount,reason,requested_by,
    approved_by,processed_by,approved_at,processed_at,notes)
  values(p_invoice_id,p_payment_id,app.finance_reference(v_prefix),'processed',p_amount,btrim(p_reason),auth.uid(),
    auth.uid(),auth.uid(),now(),now(),nullif(btrim(p_notes),'')) returning id into v_id;
  return v_id;
end; $$;


revoke all on function app.record_finance_payment(uuid,numeric,text,timestamptz,text,text,text) from public,anon;
revoke all on function app.process_finance_refund(uuid,uuid,numeric,text,text) from public,anon;
grant execute on function app.record_finance_payment(uuid,numeric,text,timestamptz,text,text,text) to authenticated;
grant execute on function app.process_finance_refund(uuid,uuid,numeric,text,text) to authenticated;
