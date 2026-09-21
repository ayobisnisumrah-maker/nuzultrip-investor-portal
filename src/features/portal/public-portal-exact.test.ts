import { describe, expect, it } from 'vitest'

const CANONICAL_V2_RENDER_ORDER = [
  'hero_3d',
  'intro+stat_grid',
  'investment_info',
  'business_overview',
  'ecosystem',
  'investment_info.process_steps',
  'growth_story',
  'logo_wall',
  'investor_updates+documents',
  'contact_cta',
  'rich_content',
] as const

describe('public portal V2 renderer contract', () => {
  it('locks the canonical section order used by the public V2 surface', () => {
    expect(CANONICAL_V2_RENDER_ORDER).toEqual([
      'hero_3d',
      'intro+stat_grid',
      'investment_info',
      'business_overview',
      'ecosystem',
      'investment_info.process_steps',
      'growth_story',
      'logo_wall',
      'investor_updates+documents',
      'contact_cta',
      'rich_content',
    ])
  })

  it('keeps roadmap and investor information as separate CMS domains', () => {
    expect(CANONICAL_V2_RENDER_ORDER.indexOf('growth_story')).toBeLessThan(
      CANONICAL_V2_RENDER_ORDER.indexOf('investor_updates+documents'),
    )
    expect(CANONICAL_V2_RENDER_ORDER.filter((kind) => kind === 'growth_story')).toHaveLength(1)
  })
})
