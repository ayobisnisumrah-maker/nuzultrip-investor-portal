export const INVESTOR_IDENTITY_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024

export type InvestorIdentityDocumentMime =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'

const ASCII = new TextEncoder()

function matches(bytes: Uint8Array, offset: number, signature: ArrayLike<number>) {
  if (offset < 0 || bytes.length < offset + signature.length) return false

  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[offset + index] !== signature[index]) return false
  }
  return true
}

function matchesAscii(bytes: Uint8Array, offset: number, value: string) {
  return matches(bytes, offset, ASCII.encode(value))
}

export function detectInvestorIdentityDocumentMime(
  bytes: Uint8Array,
): InvestorIdentityDocumentMime | null {
  if (bytes.length >= 5 && matchesAscii(bytes, 0, '%PDF-')) {
    return 'application/pdf'
  }

  if (bytes.length >= 8 && matches(bytes, 0, [137, 80, 78, 71, 13, 10, 26, 10])) {
    return 'image/png'
  }

  if (bytes.length >= 3 && matches(bytes, 0, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg'
  }

  if (bytes.length >= 12 && matchesAscii(bytes, 0, 'RIFF') && matchesAscii(bytes, 8, 'WEBP')) {
    return 'image/webp'
  }

  return null
}

export function isMatchingInvestorIdentityDocument(bytes: Uint8Array, declaredMime: string) {
  return detectInvestorIdentityDocumentMime(bytes) === declaredMime
}
