// @vitest-environment node
/**
 * Guards the colour system.
 *
 * 1. `src/styles/tokens.css` is canonical; `palette.ts` mirrors it. These tests
 *    fail if the two drift apart.
 * 2. The dark theme is declared twice in CSS (once under a media query for the
 *    system preference, once under `[data-theme="dark"]` for the explicit
 *    toggle). They must stay identical.
 * 3. Every semantic pairing a component can produce must meet WCAG 2.2 AA in
 *    both themes. Contrast is enforced here, not hoped for.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse, wcagContrast } from 'culori'
import {
  primitives,
  resolveRole,
  SEMANTIC_ROLES,
  semanticDark,
  semanticLight,
  type SemanticRole,
} from './palette'

const cssPath = resolve(process.cwd(), 'src/styles/tokens.css')
const css = readFileSync(cssPath, 'utf8')

function sliceBetween(source: string, start: string, end: string): string {
  const from = source.indexOf(start)
  const to = source.indexOf(end)
  if (from === -1) throw new Error(`Anchor not found in tokens.css: ${start}`)
  if (to === -1) throw new Error(`Anchor not found in tokens.css: ${end}`)
  if (to <= from) throw new Error(`Anchors out of order in tokens.css: ${start} .. ${end}`)
  return source.slice(from, to)
}

function declarations(block: string, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /--([a-z0-9-]+)\s*:\s*([^;]+);/g
  let match: RegExpExecArray | null
  while ((match = re.exec(block)) !== null) {
    const name = match[1]!
    if (prefix && !name.startsWith(prefix)) continue
    out[name] = match[2]!.trim().replace(/\s+/g, ' ')
  }
  return out
}

const cssPrimitives = declarations(
  sliceBetween(css, '/* 1. Primitive ramps', '/* 2. Semantic roles'),
)
const cssLight = declarations(
  sliceBetween(css, '/* 2. Semantic roles — LIGHT', '/* 2b. Semantic roles — DARK'),
  'c-',
)
const cssDarkMedia = declarations(
  sliceBetween(css, '@media (prefers-color-scheme: dark)', '/* Explicit user choice'),
  'c-',
)
const cssDarkExplicit = declarations(
  sliceBetween(css, ":root[data-theme='dark']", '/* 3. Scales'),
  'c-',
)

describe('tokens.css ↔ palette.ts parity', () => {
  it('declares every primitive from palette.ts, with identical values', () => {
    for (const [name, value] of Object.entries(primitives)) {
      expect(cssPrimitives[name], `--${name} missing from tokens.css`).toBe(value)
    }
  })

  it('declares no primitive that palette.ts does not know about', () => {
    const known = new Set(Object.keys(primitives))
    for (const name of Object.keys(cssPrimitives)) {
      expect(known.has(name), `--${name} exists in tokens.css but not in palette.ts`).toBe(true)
    }
  })

  it.each(['light', 'dark'] as const)('mirrors every %s semantic role', (theme) => {
    const cssRoles = theme === 'light' ? cssLight : cssDarkExplicit
    const tsRoles: Record<string, string> = theme === 'light' ? semanticLight : semanticDark
    for (const role of SEMANTIC_ROLES) {
      expect(cssRoles[`c-${role}`], `--c-${role} missing from the ${theme} block`).toBe(
        tsRoles[role],
      )
    }
    // And nothing extra: an unmirrored role would be invisible to these tests.
    const expected = new Set(SEMANTIC_ROLES.map((r) => `c-${r}`))
    for (const name of Object.keys(cssRoles)) {
      expect(expected.has(name), `--${name} in the ${theme} block is not a known role`).toBe(true)
    }
  })

  it('keeps the two dark-theme declarations identical', () => {
    // One is the system-preference media query, the other the explicit toggle.
    // If these diverge, users get different colours depending on how they got
    // to dark mode — a bug that is easy to introduce and hard to notice.
    expect(cssDarkMedia).toEqual(cssDarkExplicit)
  })
})

/* -------------------------------------------------------------------------- */
/* Contrast                                                                   */
/* -------------------------------------------------------------------------- */

const AA_TEXT = 4.5
const AA_UI = 3.0

function contrast(theme: 'light' | 'dark', a: SemanticRole, b: SemanticRole): number {
  const ca = parse(resolveRole(theme, a))
  const cb = parse(resolveRole(theme, b))
  if (!ca || !cb) throw new Error(`Unparseable colour in ${theme}: ${a} / ${b}`)
  return wcagContrast(ca, cb)
}

const BACKGROUNDS = ['canvas', 'surface', 'elevated', 'sunken'] as const
const TEXT_ROLES = [
  'fg',
  'fg-muted',
  'fg-subtle',
  'primary',
  'accent',
  'success-fg',
  'warning-fg',
  'danger-fg',
  'info-fg',
] as const

/** Text drawn directly on a solid fill. */
const ON_SOLID: ReadonlyArray<readonly [SemanticRole, SemanticRole]> = [
  ['primary', 'on-primary'],
  ['accent-solid', 'on-accent'],
  ['success', 'on-primary'],
  ['warning', 'on-accent'],
  ['danger', 'on-primary'],
  ['info', 'on-primary'],
]

/** Badge/alert pairings: a status foreground on its own subtle background. */
const ON_SUBTLE: ReadonlyArray<readonly [SemanticRole, SemanticRole]> = [
  ['primary-subtle', 'primary'],
  ['accent-subtle', 'accent'],
  ['success-subtle', 'success-fg'],
  ['warning-subtle', 'warning-fg'],
  ['danger-subtle', 'danger-fg'],
  ['info-subtle', 'info-fg'],
]

describe.each(['light', 'dark'] as const)('WCAG 2.2 AA — %s theme', (theme) => {
  describe('body text on every background', () => {
    it.each(TEXT_ROLES)('%s', (role) => {
      for (const bg of BACKGROUNDS) {
        const ratio = contrast(theme, role, bg)
        expect(ratio, `${role} on ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(AA_TEXT)
      }
    })
  })

  it.each(ON_SOLID)('text on the %s fill', (fill, text) => {
    const ratio = contrast(theme, text, fill)
    expect(ratio, `${text} on ${fill} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(ON_SUBTLE)('text on the %s background', (bg, text) => {
    const ratio = contrast(theme, text, bg)
    expect(ratio, `${text} on ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(['border-strong', 'primary', 'ring'] as const)(
    '%s meets the 3:1 non-text boundary requirement',
    (role) => {
      for (const bg of ['canvas', 'surface'] as const) {
        const ratio = contrast(theme, role, bg)
        expect(ratio, `${role} on ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(AA_UI)
      }
    },
  )

  it('never uses pure black or pure white as a canvas', () => {
    // Pure black crushes shadow layering on OLED; pure white is harsh at length.
    for (const bg of BACKGROUNDS) {
      const value = resolveRole(theme, bg)
      expect(value).not.toBe('oklch(0 0 0)')
      if (theme === 'dark') expect(value).not.toMatch(/^oklch\(1 /)
    }
  })
})
