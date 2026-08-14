'use client'

import { cn } from '@/lib/cn'
import { useFieldControlProps } from './field'

const controlBase = [
  'w-full rounded-md border bg-surface text-fg',
  'border-border-strong',
  'transition-[color,box-shadow,border-color] duration-(--d-fast) ease-(--ease-out-quart)',
  'outline-none focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring',
  'aria-invalid:border-danger aria-invalid:focus-visible:outline-danger',
  'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-fg-subtle',
]

export function Input({
  className,
  type = 'text',
  ...props
}: React.ComponentPropsWithoutRef<'input'>) {
  const fieldProps = useFieldControlProps()
  return (
    <input
      type={type}
      className={cn(
        controlBase,
        'h-11 px-3 text-body-sm pointer-fine:h-10',
        // Financial and reference inputs align on the decimal.
        (type === 'number' || props.inputMode === 'numeric' || props.inputMode === 'decimal') &&
          'font-mono tabular',
        className,
      )}
      {...fieldProps}
      {...props}
    />
  )
}

export function Textarea({
  className,
  rows = 4,
  ...props
}: React.ComponentPropsWithoutRef<'textarea'>) {
  const fieldProps = useFieldControlProps()
  return (
    <textarea
      rows={rows}
      className={cn(controlBase, 'min-h-24 resize-y px-3 py-2.5 text-body-sm', className)}
      {...fieldProps}
      {...props}
    />
  )
}

/**
 * A search input with the semantics screen readers expect. Kept separate from
 * `Input` so the role and the clear affordance are consistent everywhere.
 */
export function SearchInput({
  className,
  label = 'Cari',
  ...props
}: React.ComponentPropsWithoutRef<'input'> & { label?: string }) {
  return (
    <input
      type="search"
      role="searchbox"
      aria-label={props['aria-label'] ?? label}
      className={cn(controlBase, 'h-11 px-3 text-body-sm pointer-fine:h-10', className)}
      {...props}
    />
  )
}

export { controlBase }
