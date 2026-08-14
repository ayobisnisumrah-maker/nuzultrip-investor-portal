import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// Deterministic defaults for anything that reads public config during a unit
// test. Real values are never needed here — unit tests never reach Supabase.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key-not-a-real-credential'
process.env.NEXT_PUBLIC_SITE_URL ??= 'http://localhost:3000'
process.env.NEXT_PUBLIC_APP_ENV ??= 'development'

// jsdom does not implement matchMedia; several design-system components read it
// for theme and reduced-motion preferences. Files that opt into the `node`
// environment have no `window` at all, so guard before touching it.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
