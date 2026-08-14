import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getClientEnv, isDevelopment } from '@/lib/env'

/**
 * Proxy — what Next.js called Middleware before v16. Runs on the Node runtime.
 *
 * It does exactly three things, in this order:
 *
 *   1. Mints a per-request CSP nonce.
 *   2. Refreshes the Supabase session so a rotating refresh token is persisted
 *      (a Server Component cannot write cookies, so this is the only place it
 *      can happen).
 *   3. Performs a **coarse** routing check: is there a session at all, and does
 *      the account type match the route prefix?
 *
 * Step 3 is a UX affordance and a defence-in-depth layer. It is **never** the
 * authorisation decision — that happens in the entry-point guard and again in
 * RLS (docs/ARCHITECTURE.md §6). Treating a proxy check as authorisation is a
 * classic mistake: it can be bypassed by anything that does not route through
 * the proxy, and it cannot express row-level rules.
 */

const SIGN_IN_PATH = '/masuk'

/** Route prefixes that require a session, and the account type each expects. */
const PROTECTED_PREFIXES = [
  { prefix: '/admin', accountType: 'admin' as const },
  { prefix: '/investor', accountType: 'investor' as const },
]

function buildCsp(nonce: string, supabaseOrigin: string, isDev: boolean): string {
  const supabaseWs = supabaseOrigin.replace(/^http/, 'ws')

  return [
    `default-src 'self'`,
    // 'strict-dynamic' lets Next's nonce'd bootstrap load its own chunks, and
    // makes the host allow-list irrelevant — which is the point. React uses
    // eval() in development for error overlays only.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // A nonce cannot cover inline `style` attributes, which React emits for any
    // computed style, so 'unsafe-inline' is required here. The trade-off is
    // accepted deliberately: with script-src locked down and no
    // dangerouslySetInnerHTML anywhere in the codebase, style injection has no
    // path to execution. See docs/SECURITY.md §7.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${supabaseOrigin}`,
    `font-src 'self' data:`,
    `connect-src 'self' ${supabaseOrigin} ${supabaseWs}`,
    // Draco and Meshopt decoders for the 3D hero run in blob workers.
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
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // `getClientEnv()` throws when the configuration is missing or malformed,
  // which is the correct outcome: the alternative is serving protected routes
  // with no session check at all.
  const env = getClientEnv()
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isDev = isDevelopment()

  const csp = buildCsp(nonce, new URL(supabaseUrl).origin, isDev)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  // Next reads the nonce back out of this request header to stamp its own
  // inline bootstrap script.
  requestHeaders.set('content-security-policy', csp)

  let response = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request: { headers: requestHeaders } })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        // A response that sets auth cookies must never be cached by a CDN or
        // reverse proxy — one user's token would be served to another.
        for (const [key, headerValue] of Object.entries(headers)) {
          response.headers.set(key, headerValue)
        }
      },
    },
  })

  // Verifies the token with the auth server and rotates it when needed.
  // `getSession()` would return whatever the cookie claims, unverified.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const protectedRoute = PROTECTED_PREFIXES.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  )

  if (protectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = SIGN_IN_PATH
    // Only a same-origin path is ever echoed back, so this cannot become an
    // open redirect.
    redirectUrl.search = `?lanjut=${encodeURIComponent(pathname)}`
    const redirect = NextResponse.redirect(redirectUrl)
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie)
    }
    redirect.headers.set('content-security-policy', csp)
    return redirect
  }

  response.headers.set('content-security-policy', csp)
  return response
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation output. Those are
     * public by definition and would only add a round trip to the auth server.
     */
    {
      source:
        '/((?!_next/static|_next/image|favicon.ico|models/|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?|glb|ktx2)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
