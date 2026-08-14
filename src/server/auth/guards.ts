import 'server-only'

import type { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  hasPermission,
  isAdmin,
  isInvestor,
  type AdminPrincipal,
  type InvestorPrincipal,
  type Principal,
} from '@/core/auth/principal'
import type { Permission } from '@/core/rbac/permissions'
import {
  type AppError,
  ForbiddenError,
  InternalError,
  UnauthenticatedError,
  ValidationError,
  httpStatusFor,
  isAppError,
} from '@/core/errors'
import type { Database } from '@/types/database'
import { getServerSupabase } from '@/server/supabase/server'
import { getCorrelationId, writeAudit, type AuditEntry } from '@/server/audit'
import { getPrincipal } from './session'

/**
 * The entry-point contract (docs/ARCHITECTURE.md §5).
 *
 * Every mutation performs, in order:
 *   1. authenticate  — resolve the Principal
 *   2. authorise     — before any I/O
 *   3. validate      — Zod-parse; unparsed input never reaches a service
 *   4. delegate      — run the handler
 *   5. audit         — record what happened
 *
 * `access` is a required field. There is no way to define an action without
 * stating who may call it; a public one must say `'public'` explicitly, which
 * makes every such decision greppable.
 */

/* -------------------------------------------------------------------------- */
/* Assertions                                                                 */
/* -------------------------------------------------------------------------- */

export function requireAuthenticated(principal: Principal): AdminPrincipal | InvestorPrincipal {
  if (principal.kind === 'anonymous') throw new UnauthenticatedError()
  return principal
}

export function requireAdmin(principal: Principal): AdminPrincipal {
  if (!isAdmin(principal)) {
    throw principal.kind === 'anonymous'
      ? new UnauthenticatedError()
      : new ForbiddenError('An admin principal is required.')
  }
  return principal
}

