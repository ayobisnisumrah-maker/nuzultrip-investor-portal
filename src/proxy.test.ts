import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { proxy } from '@/proxy'

describe('production hostname routing', () => {
  it('routes the admin hostname root to the admin surface', () => {
    const response = proxy(new NextRequest('https://admin.nuzultrip.com/'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://admin.nuzultrip.com/admin')
  })

  it('does not redirect an existing admin route', () => {
    const response = proxy(new NextRequest('https://admin.nuzultrip.com/admin/portal'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('keeps the investor hostname root on the public portal', () => {
    const response = proxy(new NextRequest('https://investor.nuzultrip.com/'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })
})

describe('requested path forwarding', () => {
  it('forwards the exact internal path and query for auth continuation', () => {
    const response = proxy(
      new NextRequest(
        'https://www.nuzultrip.click/investor/ownership/inheritance?tab=history',
      ),
    )

    expect(response.headers.get('x-middleware-request-x-nuzultrip-request-path')).toBe(
      '/investor/ownership/inheritance?tab=history',
    )
  })

  it('overwrites a client-supplied continuation header', () => {
    const response = proxy(
      new NextRequest('https://www.nuzultrip.click/investor/ownership/inheritance', {
        headers: {
          'x-nuzultrip-request-path': '//evil.example/steal-session',
        },
      }),
    )

    expect(response.headers.get('x-middleware-request-x-nuzultrip-request-path')).toBe(
      '/investor/ownership/inheritance',
    )
  })
})
