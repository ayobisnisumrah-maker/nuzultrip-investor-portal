-- Operational finance subledger for package sales, invoices, payments,
-- refunds, and expenses. Final documents are immutable; corrections happen
-- through refunds/voids so the audit history remains intact.

create type public.finance_invoice_status as enum ('draft', 'issued', 'partially_paid', 'paid', 'void');
create type public.finance_payment_status as enum ('pending', 'confirmed', 'failed', 'refunded');
create type public.finance_refund_status as enum ('requested', 'approved', 'processed', 'rejected');
create type public.finance_expense_status as enum ('draft', 'recorded', 'void');

create table public.finance_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  invoice_prefix text not null default 'INV' check (invoice_prefix ~ '^[A-Z0-9-]{2,12}$'),
  receipt_prefix text not null default 'PAY' check (receipt_prefix ~ '^[A-Z0-9-]{2,12}$'),
  refund_prefix text not null default 'RFD' check (refund_prefix ~ '^[A-Z0-9-]{2,12}$'),
  default_currency text not null default 'IDR' check (default_currency ~ '^[A-Z]{3}$'),
  company_legal_name text,
  company_address text,
  company_tax_id text,
  bank_details text,
  payment_instructions text,
  invoice_terms text,
  invoice_footer text,
  tax_invoice_enabled boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.finance_settings (singleton) values (true) on conflict (singleton) do nothing;

create table public.finance_products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(btrim(code)) between 2 and 40),
  name text not null check (length(btrim(name)) between 2 and 160),
  description text,
  unit_label text not null default 'pax' check (length(btrim(unit_label)) between 1 and 24),
  default_unit_price numeric(20,2) not null default 0 check (default_unit_price >= 0),
  currency text not null default 'IDR' check (currency ~ '^[A-Z]{3}$'),
  tax_rate numeric(7,4) not null default 0 check (tax_rate between 0 and 100),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.finance_invoices (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  status public.finance_invoice_status not null default 'draft',
  investor_id uuid references public.investors(id) on delete set null,
  customer_name text not null check (length(btrim(customer_name)) between 2 and 160),
  customer_email text,
  customer_phone text,
  customer_address text,
  issued_on date,
  due_on date,
  currency text not null default 'IDR' check (currency ~ '^[A-Z]{3}$'),
  subtotal numeric(20,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(20,2) not null default 0 check (discount_total >= 0),
  tax_total numeric(20,2) not null default 0 check (tax_total >= 0),
  grand_total numeric(20,2) not null default 0 check (grand_total >= 0),
  paid_total numeric(20,2) not null default 0 check (paid_total >= 0),
  refunded_total numeric(20,2) not null default 0 check (refunded_total >= 0),
  notes text,
  terms_snapshot text,
  company_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(company_snapshot) = 'object'),
  issued_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_on is null or issued_on is null or due_on >= issued_on)
);

create table public.finance_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.finance_invoices(id) on delete cascade,
  product_id uuid references public.finance_products(id) on delete set null,
  product_code_snapshot text,
  name text not null check (length(btrim(name)) between 2 and 160),
  description text,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_label text not null default 'pax',
  unit_price numeric(20,2) not null check (unit_price >= 0),
  discount_amount numeric(20,2) not null default 0 check (discount_amount >= 0),
  tax_rate numeric(7,4) not null default 0 check (tax_rate between 0 and 100),
  position integer not null default 0 check (position >= 0),
  line_subtotal numeric(20,2) generated always as (round(quantity * unit_price, 2)) stored,
  line_tax numeric(20,2) generated always as (round(greatest(quantity * unit_price - discount_amount, 0) * tax_rate / 100, 2)) stored,
  line_total numeric(20,2) generated always as (round(greatest(quantity * unit_price - discount_amount, 0) * (1 + tax_rate / 100), 2)) stored,
  created_at timestamptz not null default now(),
  unique (invoice_id, position),
  check (discount_amount <= quantity * unit_price)
);

