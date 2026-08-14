'use client'

import { createContext, use, useId } from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * `Field` wires a control to its label, hint and error message so that every
 * form control in the application is described correctly to assistive
 * technology without each call site having to remember `aria-describedby`.
 *
 * Errors are never communicated by colour alone: they carry an icon and text
 * (docs/DESIGN-SYSTEM.md §9).
 */

type FieldContextValue = {
  controlId: string
  hintId: string
  errorId: string
  hasError: boolean
  hasHint: boolean
  required: boolean
  disabled: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

export function useField(): FieldContextValue | null {
  return use(FieldContext)
}

/** Props a control should spread onto itself to be correctly described. */
export function useFieldControlProps(): {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: true
  'aria-required'?: true
  disabled?: boolean
} {
  const field = use(FieldContext)
  if (!field) return {}
  const describedBy = [field.hasHint ? field.hintId : null, field.hasError ? field.errorId : null]
    .filter(Boolean)
    .join(' ')
  return {
    id: field.controlId,
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(field.hasError ? { 'aria-invalid': true as const } : {}),
    ...(field.required ? { 'aria-required': true as const } : {}),
    ...(field.disabled ? { disabled: true } : {}),
  }
}

export function Field({
  children,
  className,
  label,
  hint,
  error,
  required = false,
  disabled = false,
  id,
}: {
  children: React.ReactNode
  className?: string
  label: React.ReactNode
  hint?: React.ReactNode
  /** A string or `false`/`undefined`. Presence marks the field invalid. */
  error?: React.ReactNode
  required?: boolean
  disabled?: boolean
  id?: string
}) {
  const generated = useId()
  const controlId = id ?? `field-${generated}`
  const value: FieldContextValue = {
    controlId,
    hintId: `${controlId}-hint`,
    errorId: `${controlId}-error`,
    hasError: Boolean(error),
    hasHint: Boolean(hint),
    required,
    disabled,
  }

  return (
    <FieldContext value={value}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        <FieldLabel>{label}</FieldLabel>
        {children}
        {hint && !error ? (
          <p id={value.hintId} className="text-caption text-fg-subtle">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={value.errorId} className="text-caption text-danger-fg flex items-start gap-1.5">
            <AlertCircle aria-hidden="true" className="mt-px size-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    </FieldContext>
  )
}

export function FieldLabel({
  children,
  className,
  htmlFor,
}: {
  children: React.ReactNode
  className?: string
  htmlFor?: string
}) {
  const field = use(FieldContext)
  return (
    <LabelPrimitive.Root
      htmlFor={htmlFor ?? field?.controlId}
      className={cn(
        'text-body-sm text-fg font-medium',
        field?.disabled && 'text-fg-subtle',
        className,
      )}
    >
      {children}
      {field?.required ? (
        <>
          <span aria-hidden="true" className="text-danger-fg ml-0.5">
            *
          </span>
          <span className="sr-only"> (wajib diisi)</span>
        </>
      ) : null}
    </LabelPrimitive.Root>
  )
}

/** Standalone label for controls that are not inside a `Field`. */
export const Label = LabelPrimitive.Root
