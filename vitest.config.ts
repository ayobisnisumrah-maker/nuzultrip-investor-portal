import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Vite resolves the `@/*` alias from tsconfig.json natively.
    tsconfigPaths: true,
    alias: {
      // `server-only` throws when resolved through a client condition, which is
      // correct in a bundle and wrong in a test runner. The real import stays
      // in the modules; only the test resolution is redirected.
      'server-only': fileURLToPath(new URL('./src/test/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/integration/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', '.next/**', 'tests/e2e/**'],
    // jsdom for component tests; node for domain logic. Chosen per-file with
    // an `// @vitest-environment node` pragma where the default is wrong.
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/core/**', 'src/lib/**', 'src/server/**'],
      exclude: ['**/*.test.*', '**/__tests__/**', 'src/types/**'],
    },
  },
})
