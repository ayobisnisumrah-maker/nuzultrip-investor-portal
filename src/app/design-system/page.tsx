import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getClientEnv } from '@/lib/env'
import { DesignSystemGallery } from './gallery'

export const metadata: Metadata = {
  title: 'Design System',
  robots: { index: false, follow: false },
}

/**
 * The living gallery for the "Mizan" design system.
 *
 * Development and staging only. It is not shipped to production: it would
 * expose internal vocabulary (investor lifecycle states, publication states) on
 * a public URL for no benefit.
 */
export default function DesignSystemPage() {
  if (getClientEnv().NEXT_PUBLIC_APP_ENV === 'production') notFound()
  return <DesignSystemGallery />
}
