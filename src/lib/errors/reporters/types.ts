import type { ErrorReport } from '../error-report'

export type ErrorReporter = {
  report: (report: ErrorReport) => void | Promise<void>
}
