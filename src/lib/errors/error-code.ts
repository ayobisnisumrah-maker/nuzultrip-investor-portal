export const ERROR_CODES = [
  'VALIDATION',
  'AUTHENTICATION',
  'AUTHORIZATION',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'EXTERNAL_SERVICE',
  'DATABASE',
  'NETWORK',
  'INTERNAL',
  'UNKNOWN',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]
