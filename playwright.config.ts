import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// The suite provisions its own accounts through the service role, so the test
// process needs the same configuration the application has. Next loads
// `.env.local` for the app; nothing loads it for Playwright.
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const PORT = Number(process.env.PORT ?? 3000)
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`

/**
 * Cross-browser matrix is a hard requirement (docs/ARCHITECTURE.md §13):
 * Chrome, Edge, Firefox and Safari, desktop and mobile. The realtime
 * propagation suite runs on all three engines.
 */
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  /**
   * One worker, always.
   *
   * These tests assert *global* database state — "the pending-review count went
   * up by one", "this browser received no frames about that investor". Two
   * workers sharing one database make those assertions race, and a flaky
   * security test is worse than no test because it ends up muted. Wall-clock is
   * the price; determinism is what is being bought.
   */
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  // Realtime assertions wait on a real websocket round trip on top of a real
  // sign-in, and the dev server compiles routes on first hit. 30s is a
  // stopwatch, not a test.
  timeout: 120_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],

  webServer: {
    /**
     * Always the production build, never `next dev`.
     *
     * In development Next compiles a route on first request, which added tens
     * of seconds to whichever test happened to touch a route first and made
     * timeouts a lottery — WebKit failed and passed the same test on
     * consecutive runs. It is also simply the wrong thing to test: the
     * production bundle is what ships.
     *
     * `pnpm test:e2e` builds first.
     */
    command: 'pnpm start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
