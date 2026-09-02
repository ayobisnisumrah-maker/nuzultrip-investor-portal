import type { ErrorReporter } from './types'

export const consoleErrorReporter: ErrorReporter = {
  report(report) {
    console.error('[Application Error]', report)
  },
}
