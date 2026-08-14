import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge conditional class names, resolving conflicting Tailwind utilities so
 * that the last one wins. Used by every design-system component so a consumer's
 * `className` can reliably override a component default.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
