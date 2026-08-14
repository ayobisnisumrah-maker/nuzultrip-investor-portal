import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Vite resolves the `@/*` alias from tsconfig.json natively.
  resolve: { tsconfigPaths: true },
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
