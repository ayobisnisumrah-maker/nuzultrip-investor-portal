import 'server-only'

import { createHash } from 'node:crypto'
import { getClientEnv } from '@/lib/env'
import { getServerEnv } from '@/lib/server-env'
import { ConflictError, InternalError } from '@/core/errors'
import type { InvestorApplicationInput, CreateAdminInput } from '@/core/auth/schemas'
import { getServiceRoleClient } from './service-client'

/**
 * Account provisioning.
 *
 * One of the enumerated service-role uses: the Auth admin API requires it, and
 * no RLS policy can express "create an account" (docs/SECURITY.md §3).
 *
 * The auth user and the domain record cannot be created in one transaction, so
 * every path here compensates: if the domain half fails, the auth user is
 * removed rather than left orphaned. An orphaned auth user is not merely untidy
 * — it holds the email address, so the applicant could never retry.
 */

/**
 * Identity numbers are stored as a salted hash. Rotating the salt invalidates
 * every existing hash, which is why it is documented as a breaking change.
 */
function hashIdentityNumber(value: string): string {
  return createHash('sha256')
    .update(`${getServerEnv().IDENTITY_HASH_SALT}:${value.replace(/\s+/g, '')}`)
    .digest('hex')
}

/**
 * Blank optional fields are sent as `undefined`, not `null`.
 *
 * The generated RPC signatures type parameters that have a SQL default as
 * optional, so omitting one lets the database apply its own default. Passing
 * `null` would be a type error and, for parameters whose default is not null,
 * would mean something different.
 */
const blankToUndefined = (value: string | null | undefined): string | undefined =>
  value === undefined || value === null || value.trim() === '' ? undefined : value.trim()

export type ProvisionedInvestor = {
  userId: string
  investorId: string
  referenceCode: string
  confirmationLink: string | null
}

export async function provisionInvestorApplication(
  input: InvestorApplicationInput,
): Promise<ProvisionedInvestor> {
  const client = getServiceRoleClient()

  const { data: created, error: createError } = await client.auth.admin.createUser({
    email: input.email,
    password: input.password,
    // The applicant must prove they control the address before the account can
    // be used. Approval is a separate, later step performed by an admin.
    email_confirm: false,
    user_metadata: { full_name: input.fullName },
  })

  if (createError || !created.user) {
    const message = createError?.message ?? 'no user returned'
    if (/already (been )?registered|already exists/i.test(message)) {
      throw new ConflictError(
        `Auth user already exists for the submitted address.`,
        'Alamat surel ini sudah terdaftar. Silakan masuk atau gunakan pemulihan kata sandi.',
      )
    }
    throw new InternalError(`Failed to create the auth user: ${message}`, createError)
  }

  const userId = created.user.id

  try {
    const { data, error } = await client.rpc('provision_investor_account', {
      p_user_id: userId,
      p_email: input.email,
      p_full_name: input.fullName,
      p_legal_name: input.legalName,
      p_investor_type: input.investorType,
      p_phone: blankToUndefined(input.phone),
      p_country: input.country.toUpperCase(),
      p_city: blankToUndefined(input.city),
      p_address: blankToUndefined(input.address),
      p_organization_name: blankToUndefined(input.organizationName),
      p_organization_role: blankToUndefined(input.organizationRole),
      p_application_note: blankToUndefined(input.applicationNote),
      p_identity_number_hash: input.identityNumber?.trim()
        ? hashIdentityNumber(input.identityNumber)
        : undefined,
    })

    if (error) {
      throw new InternalError(`Failed to provision the investor: ${error.message}`, error)
    }

    const result = data as { investorId: string; referenceCode: string }

    return {
      userId,
      investorId: result.investorId,
      referenceCode: result.referenceCode,
      confirmationLink: await generateConfirmationLink(input.email, input.password),
    }
  } catch (error) {
    // Compensate: without this the address would be permanently claimed by an
    // account that does not exist in the domain.
    await client.auth.admin.deleteUser(userId).catch(() => {
      // Nothing more can be done here, but the original failure must surface.
    })
    throw error
  }
}

/**
 * The signup confirmation link.
 *
 * GoTrue sends it through the configured SMTP transport; the link is also
 * returned so the notification outbox can carry it once the email adapter lands
 * (Phase 11). It is never logged and never returned to a browser.
 */
async function generateConfirmationLink(email: string, password: string): Promise<string | null> {
  const client = getServiceRoleClient()

  const { data, error } = await client.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      redirectTo: `${getClientEnv().NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent('/investor')}`,
    },
  })

  if (error || !data.properties) return null

  return data.properties.action_link
}

/* -------------------------------------------------------------------------- */
/* Administrators                                                             */
/* -------------------------------------------------------------------------- */

