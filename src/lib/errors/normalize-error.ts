export type NormalizedError = {
  name: string
  message: string
}

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
    }
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
    }
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return {
      name:
        'name' in error && typeof error.name === 'string'
          ? error.name
          : 'Error',
      message: error.message,
    }
  }

  return {
    name: 'UnknownError',
    message: 'An unknown error occurred',
  }
}
