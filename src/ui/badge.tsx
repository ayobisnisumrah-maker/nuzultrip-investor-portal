import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

/**
 * Every tone pairs a `*-subtle` background with its matching `*-fg`, a
 * combination `palette.test.ts` proves meets AA in both themes.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-border bg-sunken text-fg-muted',
        primary: 'border-primary-border bg-primary-subtle text-primary',
        accent: 'border-accent-border bg-accent-subtle text-accent',
        success: 'border-success-border bg-success-subtle text-success-fg',
        warning: 'border-warning-border bg-warning-subtle text-warning-fg',
        danger: 'border-danger-border bg-danger-subtle text-danger-fg',
        info: 'border-info-border bg-info-subtle text-info-fg',
      },
      size: {
        sm: 'px-2 py-0 text-[0.6875rem]',
        md: 'px-2.5 py-0.5 text-caption',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
)

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>

export type BadgeProps = React.ComponentPropsWithoutRef<'span'> & VariantProps<typeof badgeVariants>

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}

/**
 * A badge with a leading dot. Status is never communicated by colour alone —
 * the text label always carries the meaning; the dot and tone reinforce it.
 */
export function StatusBadge({
  className,
  tone,
  size,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  )
}

export { badgeVariants }
