#!/usr/bin/env node
/**
 * End-to-end smoke test for the authentication surface, driven through a real
 * browser against a real database.
 *
 * Not part of the CI gate — `tests/e2e` is. This exists to verify a phase by
 * hand without clicking through it, and to leave screenshots behind for review.
 *
 *   node scripts/smoke-auth.mjs
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const outDir = resolve(process.cwd(), '.screenshots')
mkdirSync(outDir, { recursive: true })

const stamp = process.argv[2] ?? String(Date.now())
const admin = {
  fullName: 'Halimah Nuzul',
  email: `superadmin.${stamp}@example.test`,
  password: 'KataSandiUji2026',
}
const investor = {
  fullName: 'Rizal Pratama',
  email: `investor.${stamp}@example.test`,
  password: 'KataSandiUji2026',
}

const failures = []
const steps = []

function record(name, ok, detail = '') {
  steps.push({ name, ok, detail })
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ''}`)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch()

async function newPage(context) {
  const page = await context.newPage()
  page.on('pageerror', (error) => failures.push(`[pageerror] ${error.message}`))
  page.on('console', (message) => {
    const text = message.text()
    // 404s are asserted explicitly by status code (the setup page is *supposed*
    // to disappear), and a missing favicon is not a defect.
    const expected = text.includes('favicon') || text.includes('status of 404')
    if (message.type() === 'error' && !expected) {
      failures.push(`[console] ${text}`)
    }
  })
  return page
}

try {
  /* ---------------------------------------------------------------- setup */
  const setupContext = await browser.newContext()
  const setup = await newPage(setupContext)

  const setupResponse = await setup.goto(`${baseURL}/persiapan`, { waitUntil: 'networkidle' })
  const setupAvailable = setupResponse?.status() === 200

  if (setupAvailable) {
    await setup.fill('input[name="fullName"]', admin.fullName)
    await setup.fill('input[name="email"]', admin.email)
    await setup.fill('input[name="password"]', admin.password)
    await setup.fill('input[name="confirmPassword"]', admin.password)
    await setup.click('button[type="submit"]')
    await setup.waitForSelector('text=Super Admin berhasil dibuat', { timeout: 20_000 })
    record('first Super Admin created via /persiapan', true, admin.email)

    await setup.goto(`${baseURL}/persiapan`, { waitUntil: 'networkidle' })
    const reopened = await setup.goto(`${baseURL}/persiapan`)
    record(
      'setup page closes itself afterwards',
      reopened?.status() === 404,
      `status ${reopened?.status()}`,
    )
  } else {
    // The run creates its own Super Admin, so it needs a database with none.
    // Continuing from here would sign in with credentials that were never
    // created and report a misleading failure.
    console.error(
      `\n/persiapan returned ${setupResponse?.status()}, so an administrator already exists.\n` +
        'This smoke run needs a clean database. Run:\n\n  supabase db reset\n',
    )
    await setupContext.close()
    await browser.close()
    process.exit(1)
  }
  await setupContext.close()

  /* ------------------------------------------------- unauthenticated guard */
  const guestContext = await browser.newContext()
  const guest = await newPage(guestContext)

  await guest.goto(`${baseURL}/admin`, { waitUntil: 'networkidle' })
  record('anonymous /admin redirects to sign-in', guest.url().includes('/masuk'), guest.url())

  await guest.goto(`${baseURL}/investor`, { waitUntil: 'networkidle' })
  record('anonymous /investor redirects to sign-in', guest.url().includes('/masuk'), guest.url())

  const cspResponse = await guest.goto(`${baseURL}/masuk`, { waitUntil: 'networkidle' })
  const csp = cspResponse?.headers()['content-security-policy'] ?? ''
  record(
    'CSP header present with a nonce',
    csp.includes("'nonce-") && csp.includes("'strict-dynamic'"),
  )
  record('CSP forbids framing', csp.includes("frame-ancestors 'none'"))
  const headers = cspResponse?.headers() ?? {}
  record('X-Frame-Options DENY', headers['x-frame-options'] === 'DENY')
  record('nosniff', headers['x-content-type-options'] === 'nosniff')

  await guest.screenshot({ path: resolve(outDir, 'auth-sign-in.png'), fullPage: true })

  /* -------------------------------------------------- wrong credentials */
  await guest.fill('input[name="email"]', admin.email)
  await guest.fill('input[name="password"]', 'KataSandiSalah2026')
  await guest.click('button[type="submit"]')
  await guest.waitForSelector('text=Surel atau kata sandi tidak sesuai', { timeout: 20_000 })
  record('wrong password is rejected with a generic message', true)

  /* -------------------------------------------------- investor application */
  await guest.goto(`${baseURL}/daftar-investor`, { waitUntil: 'networkidle' })
  await guest.fill('input[name="fullName"]', investor.fullName)
  await guest.fill('input[name="email"]', investor.email)
  await guest.fill('input[name="password"]', investor.password)
  await guest.fill('input[name="legalName"]', investor.fullName)
  await guest.click('#acceptTerms')
  await guest.screenshot({ path: resolve(outDir, 'auth-application.png'), fullPage: true })
  await guest.click('button[type="submit"]')
  await guest.waitForSelector('text=Pengajuan diterima', { timeout: 30_000 })
  const reference = await guest.textContent('strong.font-mono')
  record('investor application accepted', Boolean(reference?.startsWith('NTI-')), reference ?? '')
  await guest.screenshot({ path: resolve(outDir, 'auth-application-done.png'), fullPage: true })
  await guestContext.close()

  /* ---------------------------------------------------------- admin sign-in */
  const adminContext = await browser.newContext()
  const adminPage = await newPage(adminContext)

  await adminPage.goto(`${baseURL}/masuk`, { waitUntil: 'networkidle' })
  await adminPage.fill('input[name="email"]', admin.email)
  await adminPage.fill('input[name="password"]', admin.password)
  await adminPage.click('button[type="submit"]')
  await adminPage.waitForURL('**/admin', { timeout: 120_000 })
  await adminPage.waitForLoadState('networkidle')
  record('admin signs in and lands on /admin', adminPage.url().endsWith('/admin'), adminPage.url())

  const dashboardText = (await adminPage.textContent('main')) ?? ''
  record('dashboard shows the pending application', dashboardText.includes('Menunggu peninjauan'))
  await adminPage.screenshot({ path: resolve(outDir, 'admin-dashboard.png'), fullPage: true })

  // An admin must not be able to wander into the investor surface.
  await adminPage.goto(`${baseURL}/investor`, { waitUntil: 'networkidle' })
  record(
    'admin visiting /investor is sent back to /admin',
    adminPage.url().endsWith('/admin'),
    adminPage.url(),
  )

  await adminPage.goto(`${baseURL}/admin`, { waitUntil: 'networkidle' })
  await adminPage.click('button[aria-label="Keluar"]')
  await adminPage.waitForURL('**/masuk**', { timeout: 20_000 })
  record('sign out returns to the sign-in page', adminPage.url().includes('/masuk'))

  await adminPage.goto(`${baseURL}/admin`, { waitUntil: 'networkidle' })
  record('session is gone after sign out', adminPage.url().includes('/masuk'), adminPage.url())
  await adminContext.close()
} catch (error) {
  record('smoke run completed', false, error instanceof Error ? error.message : String(error))
} finally {
  await browser.close()
}

console.log(`\n${steps.filter((step) => step.ok).length}/${steps.length} checks passed`)
if (failures.length > 0) {
  console.error('\nFailures:')
  for (const failure of failures) console.error(`  • ${failure}`)
  process.exitCode = 1
}
