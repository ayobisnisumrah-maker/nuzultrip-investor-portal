/**
 * Input schemas for the authentication and onboarding flows.
 *
 * Every bound is deliberate. A string without a maximum length is a memory
 * exhaustion vector; a `limit` without a ceiling is a denial of service
 * (docs/SECURITY.md Â§5).
 */
import { z } from 'zod'

export const MIN_PASSWORD_LENGTH = 12

/** Matches the Supabase Auth policy in supabase/config.toml. */
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter.`)
  // GoTrue rejects anything over 72 bytes (the bcrypt limit), so catch it here
  // with a message the user can act on rather than a provider error.
  .max(72, 'Kata sandi maksimal 72 karakter.')
  .refine((value) => /[a-z]/.test(value), 'Sertakan minimal satu huruf kecil.')
  .refine((value) => /[A-Z]/.test(value), 'Sertakan minimal satu huruf kapital.')
  .refine((value) => /\d/.test(value), 'Sertakan minimal satu angka.')

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Alamat surel terlalu panjang.')
  .pipe(z.email('Alamat surel tidak valid.'))

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Kata sandi wajib diisi.').max(72),
  /**
   * Where to go after signing in. Validated as an internal path so this can
   * never become an open redirect (docs/SECURITY.md Â§7).
   */
  redirectTo: z
    .string()
    .max(512)
    .optional()
    .refine(
      (value) => value === undefined || (value.startsWith('/') && !value.startsWith('//')),
      'Tujuan pengalihan tidak valid.',
    ),
})

export type SignInInput = z.infer<typeof signInSchema>

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

export const passwordUpdateSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok.',
    path: ['confirmPassword'],
  })

/* -------------------------------------------------------------------------- */
/* Investor application                                                       */
/* -------------------------------------------------------------------------- */

export const investorApplicationSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Nama wajib diisi.').max(200),
    email: emailSchema,
    password: passwordSchema,
    phone: z
      .string()
      .trim()
      .max(32)
      .regex(/^[+0-9()\-\s]*$/, 'Nomor telepon tidak valid.')
      .optional()
      .or(z.literal('')),
    investorType: z.enum(['individual', 'institution']),
    legalName: z.string().trim().min(2, 'Nama sesuai identitas wajib diisi.').max(200),
    country: z
      .string()
      .trim()
      .length(2, 'Gunakan kode negara dua huruf.')
      .regex(/^[A-Za-z]{2}$/, 'Kode negara tidak valid.')
      .default('ID'),
    city: z.string().trim().max(120).optional().or(z.literal('')),
    address: z.string().trim().max(500).optional().or(z.literal('')),
    organizationName: z.string().trim().max(200).optional().or(z.literal('')),
    organizationRole: z.string().trim().max(120).optional().or(z.literal('')),
    applicationNote: z.string().trim().max(2000).optional().or(z.literal('')),
    /**
     * Never stored in the clear. The server hashes it before it reaches the
     * database (docs/SECURITY.md Â§9).
     */
    identityNumber: z.string().trim().max(64).optional().or(z.literal('')),
    acceptTerms: z.literal(true, {
      error: 'Anda harus menyetujui ketentuan untuk melanjutkan.',
    }),
  })
  .refine(
    (value) => value.investorType !== 'institution' || (value.organizationName ?? '').length > 0,
    { message: 'Nama institusi wajib diisi.', path: ['organizationName'] },
  )

export type InvestorApplicationInput = z.infer<typeof investorApplicationSchema>

/* -------------------------------------------------------------------------- */
/* Admin provisioning                                                         */
/* -------------------------------------------------------------------------- */

export const createAdminSchema = z.object({
  fullName: z.string().trim().min(2, 'Nama wajib diisi.').max(200),
  email: emailSchema,
  roleId: z.uuid('Peran tidak valid.'),
  title: z.string().trim().max(120).optional().or(z.literal('')),
})

export type CreateAdminInput = z.infer<typeof createAdminSchema>

export const updateAdminSchema = z.object({
  adminId: z.uuid('Administrator tidak valid.'),
  fullName: z.string().trim().min(2, 'Nama wajib diisi.').max(200),
  roleId: z.uuid('Peran tidak valid.'),
  title: z.string().trim().max(120).optional().or(z.literal('')),
})

export type UpdateAdminInput = z.infer<typeof updateAdminSchema>

/* -------------------------------------------------------------------------- */
/* Public inquiry                                                             */
/* -------------------------------------------------------------------------- */

export const portalInquirySchema = z.object({
  name: z.string().trim().min(2, 'Nama wajib diisi.').max(200),
  email: emailSchema,
  phone: z.string().trim().max(32).optional().or(z.literal('')),
  organization: z.string().trim().max(200).optional().or(z.literal('')),
  message: z.string().trim().min(10, 'Pesan terlalu singkat.').max(5000),
  sourcePage: z.string().max(255).optional(),
})

export type PortalInquiryInput = z.infer<typeof portalInquirySchema>
