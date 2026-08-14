/**
 * Domain errors.
 *
 * Every one of these carries a stable `code` that entry points map to an HTTP
 * status and a user-facing message. The `message` is for logs and developers;
 * `publicMessage` is the only thing a client is ever shown, so an internal
 * detail cannot leak by accident (docs/SECURITY.md §9).
 */

export type ErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'validation_failed'
  | 'conflict'
  | 'rate_limited'
  | 'invalid_transition'
  | 'immutable'
  | 'internal'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly publicMessage: string
  readonly details: Record<string, unknown> | undefined

  constructor(
    code: ErrorCode,
    message: string,
    publicMessage: string,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = new.target.name
    this.code = code
    this.publicMessage = publicMessage
    this.details = details
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'No authenticated principal.') {
    super('unauthenticated', message, 'Anda perlu masuk untuk melanjutkan.')
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('forbidden', message, 'Anda tidak memiliki izin untuk melakukan tindakan ini.', details)
  }
}

export class NotFoundError extends AppError {
  /**
   * Note: a resource the caller is not permitted to see is reported as not
   * found, not as forbidden. Distinguishing the two tells an attacker which
   * ids exist.
   */
  constructor(entity: string, message = `${entity} not found.`) {
    super('not_found', message, 'Data yang Anda cari tidak ditemukan.', { entity })
  }
}

export class ValidationError extends AppError {
  readonly fieldErrors: Record<string, string[]>

  constructor(fieldErrors: Record<string, string[]>, message = 'Input validation failed.') {
    super('validation_failed', message, 'Periksa kembali isian Anda.', { fieldErrors })
    this.fieldErrors = fieldErrors
  }
}

export class ConflictError extends AppError {
  constructor(message: string, publicMessage = 'Data ini sudah ada atau sedang berubah.') {
    super('conflict', message, publicMessage)
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number

  constructor(retryAfterSeconds: number, message = 'Rate limit exceeded.') {
    super('rate_limited', message, 'Terlalu banyak percobaan. Silakan coba lagi nanti.', {
      retryAfterSeconds,
    })
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export class InvalidTransitionError extends AppError {
  constructor(from: string, to: string, entity: string) {
    super(
      'invalid_transition',
      `${entity} cannot move from ${from} to ${to}.`,
      'Perubahan status ini tidak diizinkan.',
      { from, to, entity },
    )
  }
}

export class ImmutableError extends AppError {
  constructor(message: string) {
    super('immutable', message, 'Data yang sudah terbit tidak dapat diubah. Buat versi baru.')
  }
}

export class InternalError extends AppError {
  constructor(message: string, cause?: unknown) {
    super('internal', message, 'Terjadi kesalahan pada sistem.')
    if (cause !== undefined) this.cause = cause
  }
}

/* -------------------------------------------------------------------------- */

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

const HTTP_STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation_failed: 422,
  conflict: 409,
  rate_limited: 429,
  invalid_transition: 409,
  immutable: 409,
  internal: 500,
}

export function httpStatusFor(code: ErrorCode): number {
  return HTTP_STATUS[code]
}
