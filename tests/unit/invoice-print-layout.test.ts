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
})
