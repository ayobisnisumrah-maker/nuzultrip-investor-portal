import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, '', 'b')).toBe('a b')
  })

  it('supports conditional objects and arrays', () => {
    expect(cn(['a', { b: true, c: false }])).toBe('a b')
  })

  it('resolves conflicting Tailwind utilities in favour of the last one', () => {
    // This is the behaviour every component relies on for `className` overrides.
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    expect(cn('text-neutral-500', 'text-neutral-900')).toBe('text-neutral-900')
  })
})
