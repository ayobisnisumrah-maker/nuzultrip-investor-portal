import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

/** Layout primitives. Spacing always comes from the scale, never ad hoc. */

const containerVariants = cva('mx-auto w-full px-4 sm:px-6 lg:px-8', {
  variants: {
    width: {
      narrow: 'max-w-narrow',
      content: 'max-w-content',
      wide: 'max-w-wide',
      full: 'max-w-none',
    },
  },
  defaultVariants: { width: 'content' },
})

export function Container({
  className,
  width,
  as: Component = 'div',
  ...props
}: React.ComponentPropsWithoutRef<'div'> &
  VariantProps<typeof containerVariants> & { as?: 'div' | 'section' | 'header' | 'footer' | 'main' }) {
  return <Component className={cn(containerVariants({ width }), className)} {...props} />
}

const gaps = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
  10: 'gap-10',
  12: 'gap-12',
} as const

export type Gap = keyof typeof gaps

export function Stack({
  className,
  gap = 4,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & { gap?: Gap }) {
  return <div className={cn('flex flex-col', gaps[gap], className)} {...props} />
}

export function Inline({
  className,
  gap = 3,
  wrap = true,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & { gap?: Gap; wrap?: boolean }) {
  return (
    <div
      className={cn('flex items-center', gaps[gap], wrap && 'flex-wrap', className)}
      {...props}
    />
  )
}

/** A public-portal section with the shared vertical rhythm. */
export function Section({
  className,
  rhythm = 'md',
  as: Component = 'section',
  ...props
}: React.ComponentPropsWithoutRef<'section'> & {
  rhythm?: 'sm' | 'md' | 'lg'
  as?: 'section' | 'div'
}) {
  const rhythms = { sm: 'section-sm', md: 'section', lg: 'section-lg' } as const
  return <Component className={cn(rhythms[rhythm], className)} {...props} />
}

/**
 * The standard page heading block: eyebrow, title, description, actions.
 * Actions wrap below the title on narrow viewports rather than being truncated.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumb,
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-col gap-3 pb-6', className)}>
      {breadcrumb}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          {eyebrow ? <p className="overline text-fg-subtle">{eyebrow}</p> : null}
          <h1 className="text-heading-xl text-fg">{title}</h1>
          {description ? (
            <p className="max-w-prose text-body-sm text-fg-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}

/** A responsive grid that never produces a horizontally scrolling page. */
export function Grid({
  className,
  min = '16rem',
  gap = 4,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & { min?: string; gap?: Gap }) {
  return (
    <div
      className={cn('grid', gaps[gap], className)}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}, 100%), 1fr))` }}
      {...props}
    />
  )
}
