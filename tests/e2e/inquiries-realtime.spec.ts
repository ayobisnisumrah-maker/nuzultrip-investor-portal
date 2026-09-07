import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

import {
  clearRateLimits,
  createAdminAccount,
  deleteAccounts,
  serviceClient,
  signIn,
  waitForRealtime,
} from './helpers/accounts'

const createdAccounts: string[] = []
const createdInquiryEmails: string[] = []

test.beforeEach(async () => {
  await clearRateLimits()
})

test.afterAll(async () => {
  const supabase = serviceClient()
  for (const email of createdInquiryEmails) {
    await supabase.from('portal_inquiries').delete().eq('email', email)
  }
  await deleteAccounts(createdAccounts)
  createdInquiryEmails.length = 0
  createdAccounts.length = 0
})

test('public document request appears in Admin Permintaan Masuk without reload', async ({ browser }) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin' })
  createdAccounts.push(admin.userId)

  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  await signIn(adminPage, admin, '/admin')
  await adminPage.goto('/admin/inquiries')
  await adminPage.waitForLoadState('networkidle')
  await waitForRealtime(adminPage)

  const visitorContext = await browser.newContext()
  const visitorPage = await visitorContext.newPage()
  await visitorPage.goto('/hubungi')

  await expect(visitorPage.getByRole('heading', { name: 'Minta Informasi atau Dokumen' })).toBeVisible()
  await expect(visitorPage.locator('main')).toContainText('bukan pendaftaran investor')

  const token = randomUUID().slice(0, 8)
  const email = `e2e-inquiry-${token}@example.test`
  const message = `Mohon kirimkan dokumen ringkasan Nuzultrip Equity untuk dipelajari. Ref ${token}.`
  createdInquiryEmails.push(email)

  await visitorPage.getByLabel('Nama lengkap').fill('Pemohon Dokumen E2E')
  await visitorPage.getByLabel('Email').fill(email)
  await visitorPage.getByLabel('Nomor telepon').fill('081234567890')
  await visitorPage.getByLabel('Perusahaan / organisasi').fill('Organisasi Uji E2E')
  await visitorPage.getByLabel('Informasi / dokumen yang ingin dipelajari').fill(message)
  await visitorPage.getByRole('button', { name: 'Kirim Permintaan Informasi' }).click()

  await expect(visitorPage.getByRole('heading', { name: 'Permintaan berhasil dikirim' })).toBeVisible({
    timeout: 30_000,
  })

  // Browser Admin tidak direload atau dinavigasi setelah inquiry dikirim.
  // Munculnya item unik ini membuktikan event inquiry.received memicu refresh server snapshot.
  const requestListItem = adminPage.getByRole('button').filter({ hasText: email })
  await expect(requestListItem).toBeVisible({ timeout: 30_000 })
  await requestListItem.click()
  await expect(adminPage.locator('main')).toContainText(message)
  await expect(adminPage.locator('main')).toContainText('Informasi / dokumen untuk dipelajari')

  const supabase = serviceClient()
  const { data: stored, error } = await supabase
    .from('portal_inquiries')
    .select('id, status, thread_id, converted_investor_id')
    .eq('email', email)
    .single()

  expect(error).toBeNull()
  expect(stored).toMatchObject({
    status: 'new',
    thread_id: null,
    converted_investor_id: null,
  })

  const statusSelect = adminPage.getByLabel('Status permintaan Pemohon Dokumen E2E')
  await statusSelect.selectOption('in_progress')
  await expect(statusSelect).toHaveValue('in_progress')

  await expect
    .poll(async () => {
      const { data } = await supabase
        .from('portal_inquiries')
        .select('status')
        .eq('id', stored?.id ?? '')
        .single()
      return data?.status
    })
    .toBe('in_progress')

  await visitorContext.close()
  await adminContext.close()
})
