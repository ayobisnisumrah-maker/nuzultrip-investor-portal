'use client'

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Toasts announce transient outcomes. They are a courtesy, never the only
 * record of anything — a failed mutation must also leave the UI in a state that
 * shows it failed.
 */

export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

export type Toast = {
  id: string
  tone: ToastTone
  title: string
  description?: string
  /** Milliseconds. Danger toasts default to staying until dismissed. */
  duration?: number
}

type ToastContextValue = {
  toasts: readonly Toast[]
  push: (toast: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION = 5000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([])
  const counter = useRef(0)
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      counter.current += 1
      const id = `toast-${counter.current}`
      setToasts((current) => [...current, { ...toast, id }])

      // Errors stay until dismissed: a message the user missed is a message
      // that did not happen.
      const duration = toast.duration ?? (toast.tone === 'danger' ? 0 : DEFAULT_DURATION)
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        )
      }
      return id
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach((timer) => clearTimeout(timer))
      pending.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ toasts, push, dismiss }), [toasts, push, dismiss])

  return (
    <ToastContext value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext>
  )
}

export function useToast(): ToastContextValue {
  const context = use(ToastContext)
  if (!context) throw new Error('useToast must be used within <ToastProvider>.')
  return context
}

const toneStyles: Record<ToastTone, { className: string; Icon: typeof Info }> = {
  info: { className: 'border-info-border bg-info-subtle text-info-fg', Icon: Info },
  success: {
    className: 'border-success-border bg-success-subtle text-success-fg',
    Icon: CheckCircle2,
  },
  warning: {
    className: 'border-warning-border bg-warning-subtle text-warning-fg',
    Icon: AlertTriangle,
  },
  danger: { className: 'border-danger-border bg-danger-subtle text-danger-fg', Icon: XCircle },
}

function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: readonly Toast[]
  onDismiss: (id: string) => void
}) {
  return (
    <div
      // Two regions: assertive for failures, polite for everything else.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
    >
      {toasts.map((toast) => {
        const { className, Icon } = toneStyles[toast.tone]
        return (
          <div
            key={toast.id}
            role={toast.tone === 'danger' ? 'alert' : 'status'}
            aria-live={toast.tone === 'danger' ? 'assertive' : 'polite'}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm gap-3 rounded-md border p-3.5 shadow-overlay',
              'motion-safe:animate-rise',
              className,
            )}
          >
            <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-body-sm font-semibold">{toast.title}</p>
              {toast.description ? (
                <p className="text-caption text-fg">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Tutup notifikasi"
              className="-m-1 grid size-7 shrink-0 place-items-center rounded-sm text-current opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
