/**
 * TypeScript mirror of the colour tokens defined in `src/styles/tokens.css`.
 *
 * The CSS file is canonical. This mirror exists so that:
 *   • `palette.test.ts` can assert WCAG contrast for every semantic pairing;
 *   • the CMS theme editor can validate an admin's overrides before saving.
 *
 * `palette.test.ts` fails the build if this file and the CSS drift apart, so
 * the duplication cannot rot silently.
 *
 * See docs/DESIGN-SYSTEM.md §2.
 */

/* -------------------------------------------------------------------------- */
/* Primitive ramps                                                            */
/* -------------------------------------------------------------------------- */

export const primitives = {
  'zamrud-50': 'oklch(0.972 0.015 168)',
  'zamrud-100': 'oklch(0.94 0.03 168)',
  'zamrud-200': 'oklch(0.88 0.055 168)',
  'zamrud-300': 'oklch(0.8 0.08 168)',
  'zamrud-400': 'oklch(0.7 0.1 168)',
  'zamrud-500': 'oklch(0.6 0.11 168)',
  'zamrud-600': 'oklch(0.51 0.1 168)',
  'zamrud-700': 'oklch(0.42 0.085 168)',
  'zamrud-800': 'oklch(0.33 0.065 168)',
  'zamrud-900': 'oklch(0.25 0.05 168)',
  'zamrud-950': 'oklch(0.17 0.035 168)',

  'emas-100': 'oklch(0.945 0.04 88)',
  'emas-200': 'oklch(0.895 0.07 88)',
  'emas-300': 'oklch(0.845 0.1 88)',
  'emas-400': 'oklch(0.79 0.12 86)',
  'emas-500': 'oklch(0.74 0.13 84)',
  'emas-600': 'oklch(0.66 0.12 82)',
  'emas-700': 'oklch(0.55 0.1 80)',
  'emas-800': 'oklch(0.44 0.08 78)',
  'emas-850': 'oklch(0.505 0.095 79)',

  'sakinah-0': 'oklch(1 0 0)',
  'sakinah-25': 'oklch(0.99 0.003 170)',
  'sakinah-50': 'oklch(0.975 0.005 170)',
  'sakinah-100': 'oklch(0.95 0.007 170)',
  'sakinah-200': 'oklch(0.9 0.009 170)',
  'sakinah-300': 'oklch(0.83 0.011 170)',
  'sakinah-400': 'oklch(0.68 0.012 170)',
  'sakinah-450': 'oklch(0.645 0.013 171)',
  'sakinah-500': 'oklch(0.525 0.015 172)',
  'sakinah-600': 'oklch(0.46 0.014 172)',
  'sakinah-700': 'oklch(0.37 0.016 174)',
  'sakinah-800': 'oklch(0.325 0.018 176)',
  'sakinah-850': 'oklch(0.275 0.019 177)',
  'sakinah-900': 'oklch(0.235 0.02 178)',
  'sakinah-925': 'oklch(0.19 0.021 179)',
  'sakinah-950': 'oklch(0.155 0.021 180)',
  'sakinah-975': 'oklch(0.125 0.02 180)',

  'rose-100': 'oklch(0.94 0.03 25)',
  'rose-200': 'oklch(0.89 0.06 25)',
  'rose-300': 'oklch(0.8 0.11 25)',
  'rose-400': 'oklch(0.7 0.16 25)',
  'rose-500': 'oklch(0.6 0.19 25)',
  'rose-600': 'oklch(0.52 0.19 25)',
  'rose-700': 'oklch(0.44 0.16 25)',
  'rose-900': 'oklch(0.26 0.09 25)',
  'rose-950': 'oklch(0.19 0.06 25)',

  'amber-100': 'oklch(0.95 0.04 75)',
  'amber-200': 'oklch(0.9 0.08 75)',
  'amber-300': 'oklch(0.84 0.12 72)',
  'amber-400': 'oklch(0.78 0.14 70)',
  'amber-500': 'oklch(0.7 0.15 68)',
  'amber-600': 'oklch(0.6 0.13 65)',
  'amber-700': 'oklch(0.5 0.11 62)',
  'amber-900': 'oklch(0.3 0.06 62)',
  'amber-950': 'oklch(0.22 0.045 62)',

  'azure-100': 'oklch(0.94 0.03 240)',
  'azure-200': 'oklch(0.89 0.055 240)',
  'azure-300': 'oklch(0.8 0.09 244)',
  'azure-400': 'oklch(0.7 0.12 245)',
  'azure-500': 'oklch(0.62 0.15 250)',
  'azure-600': 'oklch(0.5 0.155 252)',
  'azure-700': 'oklch(0.42 0.135 252)',
  'azure-900': 'oklch(0.27 0.08 252)',
  'azure-950': 'oklch(0.2 0.06 252)',
} as const satisfies Record<string, string>

export type PrimitiveToken = keyof typeof primitives

/* -------------------------------------------------------------------------- */
/* Semantic roles                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The complete set of roles a component may consume, and the only surface the
 * CMS theme editor is permitted to override. Anything not listed here is not
 * themeable — which is what stops a retheme from breaking contrast or layout.
 */
export const SEMANTIC_ROLES = [
  'canvas',
  'surface',
  'elevated',
  'sunken',
  'inverse',
  'fg',
  'fg-muted',
  'fg-subtle',
  'fg-inverse',
  'border',
  'border-strong',
  'border-subtle',
  'primary',
  'primary-hover',
  'primary-active',
  'primary-subtle',
  'primary-border',
  'on-primary',
  'accent',
  'accent-solid',
  'accent-hover',
  'accent-subtle',
  'accent-border',
  'on-accent',
  'success',
  'success-fg',
  'success-subtle',
  'success-border',
  'warning',
  'warning-fg',
  'warning-subtle',
  'warning-border',
  'danger',
  'danger-fg',
  'danger-hover',
  'danger-subtle',
  'danger-border',
  'info',
  'info-fg',
  'info-subtle',
  'info-border',
  'ring',
  'overlay',
] as const