export function requirePermission(principal: Principal, permission: Permission): AdminPrincipal {
  const admin = requireAdmin(principal)
  if (!hasPermission(admin, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`, { permission })
  }
  return admin
}

/**
 * An investor whose lifecycle status grants access to data. A submitted or
 * deactivated investor is authenticated but has no data access, and must not be
 * treated as though they do.
 */
export function requireInvestorAccess(principal: Principal): InvestorPrincipal {
  if (!isInvestor(principal)) {
    throw principal.kind === 'anonymous'
      ? new UnauthenticatedError()
      : new ForbiddenError('An investor principal is required.')
  }
  if (!principal.hasDataAccess) {
    throw new ForbiddenError(`Investor status "${principal.status}" does not grant data access.`, {
      status: principal.status,
    })
  }
  return principal
}

/* -------------------------------------------------------------------------- */
/* Result type                                                                */
/* -------------------------------------------------------------------------- */

export type ActionSuccess<T> = { ok: true; data: T }

export type ActionFailure = {
  ok: false
  error: {
    code: string
    /** Safe to display. Never an internal message. */
    message: string
    fieldErrors?: Record<string, string[]>
    /** Quote this when reporting a problem. */
    correlationId: string
  }
}

export type ActionResult<T> = ActionSuccess<T> | ActionFailure

/* -------------------------------------------------------------------------- */
/* defineAction                                                               */
/* -------------------------------------------------------------------------- */

/** Who may call this entry point. Required — there is no default. */
export type AccessRule =
  /** Anyone, including unauthenticated visitors. State it deliberately. */
  | 'public'
  /** Any signed-in principal, admin or investor. */
  | 'authenticated'
  /** An investor whose status grants data access. */
  | 'investor'
  /** Any active admin, regardless of role. */
  | 'admin'
  /** An admin holding this specific permission. The usual case. */
  | { permission: Permission }

export type ActionContext<TInput> = {
  principal: Principal
  input: TInput
  /** Request-scoped and RLS-bound. Never the service-role client. */
  supabase: SupabaseClient<Database>
  correlationId: string
  /**
   * Refine the audit record from inside the handler — typically to attach the
   * entity id and a diff that are only known once the work is done.
   */
  audit: (patch: Partial<AuditEntry>) => void
}

export type ActionDefinition<TSchema extends z.ZodType, TResult> = {
  access: AccessRule
  /** Omit for an action that takes no arguments. */
  input?: TSchema
  /** Present for every mutation; omitted for reads. */
  audit?: Pick<AuditEntry, 'action' | 'entityType'> & { summary?: string }
  handler: (context: ActionContext<z.output<TSchema>>) => Promise<TResult>
}

/**
 * The authorisation decision, isolated from any I/O so the whole matrix can be
 * tested directly (`guards.test.ts`). Throws; never returns a boolean, so a
 * caller cannot accidentally ignore the result.
 */
export function assertAccess(principal: Principal, access: AccessRule): void {
  if (typeof access === 'object') {
    requirePermission(principal, access.permission)
    return
  }
  switch (access) {
    case 'public':
      return
    case 'authenticated':
      requireAuthenticated(principal)
      return
    case 'investor':
      requireInvestorAccess(principal)
      return
    case 'admin':
      requireAdmin(principal)
      return
  }
}

/**
 * Wrap a Server Action.
 *
 * Returns a serialisable `ActionResult` rather than throwing: a thrown error in
 * a Server Action reaches production clients as an opaque "an error occurred",
 * which is useless to the user and hides the correlation id they need in order
 * to report it.
 */
export function defineAction<TResult, TSchema extends z.ZodType = z.ZodUndefined>(
  definition: ActionDefinition<TSchema, TResult>,
): (input: z.input<TSchema>) => Promise<ActionResult<TResult>> {
  return async (rawInput: z.input<TSchema>): Promise<ActionResult<TResult>> => {
    const correlationId = getCorrelationId()

    try {
      // 1. Authenticate.
      const principal = await getPrincipal()

      // 2. Authorise — before any I/O, so an unauthorised caller cannot even
      //    probe for existence through timing.
      assertAccess(principal, definition.access)

      // 3. Validate.
      let input = rawInput as z.output<TSchema>
      if (definition.input) {
        const parsed = definition.input.safeParse(rawInput)
        if (!parsed.success) {
          throw new ValidationError(fieldErrorsFrom(parsed.error))
        }
        input = parsed.data
      }

      // 4. Delegate.
      const supabase = await getServerSupabase()
      let auditPatch: Partial<AuditEntry> = {}

      const data = await definition.handler({
        principal,
        input,
        supabase,
        correlationId,
        audit: (patch) => {
          auditPatch = { ...auditPatch, ...patch }
        },
      })

      // 5. Audit.
      if (definition.audit) {
        await writeAudit(principal, {
          ...definition.audit,
          ...auditPatch,
          action: auditPatch.action ?? definition.audit.action,
          entityType: auditPatch.entityType ?? definition.audit.entityType,
        })
      }

      return { ok: true, data }
    } catch (error) {
      return toFailure(error, correlationId, definition.audit?.action)
    }
  }
}

/* -------------------------------------------------------------------------- */
/* defineRoute                                                                */
/* -------------------------------------------------------------------------- */

export type RouteContext<TInput> = ActionContext<TInput> & { request: Request }

/**
 * Wrap a Route Handler. Same contract as `defineAction`; the transport differs,
 * the security does not. Errors become RFC 7807-shaped problem documents.
 */
export function defineRoute<TSchema extends z.ZodType>(definition: {
  access: AccessRule
  input?: TSchema
  audit?: Pick<AuditEntry, 'action' | 'entityType'>
  handler: (context: RouteContext<z.output<TSchema>>) => Promise<Response>
}): (request: Request, ...rest: unknown[]) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const correlationId = getCorrelationId()

    try {
      const principal = await getPrincipal()
      assertAccess(principal, definition.access)

      let input = undefined as z.output<TSchema>
      if (definition.input) {
        const body = await readBody(request)
        const parsed = definition.input.safeParse(body)
        if (!parsed.success) throw new ValidationError(fieldErrorsFrom(parsed.error))
        input = parsed.data
      }

      const supabase = await getServerSupabase()
      let auditPatch: Partial<AuditEntry> = {}

      const response = await definition.handler({
        principal,
        input,
        supabase,
        correlationId,
        request,
        audit: (patch) => {
          auditPatch = { ...auditPatch, ...patch }
        },
      })

      if (definition.audit) {
        await writeAudit(principal, {
          ...definition.audit,
          ...auditPatch,
          action: auditPatch.action ?? definition.audit.action,
          entityType: auditPatch.entityType ?? definition.audit.entityType,
        })
      }

      return response
    } catch (error) {
      return problemResponse(error, correlationId)
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Error translation                                                          */
/* -------------------------------------------------------------------------- */

function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return fieldErrors
}

function normalise(error: unknown): AppError {
  if (isAppError(error)) return error
  return new InternalError(error instanceof Error ? error.message : String(error), error)
}

function logFailure(error: AppError, correlationId: string, action: string | undefined): void {
  // Structured, and never containing a token, a signed URL, or a password.
  const payload = {
    level: error.code === 'internal' ? 'error' : 'warn',
    correlationId,
    code: error.code,
    action: action ?? null,
    message: error.message,
  }
  if (error.code === 'internal') {
    console.error(JSON.stringify(payload), error.cause ?? '')
  } else {
    console.warn(JSON.stringify(payload))
  }
}

function toFailure(error: unknown, correlationId: string, action?: string): ActionFailure {
  const appError = normalise(error)
  logFailure(appError, correlationId, action)

  return {
    ok: false,
    error: {
      code: appError.code,
      // The internal message never crosses this boundary.
      message: appError.publicMessage,
      ...(appError instanceof ValidationError ? { fieldErrors: appError.fieldErrors } : {}),
      correlationId,
    },
  }
}

function problemResponse(error: unknown, correlationId: string): Response {
  const appError = normalise(error)
  logFailure(appError, correlationId, undefined)

  const status = httpStatusFor(appError.code)
  return Response.json(
    {
      type: `https://nuzultrip.invalid/problems/${appError.code}`,
      title: appError.publicMessage,
      status,
      correlationId,
      ...(appError instanceof ValidationError ? { errors: appError.fieldErrors } : {}),
    },
    {
      status,
      headers: {
        'content-type': 'application/problem+json',
        'cache-control': 'no-store',
        ...(appError.code === 'rate_limited' && 'retryAfterSeconds' in appError
          ? { 'retry-after': String((appError as { retryAfterSeconds: number }).retryAfterSeconds) }
          : {}),
      },
    },
  )
}

async function readBody(request: Request): Promise<unknown> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return Object.fromEntries(new URL(request.url).searchParams)
  }
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return (await request.json()) as unknown
  }
  if (contentType.includes('form')) {
    return Object.fromEntries(await request.formData())
  }
  return {}
}
