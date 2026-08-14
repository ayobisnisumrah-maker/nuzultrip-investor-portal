'use client'

import { useCallback, useState, useTransition } from 'react'
import type { ActionResult } from '@/server/auth/guards'

/**
 * Binds a `defineAction` Server Action to a form.
 *
 * Actions return a serialisable `ActionResult` rather than throwing, so this
 * hook can surface a field-level error, a general message and the correlation
 * id without any try/catch at the call site.
 */
export type ActionState<TData> = {
  pending: boolean
  data: TData | null
  /** Safe to display. Never an internal message. */
  errorMessage: string | null
  errorCode: string | null
  fieldErrors: Record<string, string[]>
  correlationId: string | null
}

const IDLE = {
  data: null,
  errorMessage: null,
  errorCode: null,
  fieldErrors: {},
  correlationId: null,
} as const

export function useAction<TInput, TData>(
  action: (input: TInput) => Promise<ActionResult<TData>>,
): ActionState<TData> & {
  run: (input: TInput) => void
  reset: () => void
  fieldError: (field: string) => string | undefined
} {
  const [pending, startTransition] = useTransition()
  const [state, setState] = useState<Omit<ActionState<TData>, 'pending'>>(IDLE)

  const run = useCallback(
    (input: TInput) => {
      startTransition(async () => {
        try {
          const result = await action(input)
          if (result.ok) {
            setState({ ...IDLE, data: result.data })
          } else {
            setState({
              data: null,
              errorMessage: result.error.message,
              errorCode: result.error.code,
              fieldErrors: result.error.fieldErrors ?? {},
              correlationId: result.error.correlationId,
            })
          }
        } catch {
          // A network failure or a serialisation problem — the action itself
          // never throws. The user still needs to be told something happened.
          setState({
            data: null,
            errorMessage: 'Koneksi terputus. Periksa jaringan Anda dan coba lagi.',
            errorCode: 'network',
            fieldErrors: {},
            correlationId: null,
          })
        }
      })
    },
    [action],
  )

  const reset = useCallback(() => setState(IDLE), [])

  const fieldError = useCallback(
    (field: string) => state.fieldErrors[field]?.[0],
    [state.fieldErrors],
  )

  return { pending, ...state, run, reset, fieldError }
}
