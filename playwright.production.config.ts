import { defineConfig, devices } from '@playwright/test'

const baseURL =
  process.env.E2E_BASE_URL ??
  'https://nuzultrip-investor-portal.vercel.app'

export default defineConfig({
  testDir: './tests/production',

  // Production test harus deterministik dan tidak paralel.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,

  expect: {
    timeout: 20_000,
  },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-production', open: 'never' }],
  ],

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Mulai dari Chromium untuk smoke test production.
  // Cross-browser matrix dilakukan setelah lifecycle utama terbukti.
  projects: [
    {
      name: 'production-chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})