create table public.finance_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.finance_invoices(id),
  reference text not null unique,
  status public.finance_payment_status not null default 'pending',
  amount numeric(20,2) not null check (amount > 0),
  currency text not null default 'IDR' check (currency ~ '^[A-Z]{3}$'),
  method text not null check (length(btrim(method)) between 2 and 48),
  external_reference text,
  idempotency_key text unique,
  received_at timestamptz,
  proof_asset_id uuid references public.media_assets(id) on delete set null,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.finance_refunds (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.finance_invoices(id),
  payment_id uuid references public.finance_payments(id),
  reference text not null unique,
  status public.finance_refund_status not null default 'requested',
  amount numeric(20,2) not null check (amount > 0),
  reason text not null check (length(btrim(reason)) between 3 and 1000),
  requested_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  processed_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  processed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  status public.finance_expense_status not null default 'draft',
  expense_on date not null,
  category text not null check (length(btrim(category)) between 2 and 80),
  vendor_name text,
  description text not null check (length(btrim(description)) between 3 and 500),
  quantity numeric(14,3) not null default 1 check (quantity > 0),
  unit_price numeric(20,2) not null check (unit_price >= 0),
  tax_amount numeric(20,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(20,2) generated always as (round(quantity * unit_price + tax_amount, 2)) stored,
  currency text not null default 'IDR' check (currency ~ '^[A-Z]{3}$'),
  payment_method text,
  receipt_asset_id uuid references public.media_assets(id) on delete set null,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index finance_invoices_status_date_idx on public.finance_invoices(status, issued_on desc);
create index finance_invoice_items_invoice_idx on public.finance_invoice_items(invoice_id, position);
create index finance_payments_invoice_idx on public.finance_payments(invoice_id, status, received_at desc);
create index finance_refunds_invoice_idx on public.finance_refunds(invoice_id, status, requested_at desc);
create index finance_expenses_date_idx on public.finance_expenses(expense_on desc, status);

alter table public.finance_settings enable row level security;
alter table public.finance_products enable row level security;
alter table public.finance_invoices enable row level security;
alter table public.finance_invoice_items enable row level security;
alter table public.finance_payments enable row level security;
alter table public.finance_refunds enable row level security;
alter table public.finance_expenses enable row level security;

create policy finance_settings_read on public.finance_settings for select to authenticated
  using (app.has_permission('financial_reports.view'));
create policy finance_settings_manage on public.finance_settings for all to authenticated
  using (app.has_permission('financial_reports.update')) with check (app.has_permission('financial_reports.update'));
create policy finance_products_read on public.finance_products for select to authenticated
  using (app.has_permission('financial_reports.view'));
create policy finance_products_manage on public.finance_products for all to authenticated
  using (app.has_permission('financial_reports.update')) with check (app.has_permission('financial_reports.update'));
create policy finance_invoices_read on public.finance_invoices for select to authenticated
  using (app.has_permission('financial_reports.view'));
create policy finance_invoices_manage on public.finance_invoices for all to authenticated
  using (app.has_permission('financial_reports.update')) with check (app.has_permission('financial_reports.update'));
create policy finance_invoice_items_read on public.finance_invoice_items for select to authenticated
  using (app.has_permission('financial_reports.view'));
create policy finance_invoice_items_manage on public.finance_invoice_items for all to authenticated
  using (app.has_permission('financial_reports.update')) with check (app.has_permission('financial_reports.update'));
create policy finance_payments_read on public.finance_payments for select to authenticated
  using (app.has_permission('financial_reports.view'));
create policy finance_payments_manage on public.finance_payments for all to authenticated
  using (app.has_permission('financial_reports.update')) with check (app.has_permission('financial_reports.update'));
create policy finance_refunds_read on public.finance_refunds for select to authenticated
  using (app.has_permission('financial_reports.view'));
create policy finance_refunds_manage on public.finance_refunds for all to authenticated
  using (app.has_permission('financial_reports.update')) with check (app.has_permission('financial_reports.update'));
create policy finance_expenses_read on public.finance_expenses for select to authenticated
  using (app.has_permission('financial_reports.view'));
create policy finance_expenses_manage on public.finance_expenses for all to authenticated
  using (app.has_permission('financial_reports.update')) with check (app.has_permission('financial_reports.update'));

create or replace function app.finance_reference(p_prefix text)
returns text language sql volatile security invoker set search_path = '' as $$
  select upper(p_prefix) || '-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' ||
    upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 12));
