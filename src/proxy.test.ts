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
