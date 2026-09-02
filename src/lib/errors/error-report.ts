import type { ErrorCode } from './error-code'
import type { SanitizedError } from './sanitize-error'

export type ErrorReportContext = {
  errorId?: string
  source?: string
  digest?: string
  pathname?: string
  metadata?: Record<string, unknown>
}

export type ErrorReport = {
  errorId: string
  occurredAt: string
  source: string
  code: ErrorCode
  error: SanitizedError
  digest?: string
  pathname?: string
  metadata?: Record<string, unknown>
  fingerprint: string
}
