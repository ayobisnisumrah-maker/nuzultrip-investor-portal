import { cva, type VariantProps } from 'class-variance-authority'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

const alertVariants = cva('flex gap-3 rounded-md border p-4', {
  variants: {
    tone: {
      info: 'border-info-border bg-info-subtle text-info-fg',
      success: 'border-success-border bg-success-subtle text-success-fg',
      warning: 'border-warning-border bg-warning-subtle text-warning-fg',
      danger: 'border-danger-border bg-danger-subtle text-danger-fg',
    },
  },
  defaultVariants: { tone: 'info' },
})

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const

export type AlertProps = React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof alertVariants> & {
    title?: React.ReactNode
    /** Rendered after the description — typically a Button. */
    action?: React.ReactNode
  }

export function Alert({ className, tone = 'info', title, action, children, ...props }: AlertProps) {
  const Icon = icons[tone ?? 'info']
  return (
    <div
      // `danger` interrupts; the rest wait for a natural pause.
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        {title ? <p className="text-body-sm font-semibold">{title}</p> : null}
        {children ? <div className="text-body-sm text-fg">{children}</div> : null}
        {action ? <div className="mt-2 flex gap-2">{action}</div> : null}
      </div>
    </div>
  )
}

export { alertVariants }