export type ProvisionedAdmin = {
  userId: string
  inviteLink: string | null
}

/**
 * Create an internal administrator.
 *
 * The invited account never receives a password from us: it sets its own
 * through a single-use, expiring invite link. A password chosen by the creator
 * is a password the creator knows.
 *
 * The human-readable role name is passed explicitly because the invitation
 * email is generated before the domain provisioning RPC runs. Supabase Auth
 * metadata therefore needs the role name at invitation time.
 */
export async function provisionAdmin(
  input: CreateAdminInput,

  /** The administrator performing the action; null only when bootstrapping. */
  createdBy: string | null,

  /** Human-readable role name for Supabase invitation email metadata. */
  roleName: string,
): Promise<ProvisionedAdmin> {
  const client = getServiceRoleClient()

  const { data: invited, error: inviteError } = await client.auth.admin.inviteUserByEmail(
    input.email,
    {
      redirectTo: `${getClientEnv().NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent('/atur-sandi')}`,

      data: {
        full_name: input.fullName,
        role_name: roleName,
      },
    },
  )

  if (inviteError || !invited.user) {
    const message = inviteError?.message ?? 'no user returned'

    if (/already (been )?registered|already exists/i.test(message)) {
      throw new ConflictError(
        'Auth user already exists for the submitted address.',
        'Alamat surel ini sudah digunakan oleh akun lain.',
      )
    }

    throw new InternalError(
      `Failed to invite the administrator: ${message}`,
      inviteError,
    )
  }

  const userId = invited.user.id

  try {
    const { error } = await client.rpc('provision_admin_account', {
      p_user_id: userId,
      p_email: input.email,
      p_full_name: input.fullName,
      p_role_id: input.roleId,
      p_title: blankToUndefined(input.title),
      p_created_by: createdBy ?? undefined,
    })

    if (error) {
      throw new InternalError(
        `Failed to provision the administrator: ${error.message}`,
        error,
      )
    }

    return {
      userId,
      inviteLink: null,
    }
  } catch (error) {
    /**
     * Compensation:
     *
     * If domain provisioning fails after the invitation Auth user has been
     * created, remove the Auth user so the email address is not permanently
     * occupied by an orphaned account.
     */
    await client.auth.admin.deleteUser(userId).catch(() => {})

    throw error
  }
}

/**
 * Bootstrap the very first Super Admin.
 *
 * A system with no administrator cannot create one through the UI, because
 * creating an administrator requires an administrator. This is that escape
 * hatch, and it **refuses to run if any admin already exists** — so it cannot
 * be used as a back door once the system is in use.
 */
export async function bootstrapFirstSuperAdmin(input: {
  email: string
  fullName: string
  password: string
}): Promise<{ userId: string }> {
  const client = getServiceRoleClient()

  if (await hasAnyAdmin()) {
    throw new ConflictError(
      'Bootstrap refused: an administrator already exists.',
      'Sistem sudah memiliki administrator. Gunakan menu Administrator untuk menambah akun.',
    )
  }

  const { data: role, error: roleError } = await client
    .from('roles')
    .select('id')
    .eq('key', 'super_admin')
    .single()

  if (roleError || !role) {
    throw new InternalError('The super_admin role is missing. Run the migrations first.')
  }

  // Unlike every later administrator, the first one sets a password directly
  // rather than being invited by email. There is nobody to invite them, and at
  // initial setup the email transport may not be configured yet — an
  // installation that cannot be completed without working email is an
  // installation that cannot be completed.
  const { data: created, error: createError } = await client.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  })

  if (createError || !created.user) {
    throw new InternalError(
      `Failed to create the first administrator: ${createError?.message ?? 'no user returned'}`,
      createError,
    )
  }

  const userId = created.user.id

  try {
    const { error } = await client.rpc('provision_admin_account', {
      p_user_id: userId,
      p_email: input.email,
      p_full_name: input.fullName,
      p_role_id: role.id,

      // No prior administrator exists to attribute this to.
      p_created_by: undefined,
    })

    if (error) {
      throw new InternalError(
        `Failed to provision the first administrator: ${error.message}`,
        error,
      )
    }

    return { userId }
  } catch (error) {
    await client.auth.admin.deleteUser(userId).catch(() => {})
    throw error
  }
}

/**
 * Whether the system has been set up yet. Uses the service role because an
 * anonymous visitor cannot read `admins` — which is exactly right, but means
 * the setup page has no other way to know whether it should exist.
 */
export async function hasAnyAdmin(): Promise<boolean> {
  const { count, error } = await getServiceRoleClient()
    .from('admins')
    .select('id', { count: 'exact', head: true })

  if (error) {
    throw new InternalError(
      `Failed to check for existing admins: ${error.message}`,
      error,
    )
  }

  return (count ?? 0) > 0
}
