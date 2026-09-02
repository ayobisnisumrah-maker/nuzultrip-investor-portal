import type { NormalizedError } from './normalize-error'

export type SanitizedError = {
  name: string
  message: string
}

const SENSITIVE_PATTERNS = [
  /password\s*[:=]\s*\S+/gi,
  /token\s*[:=]\s*\S+/gi,
  /authorization\s*[:=]\s*\S+/gi,
  /bearer\s+[a-z0-9._-]+/gi,
  /apikey\s*[:=]\s*\S+/gi,
  /api[_-]?key\s*[:=]\s*\S+/gi,
]

function redactSensitiveValue(value: string): string {
  return SENSITIVE_PATTERNS.reduce(
    (sanitized, pattern) => sanitized.replace(pattern, '[REDACTED]'),
    value,
  )
}

export function sanitizeError(error: NormalizedError): SanitizedError {
  return {
    name: redactSensitiveValue(error.name).slice(0, 120),
    message: redactSensitiveValue(error.message).slice(0, 500),
  }
}
