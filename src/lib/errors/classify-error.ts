import type { ErrorCode } from './error-code'

type ErrorLike = {
  name?: string
  message?: string
  status?: number
  statusCode?: number
  code?: string
}

function toErrorLike(error: unknown): ErrorLike {
  if (typeof error !== 'object' || error === null) {
    return {}
  }

  return error as ErrorLike
}

export function classifyError(error: unknown): ErrorCode {
  const value = toErrorLike(error)

  const status = value.status ?? value.statusCode
  const code = value.code?.toUpperCase()
  const name = value.name?.toLowerCase() ?? ''

  if (status === 400 || code?.includes('VALIDATION')) {
    return 'VALIDATION'
  }

  if (status === 401 || name.includes('authentication')) {
    return 'AUTHENTICATION'
  }

  if (status === 403 || name.includes('authorization')) {
    return 'AUTHORIZATION'
  }

  if (status === 404 || code === 'NOT_FOUND') {
    return 'NOT_FOUND'
  }

  if (status === 409 || code === 'CONFLICT') {
    return 'CONFLICT'
  }

  if (status === 429 || code?.includes('RATE')) {
    return 'RATE_LIMITED'
  }

  if (
    name.includes('fetch') ||
    name.includes('network') ||
    code?.includes('NETWORK')
  ) {
    return 'NETWORK'
  }

  if (
    name.includes('postgres') ||
    name.includes('database') ||
    code?.startsWith('23') ||
    code?.startsWith('42')
  ) {
    return 'DATABASE'
  }

  if (
    code?.includes('EXTERNAL') ||
    code?.includes('SERVICE_UNAVAILABLE')
  ) {
    return 'EXTERNAL_SERVICE'
  }

  if (error instanceof Error) {
    return 'INTERNAL'
  }

  return 'UNKNOWN'
}
