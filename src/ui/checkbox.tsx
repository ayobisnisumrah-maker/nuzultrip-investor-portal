'use client'

import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/cn'

const focusRing =
  'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export function Checkbox({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer size-5 shrink-0 rounded-xs border border-border-strong bg-surface',
        'transition-colors duration-(--d-fast)',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-on-primary',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-on-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        focusRing,
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-items-center text-current">
        {props.checked === 'indeterminate' ? (
          <Minus aria-hidden="true" className="size-3.5" strokeWidth={3} />
        ) : (
          <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export const RadioGroup = RadioGroupPrimitive.Root

export function Radio({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'size-5 shrink-0 rounded-full border border-border-strong bg-surface',
        'transition-colors duration-(--d-fast)',
        'data-[state=checked]:border-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        focusRing,
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="grid size-full place-items-center">
        <span className="size-2.5 rounded-full bg-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export function Switch({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent',
        'bg-border-strong transition-colors duration-(--d-fast)',
        'data-[state=checked]:bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        focusRing,
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-surface shadow-raised',
          'translate-x-0.5 transition-transform duration-(--d-fast) ease-(--ease-out-quart)',
          'data-[state=checked]:translate-x-[1.375rem]',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

/** A checkbox or radio with its label, laid out and hit-targeted correctly. */
export function ChoiceRow({
  control,
  label,
  hint,
  htmlFor,
  className,
}: {
  control: React.ReactNode
  label: React.ReactNode
  hint?: React.ReactNode
  htmlFor: string
  className?: string
}) {
  return (
    <div className={cn('flex items-start gap-3 py-1.5', className)}>
      <div className="mt-0.5">{control}</div>
      <div className="flex flex-col gap-0.5">
        <label htmlFor={htmlFor} className="cursor-pointer text-body-sm font-medium text-fg">
          {label}
        </label>
        {hint ? <span className="text-caption text-fg-subtle">{hint}</span> : null}
      </div>
    </div>
  )
}
