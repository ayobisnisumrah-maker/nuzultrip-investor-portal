create or replace function app.emit_ownership_holding_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := app.current_actor_type();
begin
  if tg_op = 'INSERT' then
    perform app.emit_event(app.topic_investor(new.investor_id), 'ownership.changed', 'ownership_holding', new.id, v_actor);
    perform app.emit_event(app.topic_admin(), 'ownership.changed', 'ownership_holding', new.id, v_actor);
    return null;
  end if;

  if new.investor_id is distinct from old.investor_id
     or new.units is distinct from old.units
     or new.ownership_bps is distinct from old.ownership_bps
     or new.status is distinct from old.status
     or new.transfer_eligible_at is distinct from old.transfer_eligible_at then
    perform app.emit_event(app.topic_investor(new.investor_id), 'ownership.changed', 'ownership_holding', new.id, v_actor);
    if new.investor_id is distinct from old.investor_id then
      perform app.emit_event(app.topic_investor(old.investor_id), 'ownership.changed', 'ownership_holding', old.id, v_actor);
    end if;
    perform app.emit_event(app.topic_admin(), 'ownership.changed', 'ownership_holding', new.id, v_actor);
  end if;
  return null;
end;
$$;

create or replace function app.emit_ownership_transfer_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := app.current_actor_type();
begin
  if tg_op = 'INSERT'
     or new.status is distinct from old.status
     or new.to_investor_id is distinct from old.to_investor_id
     or new.units is distinct from old.units
     or new.agreed_unit_price is distinct from old.agreed_unit_price then
    perform app.emit_event(app.topic_investor(new.from_investor_id), 'ownership.changed', 'ownership_transfer', new.id, v_actor);
    if new.to_investor_id is not null and new.to_investor_id is distinct from new.from_investor_id then
      perform app.emit_event(app.topic_investor(new.to_investor_id), 'ownership.changed', 'ownership_transfer', new.id, v_actor);
    end if;
    if tg_op = 'UPDATE' and old.to_investor_id is not null and old.to_investor_id is distinct from new.to_investor_id then
      perform app.emit_event(app.topic_investor(old.to_investor_id), 'ownership.changed', 'ownership_transfer', old.id, v_actor);
    end if;
    perform app.emit_event(app.topic_admin(), 'ownership.changed', 'ownership_transfer', new.id, v_actor);
  end if;
  return null;
end;
$$;

create or replace function app.emit_profit_distribution_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := app.current_actor_type();
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status or new.paid_at is distinct from old.paid_at then
    perform app.emit_event(app.topic_admin(), 'profit_distribution.changed', 'profit_distribution', new.id, v_actor);
  end if;
  return null;
end;
$$;

create or replace function app.emit_profit_distribution_allocation_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := app.current_actor_type();
begin
  if tg_op = 'INSERT'
     or new.status is distinct from old.status
     or new.allocation_amount is distinct from old.allocation_amount
     or new.paid_at is distinct from old.paid_at
     or new.payment_reference is distinct from old.payment_reference then
    perform app.emit_event(app.topic_investor(new.investor_id), 'profit_distribution.changed', 'profit_distribution_allocation', new.id, v_actor);
    perform app.emit_event(app.topic_admin(), 'profit_distribution.changed', 'profit_distribution_allocation', new.id, v_actor);
  end if;
  return null;
end;
$$;

create or replace function app.emit_profit_distribution_proof_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := app.current_actor_type();
begin
  perform app.emit_event(app.topic_investor(new.investor_id), 'profit_distribution.changed', 'profit_distribution_payment_proof', new.id, v_actor);
  perform app.emit_event(app.topic_admin(), 'profit_distribution.changed', 'profit_distribution_payment_proof', new.id, v_actor);
  return null;
end;
$$;

drop trigger if exists ownership_holdings_emit_events on public.ownership_holdings;
create trigger ownership_holdings_emit_events
after insert or update on public.ownership_holdings
for each row execute function app.emit_ownership_holding_events();

drop trigger if exists ownership_transfers_emit_events on public.ownership_transfers;
create trigger ownership_transfers_emit_events
after insert or update on public.ownership_transfers
for each row execute function app.emit_ownership_transfer_events();

drop trigger if exists profit_distributions_emit_realtime_events on public.profit_distributions;
create trigger profit_distributions_emit_realtime_events
after insert or update on public.profit_distributions
for each row execute function app.emit_profit_distribution_events();

drop trigger if exists profit_distribution_allocations_emit_events on public.profit_distribution_allocations;
create trigger profit_distribution_allocations_emit_events
after insert or update on public.profit_distribution_allocations
for each row execute function app.emit_profit_distribution_allocation_events();

drop trigger if exists profit_distribution_payment_proofs_emit_events on public.profit_distribution_payment_proofs;
create trigger profit_distribution_payment_proofs_emit_events
after insert or update on public.profit_distribution_payment_proofs
for each row execute function app.emit_profit_distribution_proof_events();
