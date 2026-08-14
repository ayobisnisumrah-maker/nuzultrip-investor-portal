#!/usr/bin/env node
/**
 * Capture a page in both themes and at several viewports.
 *
 * Used during development to review the design system and, later, to eyeball
 * responsive behaviour. Not part of the CI gate — the Playwright suite in
 * `tests/e2e` is.
 *
 *   node scripts/screenshot.mjs /design-system
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const path = process.argv[2] ?? '/'
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const outDir = resolve(process.cwd(), '.screenshots')
mkdirSync(outDir, { recursive: true })

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 },
]

const browser = await chromium.launch()
const slug = path.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home'
const failures = []

for (const theme of ['light', 'dark']) {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: theme === 'dark' ? 'dark' : 'light',
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => failures.push(`[${theme}/${viewport.name}] ${error.message}`))
    page.on('console', (message) => {
      if (message.type() === 'error') failures.push(`[${theme}/${viewport.name}] ${message.text()}`)
    })

    const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' })
    if (!response?.ok()) failures.push(`[${theme}/${viewport.name}] HTTP ${response?.status()}`)

    const file = resolve(outDir, `${slug}-${theme}-${viewport.name}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`wrote ${file}`)
    await context.close()
  }
}

await browser.close()

if (failures.length > 0) {
  console.error('\nPage errors detected:')
  for (const failure of failures) console.error(`  • ${failure}`)
  process.exitCode = 1
}
