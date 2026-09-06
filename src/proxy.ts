import { NextResponse, type NextRequest } from 'next/server'

import { getClientEnv } from '@/lib/env'

function createNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function realtimeWebSocketOrigin(supabaseUrl: string): string {
  const url = new URL(supabaseUrl)
  url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:'
  return url.origin
}

function buildCsp(nonce: string, isDev: boolean, supabaseUrl: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https: wss: ${realtimeWebSocketOrigin(supabaseUrl)}`,
    `worker-src 'self' blob:`,
    `media-src 'self' https:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `manifest-src 'self'`,
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
}

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.hostname.toLowerCase() === 'admin.nuzultrip.com' &&
    request.nextUrl.pathname === '/'
  ) {
    const adminUrl = request.nextUrl.clone()
    adminUrl.pathname = '/admin'

    return NextResponse.redirect(adminUrl)
  }

  const nonce = createNonce()

  const environment = getClientEnv()
  const isDev = environment.NEXT_PUBLIC_APP_ENV === 'development'

  const csp = buildCsp(nonce, isDev, environment.NEXT_PUBLIC_SUPABASE_URL)

  const requestHeaders = new Headers(request.headers)

  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('content-security-policy', csp)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  response.headers.set('content-security-policy', csp)

  return response
}

export const config = {
  matcher: [
    {
      source:
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?)$).*)',
      missing: [
        {
          type: 'header',
          key: 'next-router-prefetch',
        },
        {
          type: 'header',
          key: 'purpose',
          value: 'prefetch',
        },
      ],
    },
  ],
}
