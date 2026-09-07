create or replace function app.emit_profit_distribution_events()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor text := app.current_actor_type();
  v_changed boolean := false;
begin
  if tg_op = 'INSERT' then
    v_changed := true;
  else
    v_changed :=
      new.offering_id is distinct from old.offering_id or
      new.period_start is distinct from old.period_start or
      new.period_end is distinct from old.period_end or
      new.revenue_amount is distinct from old.revenue_amount or
      new.opex_amount is distinct from old.opex_amount or
      new.profit_amount is distinct from old.profit_amount or
      new.company_share_bps is distinct from old.company_share_bps or
      new.investor_pool_bps is distinct from old.investor_pool_bps or
      new.investor_pool_amount is distinct from old.investor_pool_amount or
      new.status is distinct from old.status or
      new.approved_at is distinct from old.approved_at or
      new.paid_at is distinct from old.paid_at or
      new.notes is distinct from old.notes;
  end if;

  if v_changed then
    perform app.emit_event(
      app.topic_admin(),
      'profit_distribution.changed',
      'profit_distribution',
      new.id,
      v_actor
    );

    perform app.emit_event(
      app.topic_investor(a.investor_id),
      'profit_distribution.changed',
      'profit_distribution',
      new.id,
      v_actor
    )
    from (
      select distinct investor_id
      from public.profit_distribution_allocations
      where distribution_id = new.id
    ) a;
  end if;

  return null;
end;
$function$;

create or replace function app.emit_ownership_transfer_events()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_actor text := app.current_actor_type();
  v_changed boolean := false;
begin
  if tg_op = 'INSERT' then
    v_changed := true;
  else
    v_changed :=
      new.holding_id is distinct from old.holding_id or
      new.from_investor_id is distinct from old.from_investor_id or
      new.to_investor_id is distinct from old.to_investor_id or
      new.units is distinct from old.units or
      new.eligible_at is distinct from old.eligible_at or
      new.status is distinct from old.status or
      new.approved_at is distinct from old.approved_at or
      new.completed_at is distinct from old.completed_at or
      new.rejection_reason is distinct from old.rejection_reason or
      new.notes is distinct from old.notes or
      new.transfer_kind is distinct from old.transfer_kind or
      new.requested_unit_price is distinct from old.requested_unit_price or
      new.agreed_unit_price is distinct from old.agreed_unit_price or
      new.processing_at is distinct from old.processing_at;
  end if;

  if v_changed then
    perform app.emit_event(
      app.topic_investor(new.from_investor_id),
      'ownership.changed',
      'ownership_transfer',
      new.id,
      v_actor
    );

    if new.to_investor_id is not null and new.to_investor_id is distinct from new.from_investor_id then
      perform app.emit_event(
        app.topic_investor(new.to_investor_id),
        'ownership.changed',
        'ownership_transfer',
        new.id,
        v_actor
      );
    end if;

    if tg_op = 'UPDATE'
       and old.to_investor_id is not null
       and old.to_investor_id is distinct from new.to_investor_id
       and old.to_investor_id is distinct from new.from_investor_id then
      perform app.emit_event(
        app.topic_investor(old.to_investor_id),
        'ownership.changed',
        'ownership_transfer',
        old.id,
        v_actor
      );
    end if;

    perform app.emit_event(
      app.topic_admin(),
      'ownership.changed',
      'ownership_transfer',
      new.id,
      v_actor
    );
  end if;

  return null;
end;
$function$;
