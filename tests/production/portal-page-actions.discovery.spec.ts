import { test, expect } from '@playwright/test'

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD

test.describe('Portal Page Action Discovery', () => {
  test.skip(
    !adminEmail || !adminPassword,
    'E2E_ADMIN_EMAIL dan E2E_ADMIN_PASSWORD wajib tersedia.',
  )

  test('discover actions on real draft portal page', async ({ page }) => {
    test.setTimeout(180_000)

    page.setDefaultTimeout(30_000)
    page.setDefaultNavigationTimeout(90_000)

    // LOGIN
    await page.goto('/masuk', {
      waitUntil: 'commit',
      timeout: 90_000,
    })

    await expect(
      page.locator('input[name="email"]'),
    ).toBeVisible({ timeout: 60_000 })

    await page.locator('input[name="email"]').fill(adminEmail!)
    await page.locator('input[name="password"]').fill(adminPassword!)

    await page.locator('button[type="submit"]').click()

    await page.waitForURL(/\/admin(?:\/|$)/, {
      timeout: 60_000,
      waitUntil: 'commit',
    })

    console.log('LOGIN=PASS')

    // OPEN PORTAL PAGE LIST
    await page.goto('/admin/portal/pages', {
      waitUntil: 'commit',
      timeout: 90_000,
    })

    await page.waitForTimeout(2_000)

    console.log('LIST_URL=' + page.url())

    // Cari halaman E2E terbaru.
    // Production smoke saat ini membuat halaman dengan prefix:
    // "E2E Public Smoke ..."
    const e2eText = page.getByText(/E2E Public Smoke/i).last()

    await expect(e2eText).toBeVisible({
      timeout: 60_000,
    })

    const title = (await e2eText.textContent())?.trim() || ''

    console.log('E2E_PAGE_FOUND=' + title)

    // Cari link detail halaman.
    // Hindari XPath ancestor karena selector kompleks dapat bermasalah
    // pada Playwright selector engine.
    const detailLinks = page.locator(
      'a[href^="/admin/portal/pages/"], a[href*="/admin/portal/pages/"]',
    )

    const matchingLinks = detailLinks.filter({
      hasText: /E2E Public Smoke/i,
    })

    let href: string | null = null

    const matchingCount = await matchingLinks.count()

    if (matchingCount > 0) {
      href = await matchingLinks
        .nth(matchingCount - 1)
        .getAttribute('href')
    }

    // Fallback:
    // cari container yang memiliki title E2E Public Smoke,
    // kemudian ambil semua link detail dari container tersebut.
    if (!href) {
      const containers = page
        .locator('tr, article, li, div')
        .filter({
          hasText: /E2E Public Smoke/i,
        })

      const containerCount = await containers.count()

      for (let i = containerCount - 1; i >= 0; i--) {
        const candidate = containers.nth(i)
        const candidateLink = candidate
          .locator('a[href*="/admin/portal/pages/"]')
          .last()

        if (await candidateLink.count()) {
          href = await candidateLink.getAttribute('href')

          if (href) {
            break
          }
        }
      }
    }

    if (!href) {
      // Print semua link portal untuk discovery
      const links = await page
        .locator('a[href*="/admin/portal/pages/"]')
        .evaluateAll((elements) =>
          elements.map((el) => ({
            text: (el.textContent || '').trim(),
            href: (el as HTMLAnchorElement).href,
          })),
        )

      console.log(
        'PORTAL_LINKS=' +
          JSON.stringify(links, null, 2),
      )

      throw new Error(
        'Tidak menemukan href detail untuk halaman E2E Public Smoke.',
      )
    }

    console.log('DETAIL_HREF=' + href)

    // Direct navigation lebih stabil daripada click + waitForURL
    await page.goto(href, {
      waitUntil: 'commit',
      timeout: 90_000,
    })

    await page.waitForTimeout(2_000)

    console.log('DETAIL_URL=' + page.url())

    await expect(
      page.getByRole('heading', { name: title }),
    ).toBeVisible({
      timeout: 60_000,
    })

    // DISCOVERY SEMUA BUTTON
    const buttons = await page
      .getByRole('button')
      .evaluateAll((elements) =>
        elements
          .map((el) => ({
            text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
            disabled: (el as HTMLButtonElement).disabled,
            ariaLabel: el.getAttribute('aria-label'),
          }))
          .filter((item) => item.text || item.ariaLabel),
      )

    console.log(
      'BUTTONS=' +
        JSON.stringify(buttons, null, 2),
    )

    // DISCOVERY LINK
    const links = await page
      .locator('a')
      .evaluateAll((elements) =>
        elements
          .map((el) => ({
            text: (el.textContent || '').replace(/\s+/g, ' ').trim(),
            href: (el as HTMLAnchorElement).href,
          }))
          .filter((item) => item.text),
      )

    console.log(
      'LINKS=' +
        JSON.stringify(links, null, 2),
    )

    // STATUS BADGE
    const statusCandidates = await page
      .locator('span, strong, p, div')
      .evaluateAll((elements) =>
        elements
          .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
          .filter((text) =>
            /^(Draf|Draft|Review|Ditinjau|Disetujui|Approved|Published|Dipublikasikan|Archived|Diarsipkan)$/i.test(
              text,
            ),
          )
          .slice(0, 30),
      )

    console.log(
      'STATUS_CANDIDATES=' +
        JSON.stringify(statusCandidates),
    )

    console.log('RESULT=ACTION_DISCOVERY_PASS')
  })
})
