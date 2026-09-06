import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import {
  clearRateLimits,
  createAdminAccount,
  createInvestorAccount,
  deleteAccounts,
  serviceClient,
  signIn,
  type TestAccount,
} from './helpers/accounts'

test.describe.configure({ mode: 'serial' })

const created: string[] = []

test.beforeEach(async () => {
  await clearRateLimits()
})

test.afterAll(async () => {
  await deleteAccounts(created)
  created.length = 0
})

type ChatFixture = {
  admin: TestAccount
  investor: TestAccount & { referenceCode: string }
  threadId: string
}

async function createChatFixture(): Promise<ChatFixture> {
  const admin = await createAdminAccount({ roleKey: 'super_admin', fullName: 'Admin Chat E2E' })
  const investor = await createInvestorAccount('active')
  created.push(admin.userId, investor.userId)

  const supabase = serviceClient()
  const subject = `Percakapan E2E ${crypto.randomUUID().slice(0, 8)}`

  const { data: thread, error: threadError } = await supabase
    .from('message_threads')
    .insert({
      subject,
      thread_kind: 'investor_admin',
      investor_id: investor.userId,
      created_by: admin.userId,
      is_closed: false,
    })
    .select('id')
    .single()

  if (threadError || !thread) {
    throw new Error(`Failed to create chat thread: ${threadError?.message ?? 'no row'}`)
  }

  const { error: participantsError } = await supabase.from('thread_participants').insert([
    { thread_id: thread.id, user_id: investor.userId, role: 'investor' },
    { thread_id: thread.id, user_id: admin.userId, role: 'admin' },
  ])
  if (participantsError) {
    throw new Error(`Failed to create chat participants: ${participantsError.message}`)
  }

  const { error: messageError } = await supabase.from('messages').insert({
    thread_id: thread.id,
    sender_id: admin.userId,
    sender_label: 'Admin Chat E2E',
    body_text: 'Assalamu’alaikum, percakapan pengujian dimulai.',
    body_rich: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Assalamu’alaikum, percakapan pengujian dimulai.' }],
        },
      ],
    },
    is_system: false,
  })
  if (messageError) {
    throw new Error(`Failed to create initial chat message: ${messageError.message}`)
  }

  return { admin, investor, threadId: thread.id as string }
}

async function openAdminChat(
  browser: Browser,
  fixture: ChatFixture,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await signIn(page, fixture.admin, '/admin')
  await page.goto(`/admin/messages?thread=${fixture.threadId}`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Percakapan pribadi')).toBeVisible()
  return { context, page }
}

async function openInvestorChat(
  browser: Browser,
  fixture: ChatFixture,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await signIn(page, fixture.investor, '/investor')
  await page.goto(`/investor/messages/${fixture.threadId}`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('Percakapan pribadi')).toBeVisible()
  return { context, page }
}

async function composer(page: Page) {
  const field = page.getByPlaceholder('Tulis pesan…')
  await expect(field).toBeVisible()
  return field
}

test.describe('admin ↔ investor messaging', () => {
  test('delivers messages both ways without reload, including emoji', async ({ browser }) => {
    const fixture = await createChatFixture()
    const admin = await openAdminChat(browser, fixture)
    const investor = await openInvestorChat(browser, fixture)

    await expect(admin.page.getByText('Real-time aktif')).toBeVisible({ timeout: 30_000 })
    await expect(investor.page.getByText('Real-time aktif')).toBeVisible({ timeout: 30_000 })

    const investorComposer = await composer(investor.page)
    await investorComposer.fill('Wa’alaikumussalam. Baik, terima kasih 🙏')
    await investorComposer.press('Enter')

    await expect(admin.page.getByText('Wa’alaikumussalam. Baik, terima kasih 🙏')).toBeVisible({
      timeout: 30_000,
    })

    const adminComposer = await composer(admin.page)
    await adminComposer.fill('Sama-sama. Kami siap membantu 😊')
    await adminComposer.press('Enter')

    await expect(investor.page.getByText('Sama-sama. Kami siap membantu 😊')).toBeVisible({
      timeout: 30_000,
    })

    await investor.context.close()
    await admin.context.close()
  })

  test('admin template fills the composer and stays editable before send', async ({ browser }) => {
    const fixture = await createChatFixture()
    const admin = await openAdminChat(browser, fixture)

    const templateSelect = admin.page.locator(`select[id="template-${fixture.threadId}"]`)
    await expect(templateSelect).toBeVisible()
    await templateSelect.selectOption('follow-up')

    const field = await composer(admin.page)
    await expect(field).toHaveValue(/menindaklanjuti percakapan sebelumnya/i)

    await field.fill(`${await field.inputValue()} Terima kasih 🙏`)
    await admin.page.getByRole('button', { name: 'Kirim', exact: true }).click()
    await expect(admin.page.getByText(/Terima kasih 🙏/)).toBeVisible()

    await admin.context.close()
  })

  test('chat exposes no file upload control and keeps document transfer out of messaging', async ({ browser }) => {
    const fixture = await createChatFixture()
    const investor = await openInvestorChat(browser, fixture)

    await expect(investor.page.locator('input[type="file"]')).toHaveCount(0)
    await expect(
      investor.page.getByText('Dokumen, gambar, dan file tidak dapat dikirim melalui chat.'),
    ).toBeVisible()

    await investor.context.close()
  })

  test('closed thread becomes read-only in the investor UI', async ({ browser }) => {
    const fixture = await createChatFixture()
    const supabase = serviceClient()
    const closedAt = new Date().toISOString()
    const { error } = await supabase
      .from('message_threads')
      .update({ is_closed: true, closed_at: closedAt, closed_by: fixture.admin.userId })
      .eq('id', fixture.threadId)
    if (error) throw new Error(`Failed to close chat thread: ${error.message}`)

    const investor = await openInvestorChat(browser, fixture)
    await expect(investor.page.getByText('Percakapan ditutup', { exact: true })).toBeVisible()
    await expect(investor.page.getByPlaceholder('Tulis pesan…')).toHaveCount(0)
    await expect(investor.page.getByRole('button', { name: 'Kirim', exact: true })).toHaveCount(0)

    await investor.context.close()
  })

  test('composer remains usable on a narrow mobile viewport', async ({ browser }) => {
    const fixture = await createChatFixture()
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()

    await signIn(page, fixture.investor, '/investor')
    await page.goto(`/investor/messages/${fixture.threadId}`)
    await page.waitForLoadState('networkidle')

    const field = await composer(page)
    await expect(field).toBeInViewport()
    await expect(page.getByRole('button', { name: 'Kirim', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pilih emoji' })).toBeVisible()

    await field.fill('Pesan dari mobile ✅')
    await page.getByRole('button', { name: 'Kirim', exact: true }).click()
    await expect(page.getByText('Pesan dari mobile ✅')).toBeVisible()

    await context.close()
  })
})
