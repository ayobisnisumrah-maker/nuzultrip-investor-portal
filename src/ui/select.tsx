'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useFieldControlProps } from './field'

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  const fieldProps = useFieldControlProps()
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'border-border-strong bg-surface flex h-11 w-full items-center justify-between gap-2 rounded-md border px-3',
        'text-body-sm text-fg pointer-fine:h-10',
        'transition-[color,box-shadow,border-color] duration-(--d-fast)',
        'focus-visible:border-ring focus-visible:outline-ring outline-none focus-visible:outline-2',
        'aria-invalid:border-danger',
        'disabled:bg-sunken disabled:text-fg-subtle disabled:cursor-not-allowed',
        'data-[placeholder]:text-fg-subtle',
        className,
      )}
      {...fieldProps}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown aria-hidden="true" className="text-fg-subtle size-4 shrink-0" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn(
          'relative max-h-(--radix-select-content-available-height) min-w-32 overflow-hidden',
          'border-border bg-elevated text-fg shadow-overlay rounded-md border',
          'z-popover',
          position === 'popper' && 'w-full min-w-(--radix-select-trigger-width)',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="text-fg-subtle grid h-6 place-items-center">
          <ChevronUp aria-hidden="true" className="size-4" />
        </SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="text-fg-subtle grid h-6 place-items-center">
          <ChevronDown aria-hidden="true" className="size-4" />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'text-body-sm relative flex cursor-pointer items-center gap-2 rounded-sm py-2 pr-8 pl-3',
        'outline-none select-none',
        'focus:bg-primary-subtle focus:text-fg',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-2 grid place-items-center">
        <SelectPrimitive.ItemIndicator>
          <Check aria-hidden="true" className="text-primary size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  )
}

export function SelectLabel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn('text-overline text-fg-subtle px-3 py-1.5 uppercase', className)}
      {...props}
    />
  )
}

export function SelectSeparator({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator className={cn('bg-border -mx-1 my-1 h-px', className)} {...props} />
  )
}
