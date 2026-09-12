import { z } from 'zod'

const money = z.number().finite().min(0).max(999_999_999_999_999)
export const financeProductSchema = z.object({
  code: z.string().trim().max(40).default(''),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).default(''),
  unitLabel: z.string().trim().min(1).max(24).default('pax'),
  defaultUnitPrice: money,
  taxRate: z.number().finite().min(0).max(100).default(0),
})
export const financeInvoiceSchema = z.object({
  customerName: z.string().trim().min(2).max(160),
  customerEmail: z.union([z.literal(''), z.email()]).default(''),
  customerPhone: z.string().trim().max(40).default(''),
  customerAddress: z.string().trim().max(1000).default(''),
  dueOn: z.string().date().nullable(),
  notes: z.string().trim().max(2000).default(''),
  items: z
    .array(
      z.object({
        productId: z.string().uuid().nullable(),
        productCode: z.string().trim().max(40).default(''),
        name: z.string().trim().min(2).max(160),
        description: z.string().trim().max(1000).default(''),
        quantity: z.number().finite().positive().max(100_000),
        unitLabel: z.string().trim().min(1).max(24),
        unitPrice: money,
        discountAmount: money.default(0),
        taxRate: z.number().finite().min(0).max(100).default(0),
        position: z.number().int().min(0).max(99),
      }),
    )
    .min(1)
    .max(100),
})
export const financeInvoiceDueDateSchema = z.object({
  invoiceId: z.string().uuid(),
  dueOn: z.string().date(),
})
export const financeExpenseSchema = z.object({
  expenseOn: z.string().date(),
  category: z.string().trim().min(2).max(80),
  vendorName: z.string().trim().max(160).default(''),
  description: z.string().trim().min(3).max(500),
  quantity: z.number().finite().positive().max(100_000),
  unitPrice: money,
  taxAmount: money.default(0),
  paymentMethod: z.string().trim().max(48).default(''),
  notes: z.string().trim().max(2000).default(''),
})
export const financeSettingsSchema = z.object({
  invoicePrefix: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{2,12}$/),
  receiptPrefix: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{2,12}$/),
  refundPrefix: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{2,12}$/),
  companyLegalName: z.string().trim().max(200).default(''),
  companyAddress: z.string().trim().max(2000).default(''),
  companyTaxId: z.string().trim().max(80).default(''),
  bankDetails: z.string().trim().max(2000).default(''),
  paymentInstructions: z.string().trim().max(2000).default(''),
  invoiceTerms: z.string().trim().max(5000).default(''),
  invoiceFooter: z.string().trim().max(1000).default(''),
  logoAssetId: z.string().uuid().nullable(),
  stampAssetId: z.string().uuid().nullable(),
  signatureAssetId: z.string().uuid().nullable(),
})
export const financePaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.string().trim().min(2).max(48),
  externalReference: z.string().trim().max(160).default(''),
  notes: z.string().trim().max(1000).default(''),
})
export const financePaymentReconciliationSchema = z.object({
  paymentId: z.string().uuid(),
  proofAssetId: z.string().uuid(),
  bankReference: z.string().trim().min(2).max(200),
  bankAmount: z.number().finite().positive().max(999_999_999_999_999),
  bankReceivedAt: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(2000).default(''),
})
export const financeRefundSchema = z.object({
  invoiceId: z.string().uuid(),
  paymentId: z.string().uuid().nullable(),
  amount: z.number().positive(),
  reason: z.string().trim().min(3).max(1000),
  notes: z.string().trim().max(1000).default(''),
})
