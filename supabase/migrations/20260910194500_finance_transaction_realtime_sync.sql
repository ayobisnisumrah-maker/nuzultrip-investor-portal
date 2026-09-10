create or replace function app.emit_finance_transaction_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := coalesce(new.id, old.id);
  v_actor text := app.current_actor_type();
  v_entity_type text := tg_table_name;
begin
  perform app.emit_event(
    app.topic_admin(),
    'finance.transaction_changed',
    v_entity_type,
    v_id,
    v_actor
  );

  perform app.emit_event(
    app.topic_all_investors(),
    'finance.cashflow_changed',
    'financial_summary',
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_actor
  );

  return null;
end;
$$;

revoke execute on function app.emit_finance_transaction_events() from public, anon, authenticated;

drop trigger if exists finance_invoices_emit_transaction_events on public.finance_invoices;
create trigger finance_invoices_emit_transaction_events
after insert or update or delete on public.finance_invoices
for each row execute function app.emit_finance_transaction_events();

drop trigger if exists finance_invoice_items_emit_transaction_events on public.finance_invoice_items;
create trigger finance_invoice_items_emit_transaction_events
after insert or update or delete on public.finance_invoice_items
for each row execute function app.emit_finance_transaction_events();

drop trigger if exists finance_payments_emit_transaction_events on public.finance_payments;
create trigger finance_payments_emit_transaction_events
after insert or update or delete on public.finance_payments
for each row execute function app.emit_finance_transaction_events();

drop trigger if exists finance_refunds_emit_transaction_events on public.finance_refunds;
create trigger finance_refunds_emit_transaction_events
after insert or update or delete on public.finance_refunds
for each row execute function app.emit_finance_transaction_events();

drop trigger if exists finance_expenses_emit_transaction_events on public.finance_expenses;
create trigger finance_expenses_emit_transaction_events
after insert or update or delete on public.finance_expenses
for each row execute function app.emit_finance_transaction_events();
