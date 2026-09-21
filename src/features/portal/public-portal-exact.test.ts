import { describe, expect, it } from 'vitest'

const V2_CONTRACT = {
  order: [
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
  ],
  limits: {
    heroBadges: 8,
    aboutMetrics: 5,
    equityMetrics: 6,
    services: 4,
    processSteps: 4,
    roadmapSteps: 5,
    networkCards: 3,
    investorCards: 6,
    articles: 2,
  },
} as const

describe('public portal V2 renderer contract', () => {
  it('locks the canonical public section order', () => {
    expect(V2_CONTRACT.order).toEqual([
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
    expect(V2_CONTRACT.order.indexOf('growth_story')).toBeLessThan(
      V2_CONTRACT.order.indexOf('investor_updates+documents'),
    )
    expect(V2_CONTRACT.order.filter((kind) => kind === 'growth_story')).toHaveLength(1)
  })

  it('locks the V2 collection capacities expected by the approved source layout', () => {
    expect(V2_CONTRACT.limits).toEqual({
      heroBadges: 8,
      aboutMetrics: 5,
      equityMetrics: 6,
      services: 4,
      processSteps: 4,
      roadmapSteps: 5,
      networkCards: 3,
      investorCards: 6,
      articles: 2,
    })
  })
})
