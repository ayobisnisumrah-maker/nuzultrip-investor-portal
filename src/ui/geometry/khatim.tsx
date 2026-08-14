import { cn } from '@/lib/cn'

/**
 * The khatim — an eight-point star formed by two overlapping squares, and the
 * one geometric motif the system uses.
 *
 * Islamic identity here is expressed through structure: proportion, tessellation
 * and radial symmetry. Not through pasted-on iconography. See
 * docs/DESIGN-SYSTEM.md §7 for where this may and may not be used.
 *
 * The geometry is generated rather than drawn so it can be tessellated, masked
 * and scaled without shipping bitmaps.
 */

/**
 * For two squares overlapping at 45°, the inner vertices sit at
 * cos(45°) / cos(22.5°) of the outer radius. Any other ratio is a decorative
 * star, not a khatim.
 */
const INNER_RATIO = Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8)

/** Path for an eight-point star centred at (cx, cy). */
export function khatimPath(cx: number, cy: number, radius: number, rotation = 0): string {
  const points: string[] = []
  for (let i = 0; i < 16; i += 1) {
    const isOuter = i % 2 === 0
    const r = isOuter ? radius : radius * INNER_RATIO
    const angle = rotation + (i * Math.PI) / 8
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(3)} ${y.toFixed(3)}`)
  }
  return `${points.join(' ')} Z`
}

/* -------------------------------------------------------------------------- */

type StarProps = {
  className?: string
  /** Stroke-only is the default; filled is reserved for small markers. */
  variant?: 'outline' | 'filled'
  strokeWidth?: number
} & Omit<React.SVGProps<SVGSVGElement>, 'children' | 'viewBox'>

export function KhatimStar({
  className,
  variant = 'outline',
  strokeWidth = 1.25,
  ...props
}: StarProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('size-4', className)}
      {...props}
    >
      <path
        d={khatimPath(12, 12, 11, -Math.PI / 2)}
        fill={variant === 'filled' ? 'currentColor' : 'none'}
        stroke={variant === 'filled' ? 'none' : 'currentColor'}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * The system's loading indicator: the star rotating on its own symmetry, one
 * 45° step at a time, rather than a generic circular spinner.
 */
export function KhatimSpinner({
  className,
  label = 'Memuat',
}: {
  className?: string
  /** Announced to assistive technology. */
  label?: string
}) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center', className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="motion-safe:animate-khatim size-5"
      >
        <path
          d={khatimPath(12, 12, 10, -Math.PI / 2)}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          opacity={0.35}
        />
        <path
          d={khatimPath(12, 12, 10, -Math.PI / 2)}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeDasharray="14 60"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}

/* -------------------------------------------------------------------------- */

/**
 * Pattern ids are derived from the pattern's own parameters rather than a
 * counter. Two bands with identical parameters share an id, which is harmless
 * because they define identical geometry — and it keeps server and client
 * markup identical, so there is nothing to mismatch on hydration.
 */
const patternId = (kind: string, cell: number, opacity: number) =>
  `khatim-${kind}-${cell}-${Math.round(opacity * 1000)}`

/**
 * A hairline tessellated band, used to mark the boundary between portal
 * sections. Strokes only, at low opacity — it must never compete with content.
 */
export function TessellationBand({
  className,
  height = 48,
  opacity = 0.08,
}: {
  className?: string
  height?: number
  opacity?: number
}) {
  const cell = 48
  const id = patternId('band', cell, opacity)
  return (
    <div className={cn('pointer-events-none w-full select-none', className)} aria-hidden="true">
      <svg width="100%" height={height} className="text-fg block" role="presentation">
        <defs>
          <pattern id={id} width={cell} height={cell} patternUnits="userSpaceOnUse">
            <path
              d={khatimPath(cell / 2, cell / 2, cell / 2, -Math.PI / 2)}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
            />
            <path
              d={khatimPath(0, cell / 2, cell / 2, -Math.PI / 2)}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
            />
            <path
              d={khatimPath(cell, cell / 2, cell / 2, -Math.PI / 2)}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
            />
          </pattern>
        </defs>
        <rect width="100%" height={height} fill={`url(#${id})`} opacity={opacity} />
      </svg>
    </div>
  )
}

/**
 * A very low-opacity tessellation for deep surfaces — depth without imagery.
 * Opacity is capped so it can never be turned up into decoration.
 */
export function GeometricField({
  className,
  opacity = 0.035,
}: {
  className?: string
  opacity?: number
}) {
  const cell = 96
  const safeOpacity = Math.min(Math.max(opacity, 0), 0.06)
  const id = patternId('field', cell, safeOpacity)
  return (
    <svg
      className={cn('pointer-events-none absolute inset-0 size-full select-none', className)}
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <pattern id={id} width={cell} height={cell} patternUnits="userSpaceOnUse">
          <path
            d={khatimPath(cell / 2, cell / 2, cell / 2 - 2, -Math.PI / 2)}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.75}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity={safeOpacity} />
    </svg>
  )
}
