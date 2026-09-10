import '@supabase/supabase-js'

type FinanceError = { message: string }
type FinanceQueryResult<Row> = { data: Row[] | null; error: FinanceError | null; count: number | null }
type FinanceSingleResult<Row> = { data: Row | null; error: FinanceError | null; count?: number | null }

type FinanceInvoiceRow = {
  id: string
  reference: string
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'void'
  investor_id?: string | null
  customer_name: string
  customer_email?: string | null
  customer_phone?: string | null
  customer_address?: string | null
  currency?: string
  subtotal?: number | string
  discount_total?: number | string
  tax_total?: number | string
  grand_total: number | string
  paid_total: number | string
  refunded_total: number | string
  issued_on: string | null
  due_on: string | null
  notes?: string | null
  terms_snapshot?: string | null
  company_snapshot?: unknown
  issued_by?: string | null
  created_by?: string | null
  created_at: string
  updated_at?: string
}

type FinancePaymentRow = {
  id: string
  invoice_id: string
  reference: string
  status: 'pending' | 'confirmed' | 'void'
  amount: number | string
  currency: string
  method: string
  external_reference: string | null
  received_at: string
  notes: string | null
}

type FinanceRefundRow = {
  id: string
  invoice_id: string
  payment_id: string | null
  reference: string
  status: 'requested' | 'approved' | 'processed' | 'rejected' | 'cancelled'
  amount: number | string
  reason: string
  requested_at: string
  processed_at: string | null
  notes: string | null
}

type FinanceExpenseRow = {
  id: string
  reference: string
  status: 'recorded' | 'void'
  expense_on: string
  category: string
  vendor_name: string | null
  description: string
  quantity: number | string
  unit_price: number | string
  tax_amount: number | string
  total_amount: number | string
  currency: string
  payment_method: string | null
  notes: string | null
}

type FinanceProductRow = {
  id: string
  code: string
  name: string
  description: string | null
  unit_label: string
  default_unit_price: number | string
  currency: string
  tax_rate: number | string
  active: boolean
}

type FinanceSettingsRow = {
  id: string
  singleton: boolean
  invoice_prefix: string
  receipt_prefix: string
  refund_prefix: string
  default_currency: string
  company_legal_name: string | null
  company_address: string | null
  company_tax_id: string | null
  company_email: string | null
  company_phone: string | null
  company_website: string | null
  bank_details: string | null
  payment_instructions: string | null
  invoice_terms: string | null
  invoice_footer: string | null
  tax_invoice_enabled: boolean
  logo_asset_id: string | null
  stamp_asset_id: string | null
  signature_asset_id: string | null
  signer_name: string | null
  signer_title: string | null
  show_stamp: boolean
  show_signature: boolean
  show_print_metadata: boolean
  show_draft_watermark: boolean
}

type FinanceInvoiceItemRow = {
  id: string
  invoice_id: string
  product_id: string | null
  product_code_snapshot: string | null
  name: string
  description: string | null
  quantity: number | string
  unit_label: string
  unit_price: number | string
  discount_amount: number | string
  tax_rate: number | string
  line_subtotal?: number | string | null
  line_tax?: number | string | null
  line_total?: number | string | null
  position?: number
}

type FinanceTables = {
  finance_invoices: FinanceInvoiceRow
  finance_payments: FinancePaymentRow
  finance_refunds: FinanceRefundRow
  finance_expenses: FinanceExpenseRow
  finance_products: FinanceProductRow
  finance_settings: FinanceSettingsRow
  finance_invoice_items: FinanceInvoiceItemRow
}

interface FinanceQueryBuilder<Row> extends PromiseLike<FinanceQueryResult<Row>> {
  select(columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): FinanceQueryBuilder<Row>
  insert(values: Partial<Row> | Partial<Row>[]): FinanceQueryBuilder<Row>
  update(values: Partial<Row>): FinanceQueryBuilder<Row>
  delete(): FinanceQueryBuilder<Row>
  eq(column: string, value: unknown): FinanceQueryBuilder<Row>
  neq(column: string, value: unknown): FinanceQueryBuilder<Row>
  gte(column: string, value: unknown): FinanceQueryBuilder<Row>
  lte(column: string, value: unknown): FinanceQueryBuilder<Row>
  in(column: string, values: readonly unknown[]): FinanceQueryBuilder<Row>
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): FinanceQueryBuilder<Row>
  limit(count: number): FinanceQueryBuilder<Row>
  single(): Promise<FinanceSingleResult<Row>>
  maybeSingle(): Promise<FinanceSingleResult<Row>>
}

declare module '@supabase/supabase-js' {
  interface SupabaseClient {
    /**
     * Finance operational tables already exist in production but are not yet
     * represented by the repository's generated Database type. This overload
     * is deliberately limited to the known finance tables and their fields,
     * so callbacks remain type-safe and noImplicitAny stays enforced.
     *
     * TODO: remove this compatibility layer after the production finance
     * schema is reconciled into migrations and src/types/database.ts.
     */
    from<Relation extends keyof FinanceTables>(relation: Relation): FinanceQueryBuilder<FinanceTables[Relation]>
  }
}
