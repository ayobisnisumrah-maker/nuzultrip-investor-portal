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

test('public request, handler handoff, and activity timeline stay synchronized without reload', async ({
  browser,
}) => {
  const admin = await createAdminAccount({ roleKey: 'super_admin', fullName: 'Admin PIC Pertama' })
  const secondAdmin = await createAdminAccount({
    roleKey: 'super_admin',
    fullName: 'Admin PIC Kedua',
  })
  createdAccounts.push(admin.userId, secondAdmin.userId)

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

  const requestListItem = adminPage.getByRole('button').filter({ hasText: email })
  await expect(requestListItem).toBeVisible({ timeout: 30_000 })
  await requestListItem.click()
  await expect(adminPage.locator('main')).toContainText(message)
  await expect(adminPage.locator('main')).toContainText('Informasi / dokumen untuk dipelajari')
  await expect(adminPage.getByTestId('inquiry-handler')).toHaveText('Belum ditugaskan')
  await expect(adminPage.getByTestId('inquiry-handled-at')).toHaveText('Belum ditindaklanjuti')
  await expect(adminPage.getByTestId('inquiry-activity')).toContainText('Belum ada perubahan status tercatat.')

  const supabase = serviceClient()
  const { data: stored, error } = await supabase
    .from('portal_inquiries')
    .select('id, status, handled_by, handled_at, thread_id, converted_investor_id')
    .eq('email', email)
    .single()

  expect(error).toBeNull()
  expect(stored).toMatchObject({
    status: 'new',
    handled_by: null,
    handled_at: null,
    thread_id: null,
    converted_investor_id: null,
  })

  const statusSelect = adminPage.getByLabel('Status permintaan Pemohon Dokumen E2E')
  await statusSelect.selectOption('in_progress')
  await expect(statusSelect).toHaveValue('in_progress')
  await expect(adminPage.getByTestId('inquiry-handler')).toHaveText('Anda')
  await expect(adminPage.getByTestId('inquiry-handled-at')).not.toHaveText('Belum ditindaklanjuti')
  await expect(adminPage.getByTestId('inquiry-activity')).toContainText('Baru → Diproses', {
    timeout: 30_000,
  })
  await expect(adminPage.getByTestId('inquiry-activity')).toContainText('oleh Anda')

  await expect
    .poll(async () => {
      const { data } = await supabase
        .from('portal_inquiries')
        .select('status, handled_by, handled_at')
        .eq('id', stored?.id ?? '')
        .single()
      return data
    })
    .toMatchObject({ status: 'in_progress', handled_by: admin.userId })

  const secondAdminContext = await browser.newContext()
  const secondAdminPage = await secondAdminContext.newPage()
  await signIn(secondAdminPage, secondAdmin, '/admin')
  await secondAdminPage.goto('/admin/inquiries')
  await secondAdminPage.waitForLoadState('networkidle')
  await waitForRealtime(secondAdminPage)

  const secondRequestListItem = secondAdminPage.getByRole('button').filter({ hasText: email })
  await expect(secondRequestListItem).toBeVisible()
  await secondRequestListItem.click()
  await secondAdminPage
    .getByLabel('Status permintaan Pemohon Dokumen E2E')
    .selectOption('closed')

  await expect(adminPage.getByLabel('Status permintaan Pemohon Dokumen E2E')).toHaveValue('closed', {
    timeout: 30_000,
  })
  await expect(adminPage.getByTestId('inquiry-handler')).toHaveText('Admin PIC Kedua', {
    timeout: 30_000,
  })
  await expect(adminPage.getByTestId('inquiry-activity')).toContainText('Diproses → Selesai', {
    timeout: 30_000,
  })
  await expect(adminPage.getByTestId('inquiry-activity')).toContainText('oleh Admin PIC Kedua', {
    timeout: 30_000,
  })
  await expect(adminPage.getByTestId('inquiry-activity')).toContainText('2 aktivitas')

  await expect
    .poll(async () => {
      const { data } = await supabase
        .from('portal_inquiries')
        .select('status, handled_by')
        .eq('id', stored?.id ?? '')
        .single()
      return data
    })
    .toEqual({ status: 'closed', handled_by: secondAdmin.userId })

  await secondAdminContext.close()
  await visitorContext.close()
  await adminContext.close()
})
