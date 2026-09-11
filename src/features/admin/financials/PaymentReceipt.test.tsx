import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PaymentReceipt, type PaymentReceiptData } from './PaymentReceipt'

const baseData: PaymentReceiptData = {
  orderId: 'INV-20260910-TEST',
  customerName: 'Annisa',
  customerEmail: 'annisa@example.com',
  customerPhone: '081234567890',
  productType: 'Paket Umrah',
  packageName: 'Paket Umrah 9 Hari',
  packageCode: 'PKT-TEST',
  pax: 1,
  packageTotal: 22_500_000,
  subtotal: 22_500_000,
  invoiceTotal: 22_500_000,
  amountPaid: 5_000_000,
  balanceDue: 17_500_000,
  dueDate: '25 Sep 2026',
  departureDate: '10 Oct 2026',
  termsLink: 'https://nuzultrip.com/syarat-ketentuan',
  termsBody: 'Pembayaran DP mengikat pemesanan paket.\nRefund mengikuti kebijakan pada invoice.',
  termsLetterheadUrl: '/images/test-letterhead.png',
  refundPolicyLines: [
    'Proses refund maksimal 90 hari kerja sejak pengajuan diterima.',
    '0–6 hari sebelum keberangkatan: pengembalian maksimal 0% dari pembayaran yang diterima.',
  ],
  companyName: 'PT Swarna Dipa Wisata',
  companyAddress: 'Makassar',
  status: 'DP',
}

describe('PaymentReceipt', () => {
  it('renders a dynamic title, DP icon, due date, terms page, and refund table', () => {
    render(<PaymentReceipt data={{ ...baseData, discount: 0, tax: 0 }} />)

    expect(
      screen.getByRole('heading', { name: 'Bukti Pembayaran Paket Umrah 9 Hari' }),
    ).toBeTruthy()
    expect(screen.getByAltText('Status pembayaran DP').getAttribute('src')).toContain(
      'images%2Fpayment%2Fdp.png',
    )
    expect(screen.queryByText('Pajak')).toBeNull()
    expect(screen.queryByText('Potongan Harga')).toBeNull()
    expect(screen.getByText('Batas pelunasan: 25 Sep 2026')).toBeTruthy()
    expect(screen.getByText('Keberangkatan: 10 Oct 2026')).toBeTruthy()
    expect(screen.queryByText(/Dokumen ini bukan bukti pelunasan/i)).toBeNull()
    expect(screen.getByText(/Syarat & Ketentuan tercantum mulai halaman 2/)).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'https://nuzultrip.com/syarat-ketentuan' }),
    ).toHaveAttribute('href', 'https://nuzultrip.com/syarat-ketentuan')

    // The terms content is rendered once for the paginated browser preview and once for
    // the print-only document. Both copies must stay semantically equivalent.
    expect(
      screen.getAllByRole('heading', { name: 'Syarat & Ketentuan Pemesanan dan Pembayaran' })
        .length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByAltText('Kop surat Syarat & Ketentuan').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Pembayaran DP mengikat pemesanan paket/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Proses refund maksimal 90 hari kerja/).length).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('columnheader', { name: 'Rentang pembatalan sebelum keberangkatan' })
        .length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByRole('columnheader', { name: 'Maksimal refund' }).length).toBeGreaterThan(0)
    expect(screen.getAllByText('0–6 hari sebelum keberangkatan').length).toBeGreaterThan(0)
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Dengan melakukan pembayaran atas invoice ini/).length).toBeGreaterThan(
      0,
    )
    expect(screen.getAllByText('Dokumen dibuat otomatis oleh sistem Nuzultrip.').length).toBeGreaterThan(
      0,
    )
    // The finalized invoice page itself does not receive a preview page label. Terms pages do.
    expect(screen.queryByText('Halaman 1 dari 2')).toBeNull()
    expect(screen.getByText('Halaman 2 dari 2')).toBeTruthy()
    expect(screen.getAllByText('PT Swarna Dipa Wisata').length).toBeGreaterThan(0)
  })

  it('renders the PAID state and tax when tax has a positive value', () => {
    render(
      <PaymentReceipt
        data={{
          ...baseData,
          tax: 250_000,
          amountPaid: 22_750_000,
          balanceDue: 0,
          invoiceTotal: 22_750_000,
          status: 'PAID',
        }}
      />,
    )

    expect(screen.getByAltText('Status pembayaran PAID').getAttribute('src')).toContain(
      'images%2Fpayment%2Fpaid.png',
    )
    expect(screen.getByText('Pajak')).toBeTruthy()
    expect(screen.queryByText('Sisa Tagihan')).toBeNull()
    expect(screen.getByText('Status pembayaran: LUNAS.')).toBeTruthy()
  })

  it('does not render an empty contact block or unsafe terms link', () => {
    render(
      <PaymentReceipt
        data={{ ...baseData, companyContact: null, termsLink: 'javascript:alert(1)' }}
      />,
    )
    expect(screen.queryByText('Kontak')).toBeNull()
    expect(screen.getByText('Syarat & Ketentuan tercantum mulai halaman 2.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /javascript/i })).toBeNull()
  })

  it('renders signature and stamp assets without management label', () => {
    render(
      <PaymentReceipt
        data={{
          ...baseData,
          signatureUrl: '/images/test-signature.png',
          stampUrl: '/images/test-stamp.png',
          signerName: 'Maulana',
          signerPosition: 'Management',
        }}
      />,
    )

    expect(screen.queryByText('Managemen')).toBeNull()
    expect(screen.queryByText('Tanda tangan & stempel')).toBeNull()
    expect(screen.getByAltText('Tanda tangan')).toBeTruthy()
    expect(screen.getByAltText('Stempel perusahaan')).toBeTruthy()
  })
})