$$;

create or replace function app.recalculate_finance_invoice(p_invoice_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_subtotal numeric; v_discount numeric; v_tax numeric; v_paid numeric; v_refunded numeric;
begin
  select coalesce(sum(line_subtotal),0), coalesce(sum(discount_amount),0), coalesce(sum(line_tax),0)
    into v_subtotal, v_discount, v_tax from public.finance_invoice_items where invoice_id=p_invoice_id;
  select coalesce(sum(amount),0) into v_paid from public.finance_payments
    where invoice_id=p_invoice_id and status='confirmed';
  select coalesce(sum(amount),0) into v_refunded from public.finance_refunds
    where invoice_id=p_invoice_id and status='processed';
  update public.finance_invoices set subtotal=v_subtotal, discount_total=v_discount,
    tax_total=v_tax, grand_total=v_subtotal-v_discount+v_tax, paid_total=v_paid,
    refunded_total=v_refunded, updated_at=now(), status=case
      when status in ('draft','void') then status
      when v_paid-v_refunded >= v_subtotal-v_discount+v_tax then 'paid'::public.finance_invoice_status
      when v_paid-v_refunded > 0 then 'partially_paid'::public.finance_invoice_status
      else 'issued'::public.finance_invoice_status end
    where id=p_invoice_id;
end; $$;

create or replace function app.create_finance_invoice(
  p_customer_name text, p_customer_email text, p_customer_phone text,
  p_customer_address text, p_due_on date, p_notes text, p_items jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_settings public.finance_settings%rowtype;
begin
  if not app.has_permission('financial_reports.update') then raise exception 'Missing permission' using errcode='42501'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>100 then
    raise exception 'Invoice requires 1-100 items' using errcode='22023'; end if;
  select * into v_settings from public.finance_settings where singleton=true;
  insert into public.finance_invoices(reference,customer_name,customer_email,customer_phone,customer_address,
    due_on,currency,notes,terms_snapshot,company_snapshot,created_by)
  values(app.finance_reference(v_settings.invoice_prefix),btrim(p_customer_name),nullif(btrim(p_customer_email),''),
    nullif(btrim(p_customer_phone),''),nullif(btrim(p_customer_address),''),p_due_on,v_settings.default_currency,
    nullif(btrim(p_notes),''),v_settings.invoice_terms,jsonb_build_object('legalName',v_settings.company_legal_name,
    'address',v_settings.company_address,'taxId',v_settings.company_tax_id,'bankDetails',v_settings.bank_details,
    'paymentInstructions',v_settings.payment_instructions,'footer',v_settings.invoice_footer),auth.uid()) returning id into v_id;
  insert into public.finance_invoice_items(invoice_id,product_id,product_code_snapshot,name,description,quantity,
    unit_label,unit_price,discount_amount,tax_rate,position)
  select v_id,x.product_id,nullif(btrim(x.product_code),''),btrim(x.name),nullif(btrim(x.description),''),x.quantity,
    coalesce(nullif(btrim(x.unit_label),''),'pax'),x.unit_price,coalesce(x.discount_amount,0),coalesce(x.tax_rate,0),x.position
  from jsonb_to_recordset(p_items) x(product_id uuid,product_code text,name text,description text,quantity numeric,
    unit_label text,unit_price numeric,discount_amount numeric,tax_rate numeric,position integer);
  perform app.recalculate_finance_invoice(v_id); return v_id;
end; $$;

create or replace function app.issue_finance_invoice(p_invoice_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_settings public.finance_settings%rowtype;
begin
  if not app.has_permission('financial_reports.update') then raise exception 'Missing permission' using errcode='42501'; end if;
  select * into v_settings from public.finance_settings where singleton=true;
  update public.finance_invoices set status='issued',issued_on=current_date,issued_by=auth.uid(),updated_at=now(),
    terms_snapshot=v_settings.invoice_terms,
    company_snapshot=jsonb_build_object('legalName',v_settings.company_legal_name,'address',v_settings.company_address,
      'taxId',v_settings.company_tax_id,'bankDetails',v_settings.bank_details,
      'paymentInstructions',v_settings.payment_instructions,'footer',v_settings.invoice_footer)
    where id=p_invoice_id and status='draft' and grand_total>0;
  if not found then raise exception 'Only a non-empty draft invoice can be issued' using errcode='23514'; end if;
end; $$;

create or replace function app.guard_final_finance_invoice()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if old.status<>'draft' and (new.customer_name,new.customer_email,new.customer_phone,new.customer_address,new.currency,
    new.subtotal,new.discount_total,new.tax_total,new.grand_total,new.terms_snapshot,new.company_snapshot,new.issued_on)
    is distinct from (old.customer_name,old.customer_email,old.customer_phone,old.customer_address,old.currency,
    old.subtotal,old.discount_total,old.tax_total,old.grand_total,old.terms_snapshot,old.company_snapshot,old.issued_on)
  then raise exception 'Issued invoice financial content is immutable' using errcode='42501'; end if;
  return new;
end; $$;
create trigger finance_invoice_immutable before update on public.finance_invoices
  for each row execute function app.guard_final_finance_invoice();

create or replace function app.guard_finance_invoice_item()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_invoice_id uuid; v_status public.finance_invoice_status;
begin
  v_invoice_id := case when tg_op='DELETE' then old.invoice_id else new.invoice_id end;
  select status into v_status from public.finance_invoices where id=v_invoice_id for update;
  if v_status is distinct from 'draft'::public.finance_invoice_status then
    raise exception 'Only draft invoice items can be changed' using errcode='42501';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;

create trigger finance_invoice_items_draft_only before insert or update or delete on public.finance_invoice_items
  for each row execute function app.guard_finance_invoice_item();

create or replace function app.finance_child_recalculate()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='DELETE' then
    perform app.recalculate_finance_invoice(old.invoice_id); return old;
  end if;
  perform app.recalculate_finance_invoice(new.invoice_id); return new;
end; $$;
create trigger finance_items_recalculate after insert or update or delete on public.finance_invoice_items
  for each row execute function app.finance_child_recalculate();
create trigger finance_payments_recalculate after insert or update or delete on public.finance_payments
  for each row execute function app.finance_child_recalculate();
create trigger finance_refunds_recalculate after insert or update or delete on public.finance_refunds
  for each row execute function app.finance_child_recalculate();

revoke all on function app.finance_reference(text) from public,anon,authenticated;
revoke all on function app.recalculate_finance_invoice(uuid) from public,anon,authenticated;
revoke all on function app.create_finance_invoice(text,text,text,text,date,text,jsonb) from public,anon;
revoke all on function app.issue_finance_invoice(uuid) from public,anon;
grant execute on function app.create_finance_invoice(text,text,text,text,date,text,jsonb) to authenticated;
grant execute on function app.issue_finance_invoice(uuid) to authenticated;

grant select,insert,update,delete on public.finance_settings,public.finance_products,public.finance_invoices,
  public.finance_invoice_items,public.finance_payments,public.finance_refunds,public.finance_expenses to authenticated;

create trigger finance_settings_set_updated_at before update on public.finance_settings
  for each row execute function app.set_updated_at();
create trigger finance_products_set_updated_at before update on public.finance_products
  for each row execute function app.set_updated_at();
create trigger finance_payments_set_updated_at before update on public.finance_payments
  for each row execute function app.set_updated_at();
create trigger finance_refunds_set_updated_at before update on public.finance_refunds
  for each row execute function app.set_updated_at();
create trigger finance_expenses_set_updated_at before update on public.finance_expenses
  for each row execute function app.set_updated_at();