export type SemanticRole = (typeof SEMANTIC_ROLES)[number]

/** A role's value: either a reference to a primitive, or a literal colour. */
type RoleValue = `var(--${PrimitiveToken})` | (string & {})

export const semanticLight = {
  canvas: 'var(--sakinah-50)',
  surface: 'var(--sakinah-0)',
  elevated: 'var(--sakinah-0)',
  sunken: 'var(--sakinah-100)',
  inverse: 'var(--sakinah-925)',

  fg: 'var(--sakinah-950)',
  'fg-muted': 'var(--sakinah-600)',
  'fg-subtle': 'var(--sakinah-500)',
  'fg-inverse': 'var(--sakinah-50)',

  border: 'var(--sakinah-200)',
  'border-strong': 'var(--sakinah-450)',
  'border-subtle': 'var(--sakinah-100)',

  primary: 'var(--zamrud-600)',
  'primary-hover': 'var(--zamrud-700)',
  'primary-active': 'var(--zamrud-800)',
  'primary-subtle': 'var(--zamrud-50)',
  'primary-border': 'var(--zamrud-200)',
  'on-primary': 'var(--sakinah-0)',

  accent: 'var(--emas-850)',
  'accent-solid': 'var(--emas-500)',
  'accent-hover': 'var(--emas-600)',
  'accent-subtle': 'var(--emas-100)',
  'accent-border': 'var(--emas-200)',
  'on-accent': 'var(--sakinah-975)',

  success: 'var(--zamrud-600)',
  'success-fg': 'var(--zamrud-700)',
  'success-subtle': 'var(--zamrud-50)',
  'success-border': 'var(--zamrud-200)',

  warning: 'var(--amber-500)',
  'warning-fg': 'var(--amber-700)',
  'warning-subtle': 'var(--amber-100)',
  'warning-border': 'var(--amber-200)',

  danger: 'var(--rose-600)',
  'danger-fg': 'var(--rose-600)',
  'danger-hover': 'var(--rose-700)',
  'danger-subtle': 'var(--rose-100)',
  'danger-border': 'var(--rose-200)',

  info: 'var(--azure-600)',
  'info-fg': 'var(--azure-600)',
  'info-subtle': 'var(--azure-100)',
  'info-border': 'var(--azure-200)',

  ring: 'var(--zamrud-600)',
  overlay: 'oklch(0.155 0.021 180 / 0.5)',
} as const satisfies Record<SemanticRole, RoleValue>

export const semanticDark = {
  canvas: 'var(--sakinah-925)',
  surface: 'var(--sakinah-900)',
  elevated: 'var(--sakinah-850)',
  sunken: 'var(--sakinah-950)',
  inverse: 'var(--sakinah-50)',

  fg: 'var(--sakinah-50)',
  'fg-muted': 'var(--sakinah-300)',
  'fg-subtle': 'var(--sakinah-400)',
  'fg-inverse': 'var(--sakinah-950)',

  border: 'var(--sakinah-800)',
  'border-strong': 'var(--sakinah-500)',
  'border-subtle': 'var(--sakinah-850)',

  primary: 'var(--zamrud-400)',
  'primary-hover': 'var(--zamrud-300)',
  'primary-active': 'var(--zamrud-200)',
  'primary-subtle': 'oklch(0.26 0.045 168)',
  'primary-border': 'oklch(0.38 0.06 168)',
  'on-primary': 'var(--sakinah-975)',

  accent: 'var(--emas-400)',
  'accent-solid': 'var(--emas-500)',
  'accent-hover': 'var(--emas-300)',
  'accent-subtle': 'oklch(0.28 0.05 84)',
  'accent-border': 'oklch(0.4 0.07 84)',
  'on-accent': 'var(--sakinah-975)',

  success: 'var(--zamrud-500)',
  'success-fg': 'var(--zamrud-300)',
  'success-subtle': 'oklch(0.26 0.045 168)',
  'success-border': 'oklch(0.38 0.06 168)',

  warning: 'var(--amber-500)',
  'warning-fg': 'var(--amber-300)',
  'warning-subtle': 'oklch(0.28 0.05 68)',
  'warning-border': 'oklch(0.4 0.07 68)',

  danger: 'var(--rose-500)',
  'danger-fg': 'var(--rose-300)',
  'danger-hover': 'var(--rose-400)',
  'danger-subtle': 'oklch(0.27 0.06 25)',
  'danger-border': 'oklch(0.4 0.09 25)',

  info: 'var(--azure-500)',
  'info-fg': 'var(--azure-300)',
  'info-subtle': 'oklch(0.26 0.055 252)',
  'info-border': 'oklch(0.38 0.08 252)',

  ring: 'var(--zamrud-400)',
  overlay: 'oklch(0.09 0.015 180 / 0.66)',
} as const satisfies Record<SemanticRole, RoleValue>

export const themes = { light: semanticLight, dark: semanticDark } as const
export type ThemeName = keyof typeof themes

/**
 * Resolve a role to a concrete colour string, following a `var(--primitive)`
 * reference one level. Roles never reference other roles.
 */
export function resolveRole(theme: ThemeName, role: SemanticRole): string {
  const value: string = themes[theme][role]
  const match = /^var\(--([a-z0-9-]+)\)$/.exec(value)
  if (!match) return value
  const key = match[1] as PrimitiveToken
  const resolved = primitives[key]
  if (!resolved) {
    throw new Error(`Role "${role}" in theme "${theme}" references unknown primitive "--${key}".`)
  }
  return resolved
}
