import { Lock, RefreshCw, SearchX, ServerCrash, WifiOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { KhatimSpinner, KhatimStar } from './geometry/khatim'
import { Skeleton } from './primitives'

/**
 * Every screen has designed empty, loading, error and forbidden states — a
 * screen without them is not finished (docs/DESIGN-SYSTEM.md §8).
 *
 * Empty states explain *what will appear here and who provides it*, never
 * "Nothing to see".
 */

type StateShellProps = {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  tone?: 'neutral' | 'danger'
  role?: 'status' | 'alert'
}

function StateShell({
  icon,
  title,
  description,
  action,
  className,
  tone = 'neutral',
  role = 'status',
}: StateShellProps) {
  return (
    <div
      role={role}
      className={cn(
        'border-border flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed',
        'px-6 py-12 text-center',
        className,
      )}
    >
      <span
        className={cn(
          'grid size-12 place-items-center rounded-full',
          tone === 'danger' ? 'bg-danger-subtle text-danger-fg' : 'bg-sunken text-fg-subtle',
        )}
      >
        {icon ?? <KhatimStar className="size-5" />}
      </span>
      <p className="text-heading-sm text-fg">{title}</p>
      {description ? <p className="text-body-sm text-fg-muted max-w-prose">{description}</p> : null}
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}

export function EmptyState(props: Omit<StateShellProps, 'tone' | 'role'>) {
  return <StateShell {...props} />
}

export function NoResultsState({
  query,
  onReset,
  className,
}: {
  query?: string
  onReset?: React.ReactNode
  className?: string
}) {
  return (
    <StateShell
      className={className}
      icon={<SearchX aria-hidden="true" className="size-5" />}
      title={query ? `Tidak ada hasil untuk “${query}”` : 'Tidak ada hasil'}
      description="Coba ubah kata kunci atau hapus sebagian filter."
      action={onReset}
    />
  )
}

export function ErrorState({
  title = 'Terjadi kesalahan',
  description = 'Kami tidak dapat memuat data ini. Silakan coba lagi.',
  correlationId,
  action,
  className,
}: {
  title?: React.ReactNode
  /** Never surface a stack trace or database error to a user. */
  description?: React.ReactNode
  /** The id to quote when reporting the problem — safe to show, unlike details. */
  correlationId?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <StateShell
      className={className}
      tone="danger"
      role="alert"
      icon={<ServerCrash aria-hidden="true" className="size-5" />}
      title={title}
      description={
        <>
          {description}
          {correlationId ? (
            <>
              <br />
              <span className="text-caption text-fg-subtle">
                Kode referensi: <code className="font-mono">{correlationId}</code>
              </span>
            </>
          ) : null}
        </>
      }
      action={action}
    />
  )
}

export function ForbiddenState({
  title = 'Anda tidak memiliki akses',
  description = 'Akun Anda tidak memiliki izin untuk melihat halaman ini. Hubungi administrator bila Anda merasa ini keliru.',
  action,
  className,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <StateShell
      className={className}
      icon={<Lock aria-hidden="true" className="size-5" />}
      title={title}
      description={description}
      action={action}
    />
  )
}

export function LoadingState({
  label = 'Memuat data',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12', className)}
      aria-live="polite"
    >
      <KhatimSpinner className="text-primary" label={label} />
      <p className="text-body-sm text-fg-muted">{label}…</p>
    </div>
  )
}

/** Skeleton shaped like a list of records — used while a table loads. */
export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  )
}

/**
 * Shown when the realtime socket is down. The user always knows whether they
 * are looking at live data (docs/REALTIME.md §6).
 */
export function OfflineBanner({
  onRetry,
  className,
}: {
  onRetry?: React.ReactNode
  className?: string
}) {
  return (
    <div
      role="status"
      className={cn(
        'border-warning-border bg-warning-subtle flex items-center gap-2.5 border-b px-4 py-2',
        'text-body-sm text-warning-fg',
        className,
      )}
    >
      <WifiOff aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        Koneksi langsung terputus. Data mungkin tidak mutakhir.
      </span>
      {onRetry ?? <RefreshCw aria-hidden="true" className="size-4 shrink-0 animate-spin" />}
    </div>
  )
}
