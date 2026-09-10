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
  termsLink: 'https://nuzultrip.com/syarat-ketentuan',
  companyName: 'PT Swarna Dipa Wisata',
  companyAddress: 'Makassar',
  status: 'DP',
}

describe('PaymentReceipt', () => {
  it('renders a dynamic title, DP icon, due date, terms link, and hides zero-value rows', () => {
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
    expect(screen.queryByText(/Dokumen ini bukan bukti pelunasan/i)).toBeNull()
    expect(screen.getByText(/Syarat dan ketentuan berlaku/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'https://nuzultrip.com/syarat-ketentuan/' })).toHaveAttribute(
      'href',
      'https://nuzultrip.com/syarat-ketentuan',
    )
    expect(screen.getByText('Dokumen dibuat otomatis oleh sistem Nuzultrip.')).toBeTruthy()
    expect(screen.getByText('PT Swarna Dipa Wisata')).toBeTruthy()
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
    expect(screen.getByText('Syarat dan ketentuan berlaku.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /javascript/i })).toBeNull()
  })
})
