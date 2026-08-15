'use client'

import { Radio, RefreshCw, WifiOff } from 'lucide-react'
import { CONNECTION_LABELS } from '@/core/realtime/events'
import { cn } from '@/lib/cn'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/menu'
import { useRealtime } from './realtime-provider'

/**
 * The live-data indicator.
 *
 * The user should always be able to tell whether they are looking at live data
 * (docs/REALTIME.md §6). A silent failure that leaves stale figures on screen
 * is worse than a visible warning — especially on a page showing money.
 */
export function RealtimeStatus({ className }: { className?: string }) {
  const { state } = useRealtime()

  const presentation = {
    connecting: { Icon: RefreshCw, tone: 'text-fg-subtle', spin: true },
    connected: { Icon: Radio, tone: 'text-success-fg', spin: false },
    degraded: { Icon: WifiOff, tone: 'text-warning-fg', spin: false },
    offline: { Icon: WifiOff, tone: 'text-danger-fg', spin: false },
  }[state]

  const { Icon, tone, spin } = presentation

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="status"
          aria-live="polite"
          data-testid="realtime-status"
          data-state={state}
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-sm',
            tone,
            className,
          )}
        >
          <Icon aria-hidden="true" className={cn('size-4', spin && 'motion-safe:animate-spin')} />
          <span className="sr-only">{CONNECTION_LABELS[state]}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {CONNECTION_LABELS[state]}
        {state === 'degraded' || state === 'offline' ? (
          <span className="text-fg-inverse/70 mt-1 block">
            Data mungkin tidak mutakhir. Kami mencoba menyambung kembali.
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}
