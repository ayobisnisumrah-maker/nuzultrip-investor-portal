// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ANONYMOUS } from '@/core/auth/principal'

const mocks = vi.hoisted(() => ({
  getPrincipal: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`)
  }),
}))

vi.mock('next/headers', () => ({
  headers: mocks.headers,
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

vi.mock('./session', () => ({
  getPrincipal: mocks.getPrincipal,
}))

import { requireInvestorPage } from './page-guards'

describe('page auth continuation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPrincipal.mockResolvedValue(ANONYMOUS)
  })

  it('preserves the requested investor deep-link and query when signing in', async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        'x-nuzultrip-request-path': '/investor/ownership/inheritance?tab=history',
      }),
    )

    await expect(requireInvestorPage()).rejects.toThrow('REDIRECT:')

    expect(mocks.redirect).toHaveBeenCalledWith(
      '/masuk?lanjut=%2Finvestor%2Fownership%2Finheritance%3Ftab%3Dhistory',
    )
  })

  it('falls back to the investor root for an unsafe continuation path', async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        'x-nuzultrip-request-path': '//evil.example/steal-session',
      }),
    )

    await expect(requireInvestorPage()).rejects.toThrow('REDIRECT:')

    expect(mocks.redirect).toHaveBeenCalledWith('/masuk?lanjut=%2Finvestor')
  })

  it('keeps an explicit page path when a caller supplies one', async () => {
    mocks.headers.mockResolvedValue(new Headers())

    await expect(requireInvestorPage('/investor/documents')).rejects.toThrow('REDIRECT:')

    expect(mocks.redirect).toHaveBeenCalledWith('/masuk?lanjut=%2Finvestor%2Fdocuments')
    expect(mocks.headers).not.toHaveBeenCalled()
  })
})
