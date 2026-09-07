export const COMPANY_LOGO_MAX_BYTES = 5 * 1024 * 1024

export type CompanyLogoMime = 'image/avif' | 'image/jpeg' | 'image/png' | 'image/webp'

const ASCII = new TextEncoder()

function matches(bytes: Uint8Array, offset: number, signature: ArrayLike<number>) {
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[offset + index] !== signature[index]) return false
  }
  return true
}

function matchesAscii(bytes: Uint8Array, offset: number, value: string) {
  return matches(bytes, offset, ASCII.encode(value))
}

export function detectCompanyLogoMime(bytes: Uint8Array): CompanyLogoMime | null {
  if (bytes.length >= 8 && matches(bytes, 0, [137, 80, 78, 71, 13, 10, 26, 10])) {
    return 'image/png'
  }
  if (bytes.length >= 3 && matches(bytes, 0, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (bytes.length >= 12 && matchesAscii(bytes, 0, 'RIFF') && matchesAscii(bytes, 8, 'WEBP')) {
    return 'image/webp'
  }
  if (bytes.length >= 16 && matchesAscii(bytes, 4, 'ftyp')) {
    const brands = new TextDecoder('ascii').decode(bytes.slice(8, Math.min(bytes.length, 64)))
    if (brands.includes('avif') || brands.includes('avis')) return 'image/avif'
  }
  return null
}

export function isMatchingCompanyLogo(bytes: Uint8Array, declaredMime: string) {
  return detectCompanyLogoMime(bytes) === declaredMime
}
