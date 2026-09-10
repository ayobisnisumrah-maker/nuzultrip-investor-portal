-- Keep foreign-key lookups predictable as operational finance data grows.
create index finance_settings_updated_by_idx on public.finance_settings(updated_by);
create index finance_products_created_by_idx on public.finance_products(created_by);
create index finance_products_updated_by_idx on public.finance_products(updated_by);
create index finance_invoices_investor_id_idx on public.finance_invoices(investor_id);
create index finance_invoices_created_by_idx on public.finance_invoices(created_by);
create index finance_invoices_issued_by_idx on public.finance_invoices(issued_by);
create index finance_invoice_items_product_id_idx on public.finance_invoice_items(product_id);
create index finance_payments_proof_asset_id_idx on public.finance_payments(proof_asset_id);
create index finance_payments_recorded_by_idx on public.finance_payments(recorded_by);
create index finance_refunds_payment_id_idx on public.finance_refunds(payment_id);
create index finance_refunds_requested_by_idx on public.finance_refunds(requested_by);
create index finance_refunds_approved_by_idx on public.finance_refunds(approved_by);
create index finance_refunds_processed_by_idx on public.finance_refunds(processed_by);
create index finance_expenses_receipt_asset_id_idx on public.finance_expenses(receipt_asset_id);
create index finance_expenses_recorded_by_idx on public.finance_expenses(recorded_by);
