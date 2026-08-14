'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './button'

/**
 * Dialog and Drawer share Radix's dialog primitive: both are modal, both trap
 * focus, both restore focus on close, both close on Escape. They differ only in
 * how they enter the viewport.
 */

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

function Overlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'z-overlay bg-overlay fixed inset-0 backdrop-blur-[2px]',
        'data-[state=open]:animate-fade-in',
        className,
      )}
      {...props}
    />
  )
}

export function DialogContent({
  className,
  children,
  size = 'md',
  showClose = true,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  size?: 'sm' | 'md' | 'lg'
  showClose?: boolean
}) {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' } as const
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          'z-modal border-border bg-elevated shadow-modal fixed flex flex-col gap-4 border',
          // Mobile: a bottom sheet, which is where thumbs are.
          'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl p-5',
          // Larger viewports: a centred dialog.
          'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2',
          'sm:rounded-lg sm:p-6',
          'motion-safe:data-[state=open]:animate-rise',
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tutup"
              className="absolute top-3 right-3"
            >
              <X aria-hidden="true" />
            </Button>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 pr-10', className)} {...props} />
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('text-heading-md text-fg', className)} {...props} />
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-body-sm text-fg-muted', className)}
      {...props}
    />
  )
}

export function DialogFooter({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'mt-2 flex flex-col-reverse gap-2 pb-[env(safe-area-inset-bottom)] sm:flex-row sm:justify-end sm:pb-0',
        className,
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Drawer — same semantics, edge-anchored                                     */
/* -------------------------------------------------------------------------- */

export const Drawer = DialogPrimitive.Root
export const DrawerTrigger = DialogPrimitive.Trigger
export const DrawerClose = DialogPrimitive.Close

export function DrawerContent({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  side?: 'left' | 'right'
}) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          'z-drawer fixed inset-y-0 flex w-[min(22rem,88vw)] flex-col gap-4',
          'border-border bg-surface shadow-modal p-5',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export const DrawerTitle = DialogTitle
export const DrawerDescription = DialogDescription
