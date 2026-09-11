import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('invoice A4 print layout', () => {
  it('prints on an explicit full A4 canvas instead of shrinking into page margins', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/features/admin/financials/PaymentReceipt.tsx'),
      'utf8',
    )
    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/features/admin/financials/PaymentReceipt.module.css'),
      'utf8',
    )

    expect(source).toContain('size: A4 portrait')
    expect(source).toContain('margin: 0')
    expect(source).toContain('width: 210mm !important')
    expect(source).toContain('height: 297mm !important')
    expect(source).toContain('padding: 10mm 8mm 8mm !important')
    expect(source).not.toContain("counter(page)")
    expect(source).not.toContain('width: 186mm !important')
    expect(source).not.toContain('min-height: 269mm !important')
    expect(css).toContain('padding: 10mm 8mm 8mm')
  })

  it('uses the same discrete A4 terms pages for browser preview and PDF printing', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/features/admin/financials/PaymentReceipt.tsx'),
      'utf8',
    )
    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/features/admin/financials/PaymentReceipt.module.css'),
      'utf8',
    )
    const printCss = fs.readFileSync(
      path.join(process.cwd(), 'src/styles/invoice-print-overrides.css'),
      'utf8',
    )

    expect(source).toContain('payment-terms-preview-pages')
    expect(source).toContain('payment-terms-preview-page')
    expect(source).toContain('node.scrollHeight > node.clientHeight + 1')
    expect(source).toContain('onPageCountChange(pages.length)')
    expect(source).toContain('const totalDocumentPages = 1 + pages.length')
    expect(css).toContain('.screenTermsPage')
    expect(css).toContain('height: 297mm')
    expect(printCss).toContain("[data-testid='payment-terms-preview-pages']")
    expect(printCss).toContain("[data-testid='payment-terms-preview-page']")
    expect(printCss).toContain('display: block !important')
    expect(printCss).toContain('display: flex !important')
  })

  it('repeats company identity at the top and logo plus page number at the bottom of terms pages', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/features/admin/financials/PaymentReceipt.tsx'),
      'utf8',
    )
    const printCss = fs.readFileSync(
      path.join(process.cwd(), 'src/styles/invoice-print-overrides.css'),
      'utf8',
    )

    expect(source).toContain('<TermsDocumentHeader data={data} />')
    expect(source).not.toContain('Syarat &amp; Ketentuan — lanjutan')
    expect(source).toContain('<PageIndicator page={1} total={totalDocumentPages} />')
    expect(source).toContain('<PageIndicator page={pageIndex + 2} total={totalDocumentPages} />')
    expect(source).toContain('<FooterRight data={data} />')
    expect(source).toContain('{data.companyAddress}')
    expect(printCss).toContain('Keep the real footer logo on page 1 and on every explicit terms page.')
    expect(printCss).toContain('max-width: 22mm !important')
    expect(printCss).toContain('height: 7mm !important')
  })

  it('keeps payment/refund tables stable on A4', () => {
    const printCss = fs.readFileSync(
      path.join(process.cwd(), 'src/styles/invoice-print-overrides.css'),
      'utf8',
    )
    const layout = fs.readFileSync(path.join(process.cwd(), 'src/app/layout.tsx'), 'utf8')

    expect(layout).toContain("import '@/styles/invoice-print-overrides.css'")
    expect(printCss).toContain('grid-template-columns: 7% 18% 42% 11% 22% !important')
    expect(printCss).toContain('grid-template-columns: minmax(0, 1fr) 36mm !important')
    expect(printCss).toContain('table-layout: fixed !important')
    expect(printCss).toContain('width: 74% !important')
    expect(printCss).toContain('width: 26% !important')
    expect(printCss).toContain('page-break-inside: avoid !important')
  })

  it('provides readable terms editing controls and automatic heading preview', () => {
    const editor = fs.readFileSync(
      path.join(process.cwd(), 'src/features/admin/financials/terms-editor.tsx'),
      'utf8',
    )
    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/features/admin/financials/PaymentReceipt.module.css'),
      'utf8',
    )

    expect(editor).toContain('Besarkan editor')
    expect(editor).toContain('Kecilkan editor')
    expect(editor).toContain('A+')
    expect(editor).toContain('A−')
    expect(editor).toContain('Tandai judul/pasal')
    expect(editor).toContain('Rata kiri')
    expect(editor).toContain('Tengah')
    expect(editor).toContain('Rata kiri-kanan')
    expect(css).toContain('.termsHeading')
    expect(css).toContain('text-align: justify')
    expect(css).toContain('text-align: center')
  })
})
