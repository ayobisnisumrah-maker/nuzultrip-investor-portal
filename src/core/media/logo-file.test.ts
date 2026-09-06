import { describe, expect, it } from 'vitest'

import { detectLogoMime, isMatchingLogoFile, LOGO_MAX_BYTES } from './logo-file'

describe('logo file validation', () => {
  it.each([
    ['image/png', [137, 80, 78, 71, 13, 10, 26, 10]],
    ['image/jpeg', [0xff, 0xd8, 0xff, 0xdb]],
    ['image/webp', [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]],
  ] as const)('detects %s from its binary signature', (mime, signature) => {
    expect(detectLogoMime(Uint8Array.from(signature))).toBe(mime)
  })

  it('rejects executable or unknown content even when the filename looks like an image', () => {
    const html = new TextEncoder().encode('<script>alert(1)</script>')
    expect(detectLogoMime(html)).toBeNull()
    expect(isMatchingLogoFile(html, 'image/png')).toBe(false)
  })

  it('rejects a declared MIME type that does not match the binary signature', () => {
    const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
    expect(isMatchingLogoFile(png, 'image/jpeg')).toBe(false)
  })

  it('limits admin-uploaded logos to two megabytes', () => {
    expect(LOGO_MAX_BYTES).toBe(2_097_152)
  })
})
