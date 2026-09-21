import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPublishedHomePage: vi.fn(),
  getPublishedNavigation: vi.fn(),
  getPublicDocuments: vi.fn(),
  getPublicBrandLogo: vi.fn(),
}))

vi.mock('@/server/portal/public-queries', () => ({
  getPublishedHomePage: mocks.getPublishedHomePage,
  getPublishedNavigation: mocks.getPublishedNavigation,
  getPublicDocuments: mocks.getPublicDocuments,
}))

vi.mock('@/server/portal/public-branding', () => ({
  getPublicBrandLogo: mocks.getPublicBrandLogo,
}))

import { GET } from './route'

describe('GET /api/public/portal-snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPublishedNavigation.mockResolvedValue([])
    mocks.getPublicDocuments.mockResolvedValue([])
    mocks.getPublicBrandLogo.mockResolvedValue(null)
  })

  it('returns only supported published home sections, including contact_cta', async () => {
    mocks.getPublishedHomePage.mockResolvedValue({
      page: { seo: { title: 'SEO' } },
      sections: [
        { id: 'hero', section_kind: 'hero_3d', content: {} },
        { id: 'quick', section_kind: 'contact_cta', content: {} },
        { id: 'unsupported', section_kind: 'internal_only', content: {} },
      ],
    })

    const response = await GET()
    const body = await response.json()

    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0')
    expect(body.portal.page).toEqual({ title: 'Nuzultrip', seo: { title: 'SEO' } })
    expect(body.portal.sections.map((section: { section_kind: string }) => section.section_kind)).toEqual([
      'hero_3d',
      'contact_cta',
    ])
  })

  it('removes placeholder navigation but keeps functional navigation and canonical public documents', async () => {
    mocks.getPublishedHomePage.mockResolvedValue({ page: { seo: {} }, sections: [] })
    mocks.getPublishedNavigation.mockResolvedValue([
      { id: 'placeholder', href: '#', label: 'Placeholder' },
      { id: 'empty', href: '   ', label: 'Empty' },
      { id: 'about', href: '#tentang', label: 'Tentang' },
      { id: 'login', href: '/masuk', label: 'Masuk' },
    ])
    mocks.getPublicDocuments.mockResolvedValue([
      { id: 'pitchdeck', title: 'Pitch Deck', href: '/dokumen/pitchdeck' },
    ])
    mocks.getPublicBrandLogo.mockResolvedValue('/brand/logo.svg')

    const response = await GET()
    const body = await response.json()

    expect(body.navigation.map((item: { id: string }) => item.id)).toEqual(['about', 'login'])
    expect(body.publicDocuments).toEqual([
      { id: 'pitchdeck', title: 'Pitch Deck', href: '/dokumen/pitchdeck' },
    ])
    expect(body.brandLogoUrl).toBe('/brand/logo.svg')
  })

  it('returns a null portal when no published home page exists', async () => {
    mocks.getPublishedHomePage.mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(body.portal).toBeNull()
    expect(body.navigation).toEqual([])
    expect(body.publicDocuments).toEqual([])
  })
})
