/**
 * `FormData.get()` returns `string | File | null`. Coercing that with
 * `String()` would turn an unexpected file upload into the literal text
 * `[object Object]` and send it onward as though it were user input.
 *
 * These helpers narrow explicitly instead.
 */

export function readField(form: FormData, key: string): string {
  const value = form.get(key)
  return typeof value === 'string' ? value : ''
}

export function readOptionalField(form: FormData, key: string): string | undefined {
  const value = form.get(key)
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

export function readCheckbox(form: FormData, key: string): boolean {
  const value = form.get(key)
  return value === 'on' || value === 'true'
}
