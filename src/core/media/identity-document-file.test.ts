// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  detectInvestorIdentityDocumentMime,
  isMatchingInvestorIdentityDocument,
} from './identity-document-file'

describe('investor identity document binary validation', () => {
  it('detects supported file signatures', () => {
    expect(detectInvestorIdentityDocumentMime(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]))).toBe(
      'application/pdf',
    )
    expect(
      detectInvestorIdentityDocumentMime(
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
      ),
    ).toBe('image/png')
    expect(detectInvestorIdentityDocumentMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      'image/jpeg',
    )
    expect(
      detectInvestorIdentityDocumentMime(
        new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]),
      ),
    ).toBe('image/webp')
  })

  it('rejects unsupported or spoofed content', () => {
    const text = new TextEncoder().encode('<script>alert(1)</script>')

    expect(detectInvestorIdentityDocumentMime(text)).toBeNull()
    expect(isMatchingInvestorIdentityDocument(text, 'application/pdf')).toBe(false)
  })

  it('requires declared MIME to match the detected binary signature', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])

    expect(isMatchingInvestorIdentityDocument(jpeg, 'image/jpeg')).toBe(true)
    expect(isMatchingInvestorIdentityDocument(jpeg, 'image/png')).toBe(false)
  })
})
