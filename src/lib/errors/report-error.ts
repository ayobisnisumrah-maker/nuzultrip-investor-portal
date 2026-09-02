import { isProduction } from '@/lib/env'

import { classifyError } from './classify-error'
import { createErrorId } from './error-id'
import type { ErrorReport, ErrorReportContext } from './error-report'
import { normalizeError } from './normalize-error'
import { consoleErrorReporter } from './reporters'
import { sanitizeError } from './sanitize-error'

export type { ErrorReport, ErrorReportContext }

function createFingerprint(
  source: string,
  code: string,
  errorName: string,
  digest?: string,
): string {
  return [source, code, errorName, digest ?? 'no-digest'].join(':')
}

export function reportError(
  error: unknown,
  context: ErrorReportContext = {},
): ErrorReport {
  const normalized = normalizeError(error)
  const sanitized = sanitizeError(normalized)
  const code = classifyError(error)

  const source = context.source ?? 'application'
  const errorId = context.errorId ?? createErrorId()

  const report: ErrorReport = {
    errorId,
    occurredAt: new Date().toISOString(),
    source,
    code,
    error: sanitized,
    digest: context.digest,
    pathname: context.pathname,
    metadata: context.metadata,
    fingerprint: createFingerprint(
      source,
      code,
      sanitized.name,
      context.digest,
    ),
  }

  if (!isProduction()) {
    void consoleErrorReporter.report(report)
  }

  return report
}