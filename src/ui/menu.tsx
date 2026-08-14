'use client'

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------ Dropdown menu */

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group

const menuSurface = [
  'min-w-44 overflow-hidden rounded-md border border-border bg-elevated p-1 shadow-overlay',
  'z-popover',
]

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(menuSurface, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

const menuItem = [
  'relative flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 text-body-sm',
  'outline-none select-none',
  'focus:bg-primary-subtle focus:text-fg',
  'data-disabled:pointer-events-none data-disabled:opacity-50',
  "[&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-subtle",
]

export function DropdownMenuItem({
  className,
  destructive = false,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { destructive?: boolean }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        menuItem,
        destructive && 'text-danger-fg focus:bg-danger-subtle [&_svg]:text-danger-fg',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem className={cn(menuItem, 'pl-8', className)} {...props}>
      <span className="absolute left-2.5 grid place-items-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check aria-hidden="true" className="size-4 text-primary" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn('px-2.5 py-1.5 text-overline text-fg-subtle uppercase', className)}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
  )
}

/* ------------------------------------------------------------------- Tabs */

export const Tabs = TabsPrimitive.Root

export function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex w-full gap-1 overflow-x-auto border-b border-border',
        // Horizontal scroll on small viewports beats wrapping or truncating.
        '-mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'relative shrink-0 px-3 py-2.5 text-body-sm font-medium whitespace-nowrap',
        'text-fg-muted transition-colors duration-(--d-fast)',
        'outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring',
        'hover:text-fg',
        'data-[state=active]:text-fg',
        // The active indicator is gold: it marks where you are, which is one of
        // the few things the accent is for.
        'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full',
        'data-[state=active]:after:bg-accent-solid',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('pt-5 outline-none focus-visible:outline-2 focus-visible:outline-ring', className)}
      {...props}
    />
  )
}

/* ---------------------------------------------------------------- Tooltip */

export const TooltipProvider = TooltipPrimitive.Provider
export const Tooltip = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger

export function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-tooltip max-w-64 rounded-sm bg-inverse px-2.5 py-1.5 text-caption text-fg-inverse shadow-overlay',
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}
