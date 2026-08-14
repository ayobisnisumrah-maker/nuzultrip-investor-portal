import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { cn } from '@/lib/cn'

/** Small, self-contained primitives that do not warrant their own module. */

/* ----------------------------------------------------------------- Separator */

export function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      decorative={decorative}
      className={cn(
        'bg-border shrink-0',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ Skeleton */

export function Skeleton({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn('bg-sunken motion-safe:animate-pulse-subtle rounded-sm', className)}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------- Avatar */

/**
 * Initials are derived from the name rather than requiring a separate field, and
 * the image is optional — most accounts will not have one.
 */
export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  const sizes = {
    sm: 'size-7 text-[0.6875rem]',
    md: 'size-9 text-caption',
    lg: 'size-12 text-body-sm',
  } as const

  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-full',
        'border-border bg-primary-subtle text-primary border font-medium select-none',
        sizes[size],
        className,
      )}
    >
      {src ? (
        /* Avatars are served as pre-sized, short-lived signed URLs. next/image
           would need each storage host allow-listed per environment and cannot
           usefully cache a URL that expires in 60 seconds. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials || '—'}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  )
}

/* ----------------------------------------------------------------------- Kbd */

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'border-border inline-flex h-5 min-w-5 items-center justify-center rounded-xs border',
        'bg-sunken text-fg-muted px-1 font-mono text-[0.6875rem]',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

/* ------------------------------------------------------------------ Overline */

/** The system's signature small element: a section eyebrow. */
export function Overline({
  children,
  className,
  tone = 'subtle',
}: {
  children: React.ReactNode
  className?: string
  tone?: 'subtle' | 'accent'
}) {
  return (
    <p className={cn('overline', tone === 'accent' ? 'text-accent' : 'text-fg-subtle', className)}>
      {children}
    </p>
  )
}
