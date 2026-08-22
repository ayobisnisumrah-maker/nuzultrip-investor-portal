import type { NextConfig } from 'next'

/**
 * Static security headers.
 *
 * Content-Security-Policy is deliberately NOT set here: it needs a per-request
 * nonce, so it is emitted from `src/middleware.ts`. Everything below is
 * request-independent and therefore belongs in the static header config.
 *
 * See docs/SECURITY.md §7.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
] as const

const supabaseHost = (() => {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
})()

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Never ship a build that does not typecheck. If this is ever flipped to
  // `true`, the CI gate described in docs/ARCHITECTURE.md §13 is void.
  // (Next 16 removed the `eslint` config key along with `next lint`; linting is
  // a separate `pnpm lint` step in the gate.)
  typescript: { ignoreBuildErrors: false },

  poweredByHeader: false,

  images: {
    // `domains` is removed in Next 16 — remotePatterns only.
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }]
      : [],
    formats: ['image/avif', 'image/webp'],
  },

  experimental: {
    // Keeps large icon/3D barrel imports from bloating client bundles.
    optimizePackageImports: ['lucide-react', '@react-three/drei'],
  },

  // Next's config type requires this to be async even though it resolves
  // synchronously.
  // eslint-disable-next-line @typescript-eslint/require-await
  async headers() {
    return [{ source: '/:path*', headers: [...securityHeaders] }]
  },
}

export default nextConfig

import('@opennextjs/cloudflare').then((m) => m.initOpenNextCloudflareForDev())
