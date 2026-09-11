import { describe, expect, it } from 'vitest'

import { COMPANY_LOGO_MAX_BYTES, detectCompanyLogoMime, isMatchingCompanyLogo } from './logo-file'

describe('company logo file validation', () => {
  it.each([
    ['image/png', [137, 80, 78, 71, 13, 10, 26, 10]],
    ['image/jpeg', [0xff, 0xd8, 0xff, 0xdb]],
    [
      'image/webp',
      [...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WEBP')],
    ],
    ['image/avif', [0, 0, 0, 24, ...new TextEncoder().encode('ftypavif'), 0, 0, 0, 0]],
  ] as const)('detects %s from binary content', (mime, signature) => {
    expect(detectCompanyLogoMime(Uint8Array.from(signature))).toBe(mime)
  })

  it('rejects executable content disguised with an image MIME type', () => {
    const html = new TextEncoder().encode('<script>alert(1)</script>')
    expect(detectCompanyLogoMime(html)).toBeNull()
    expect(isMatchingCompanyLogo(html, 'image/png')).toBe(false)
  })

  it('rejects a declared MIME type that differs from the file signature', () => {
    const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
    expect(isMatchingCompanyLogo(png, 'image/jpeg')).toBe(false)
  })

  it('keeps the dashboard upload limit at five megabytes', () => {
    expect(COMPANY_LOGO_MAX_BYTES).toBe(5_242_880)
  })
})
