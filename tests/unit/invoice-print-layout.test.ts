import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('invoice A4 print layout', () => {
  it('reserves a footer margin and uses paged-media counters instead of fixed page counters', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/features/admin/financials/PaymentReceipt.tsx'),
      'utf8',
    )

    expect(source).toContain('size: A4 portrait')
    expect(source).toContain('margin: 12mm 12mm 16mm')
    expect(source).toContain("content: 'Halaman ' counter(page) ' dari ' counter(pages)")
    expect(source).toContain('width: 186mm !important')
    expect(source).toContain('min-height: 269mm !important')
    expect(source).toContain('<FooterRight data={data} />')
    expect(source).toContain('content: none !important')
  })

  it('prints a single repeated logo and keeps payment/refund tables stable on A4', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/styles/invoice-print-overrides.css'),
      'utf8',
    )

    expect(source).toContain("[data-testid='payment-receipt'] > article:first-of-type > footer > :last-child")
    expect(source).toContain("article[data-testid='payment-terms-page'] > footer")
    expect(source).toContain('display: none !important')
    expect(source).toContain('grid-template-columns: 7% 18% 42% 11% 22% !important')
    expect(source).toContain('grid-template-columns: minmax(0, 1fr) 36mm !important')
    expect(source).toContain('table-layout: fixed !important')
    expect(source).toContain('width: 74% !important')
    expect(source).toContain('width: 26% !important')
    expect(source).toContain('page-break-inside: avoid !important')
  })
})
