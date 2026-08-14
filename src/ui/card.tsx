import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const cardVariants = cva('rounded-lg', {
  variants: {
    variant: {
      /** The default: a surface panel with a hairline border. */
      default: 'border border-border bg-surface',
      /** Lifted off the canvas — used for overlays and focal panels. */
      raised: 'border border-border bg-elevated shadow-raised',
      /** Recessed — used for nested detail inside another card. */
      sunken: 'border border-border-subtle bg-sunken',
      /** No chrome. For grouping without visual weight. */
      plain: 'bg-transparent',
    },
    padding: {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-5 sm:p-6',
      lg: 'p-6 sm:p-8',
    },
  },
  defaultVariants: { variant: 'default', padding: 'md' },
})

export type CardProps = React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof cardVariants>

export function Card({ className, variant, padding, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant, padding }), className)} {...props} />
}

export function CardHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 pb-4', className)} {...props} />
}

export function CardTitle({
  className,
  as: Component = 'h3',
  ...props
}: React.ComponentPropsWithoutRef<'h3'> & { as?: 'h2' | 'h3' | 'h4' }) {
  return <Component className={cn('text-heading-md text-fg', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
  return <p className={cn('text-body-sm text-fg-muted', className)} {...props} />
}

export function CardBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('text-body-sm text-fg', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-3 pt-5 [&:not(:first-child)]:mt-1', className)}
      {...props}
    />
  )
}

export { cardVariants }
