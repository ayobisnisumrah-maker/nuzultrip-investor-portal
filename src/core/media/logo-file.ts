export const LOGO_MAX_BYTES = 2 * 1024 * 1024

export type LogoMime = 'image/jpeg' | 'image/png' | 'image/webp'

export function detectLogoMime(bytes: Uint8Array): LogoMime | null {
  const has = (offset: number, values: readonly number[]) =>
    values.every((value, index) => bytes[offset + index] === value)

  if (bytes.length >= 8 && has(0, [137, 80, 78, 71, 13, 10, 26, 10])) return 'image/png'
  if (bytes.length >= 3 && has(0, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (bytes.length >= 12 && has(0, [82, 73, 70, 70]) && has(8, [87, 69, 66, 80])) {
    return 'image/webp'
  }

  return null
}

export function isMatchingLogoFile(
  bytes: Uint8Array,
  declaredMime: string,
): declaredMime is LogoMime {
  return detectLogoMime(bytes) === declaredMime
}
