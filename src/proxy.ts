import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getClientEnv, isDevelopment } from '@/lib/env'


const SIGN_IN_PATH = '/masuk'

const PROTECTED_PREFIXES = [
  { prefix: '/admin', accountType: 'admin' as const },
  { prefix: '/investor', accountType: 'investor' as const },
]

function createNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function buildCsp(
  nonce: string,
  supabaseOrigin: string,
  isDev: boolean,
): string {
  const supabaseWs = supabaseOrigin.replace(/^http/, 'ws')

  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${supabaseOrigin}`,
    `font-src 'self' data:`,
    `connect-src 'self' ${supabaseOrigin} ${supabaseWs}`,
    `worker-src 'self' blob:`,
    `media-src 'self' ${supabaseOrigin}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `manifest-src 'self'`,
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
}

export async function proxy(request: NextRequest) {
  const nonce = createNonce()

  const env = getClientEnv()
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isDev = isDevelopment()

  const supabaseOrigin = new URL(supabaseUrl).origin
  const csp = buildCsp(nonce, supabaseOrigin, isDev)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('content-security-policy', csp)

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },

      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }

        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }

        for (const [key, headerValue] of Object.entries(headers)) {
          response.headers.set(key, headerValue)
        }
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null
  const userId = typeof claims?.sub === 'string' ? claims.sub : null

  const { pathname } = request.nextUrl

  const protectedRoute = PROTECTED_PREFIXES.find(
    (entry) =>
      pathname === entry.prefix ||
      pathname.startsWith(`${entry.prefix}/`),
  )

  if (protectedRoute && !userId) {
    const redirectUrl = request.nextUrl.clone()

    redirectUrl.pathname = SIGN_IN_PATH
    redirectUrl.search = `?lanjut=${encodeURIComponent(pathname)}`

    const redirect = NextResponse.redirect(redirectUrl)

    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie)
    }

    redirect.headers.set('content-security-policy', csp)
    redirect.headers.set('cache-control', 'private, no-store')

    return redirect
  }

  response.headers.set('content-security-policy', csp)

  if (response.cookies.getAll().length > 0) {
    response.headers.set('cache-control', 'private, no-store')
  }

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
