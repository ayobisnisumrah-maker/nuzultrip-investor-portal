import { describe, expect, it } from 'vitest'
import { getClientEnv, getServerEnv, isDevelopment, isProduction } from './env'

describe('clientEnv', () => {
  it('parses the public configuration provided by the test setup', () => {
    const env = getClientEnv()
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('http://127.0.0.1:54321')
    expect(env.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000')
    expect(env.NEXT_PUBLIC_APP_ENV).toBe('development')
  })

  it('exposes environment predicates', () => {
    expect(isDevelopment()).toBe(true)
    expect(isProduction()).toBe(false)
  })

  it('caches the parsed result', () => {
    expect(getClientEnv()).toBe(getClientEnv())
  })
})

describe('serverEnv', () => {
  it('refuses to resolve in a browser-like environment', () => {
    // This suite runs under jsdom, so `window` is defined. Reaching server
    // configuration from browser code is a security bug, not a runtime warning.
    expect(() => getServerEnv()).toThrow(/called in the browser/i)
  })
})
