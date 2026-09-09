import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export const TYPOGRAPHY_FONT_FAMILIES = ['figtree', 'system', 'arial', 'georgia'] as const
export type TypographyFontFamily = (typeof TYPOGRAPHY_FONT_FAMILIES)[number]

export type TypographySettings = {
  fontFamily: TypographyFontFamily
  fontSizePercent: number
  letterSpacingEm: number
  lineHeight: number
}

export const DEFAULT_TYPOGRAPHY_SETTINGS: TypographySettings = {
  fontFamily: 'figtree',
  fontSizePercent: 100,
  letterSpacingEm: 0,
  lineHeight: 1.5,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export async function getTypographySettings(): Promise<TypographySettings> {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'appearance.typography')
    .maybeSingle()

  if (error) throw new Error(`Gagal memuat pengaturan tipografi: ${error.message}`)

  const raw = isRecord(data?.value) ? data.value : {}
  const fontFamily = TYPOGRAPHY_FONT_FAMILIES.includes(raw.font_family as TypographyFontFamily)
    ? (raw.font_family as TypographyFontFamily)
    : DEFAULT_TYPOGRAPHY_SETTINGS.fontFamily

  const fontSizePercent = typeof raw.font_size_percent === 'number' && Number.isFinite(raw.font_size_percent)
    ? clamp(raw.font_size_percent, 85, 125)
    : DEFAULT_TYPOGRAPHY_SETTINGS.fontSizePercent

  const letterSpacingEm = typeof raw.letter_spacing_em === 'number' && Number.isFinite(raw.letter_spacing_em)
    ? clamp(raw.letter_spacing_em, -0.03, 0.08)
    : DEFAULT_TYPOGRAPHY_SETTINGS.letterSpacingEm

  const lineHeight = typeof raw.line_height === 'number' && Number.isFinite(raw.line_height)
    ? clamp(raw.line_height, 1.2, 1.9)
    : DEFAULT_TYPOGRAPHY_SETTINGS.lineHeight

  return { fontFamily, fontSizePercent, letterSpacingEm, lineHeight }
}

export function typographyCssVariables(settings: TypographySettings): Record<string, string> {
  const family: Record<TypographyFontFamily, string> = {
    figtree: 'var(--font-jakarta), ui-sans-serif, system-ui, sans-serif',
    system: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    arial: 'Arial, Helvetica, sans-serif',
    georgia: 'Georgia, "Times New Roman", serif',
  }

  return {
    '--app-font-family': family[settings.fontFamily],
    '--app-font-size-scale': String(settings.fontSizePercent / 100),
    '--app-letter-spacing': `${settings.letterSpacingEm}em`,
    '--app-line-height': String(settings.lineHeight),
    '--app-heading-line-height': String(Math.max(0.95, settings.lineHeight * 0.72)),
  }
}
