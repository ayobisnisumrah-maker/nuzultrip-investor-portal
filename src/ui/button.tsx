import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { KhatimSpinner } from './geometry/khatim'

/**
 * Gold is never a routine action fill (docs/DESIGN-SYSTEM.md §2). There is
 * intentionally no `accent` button variant — the accent marks significance,
 * and a form's submit button is not significant in that sense.
 */
const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap',
    'transition-colors duration-(--d-fast) ease-(--ease-out-quart)',
    'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:pointer-events-none disabled:opacity-50',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active',
        secondary:
          'border border-border-strong bg-surface text-fg hover:bg-sunken active:bg-sunken',
        ghost: 'text-fg-muted hover:bg-sunken hover:text-fg active:bg-sunken',
        danger: 'bg-danger text-on-primary hover:bg-danger-hover',
        link: 'h-auto p-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        // 44px minimum touch target on coarse pointers (docs/DESIGN-SYSTEM.md §9).
        sm: 'h-8 min-h-11 px-3 text-body-sm pointer-fine:min-h-8',
        md: 'h-10 min-h-11 px-4 text-body-sm pointer-fine:min-h-10',
        lg: 'h-12 px-6 text-body',
        icon: 'size-10 min-h-11 min-w-11 p-0 pointer-fine:size-9 pointer-fine:min-h-9 pointer-fine:min-w-9',
      },
      fullWidth: { true: 'w-full', false: '' },
    },
    compoundVariants: [{ variant: 'link', size: 'md', class: 'h-auto min-h-0 px-0' }],
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  },
)

export type ButtonProps = React.ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render as the single child element instead of a <button>. */
    asChild?: boolean
    /** Shows a spinner and blocks interaction. The label stays in place. */
    loading?: boolean
    /** Required when the button has no visible text. */
    'aria-label'?: string
  }

export function Button({
  className,
  variant,
  size,
  fullWidth,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return (
    <Component
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          {/* The label keeps its position so the button does not resize. */}
          <span className="invisible contents">{children}</span>
          <span className="absolute inset-0 grid place-items-center">
            <KhatimSpinner />
          </span>
        </>
      ) : (
        children
      )}
    </Component>
  )
}

export { buttonVariants }
