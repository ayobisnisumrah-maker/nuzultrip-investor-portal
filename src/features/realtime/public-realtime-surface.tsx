'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { topics, type EventKind } from '@/core/realtime/events'
import { PublicConnectLinks } from '@/features/portal/public-connect-links'
import { PublicPortalExact } from '@/features/portal/public-portal-exact'
import { RealtimeProvider, useRealtime } from '@/features/realtime/realtime-provider'
import { useRealtimeTopic } from '@/features/realtime/use-realtime-topic'
import type { PublicPortalDocument, PublicPortalNavigationItem, PublicPortalSection } from '@/server/portal/public-queries'

const PUBLIC_PORTAL_EVENTS = ['portal.page_published','portal.section_published','portal.theme_updated','portal.navigation_updated','document.published','document.state_changed'] as const satisfies readonly EventKind[]

export type PublicPortalSnapshot = {
  portal: { page: { title: string; seo: unknown }; sections: PublicPortalSection[] } | null
  navigation: PublicPortalNavigationItem[]
  publicDocuments: PublicPortalDocument[]
  brandLogoUrl: string | null
}

function LiveContent({ initialSnapshot }: { initialSnapshot: PublicPortalSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const requestId = useRef(0)
  const { resumeToken } = useRealtime()
  const topic = topics.portal()

  const reconcile = useCallback(async () => {
    const id = ++requestId.current
    try {
      const response = await fetch('/api/public/portal-snapshot', { cache: 'no-store', headers: { accept: 'application/json' } })
      if (!response.ok) return
      const next = (await response.json()) as PublicPortalSnapshot
      if (id === requestId.current) setSnapshot(next)
    } catch {
      // Keep the last verified published snapshot; socket recovery will reconcile again.
    }
  }, [])

  const handlers = Object.fromEntries(PUBLIC_PORTAL_EVENTS.map((kind) => [kind, () => void reconcile()])) as Partial<Record<EventKind, () => void>>
  useRealtimeTopic(topic, handlers)

  const seenResume = useRef(resumeToken)
  useEffect(() => {
    if (resumeToken !== seenResume.current) {
      seenResume.current = resumeToken
      void reconcile()
    }
  }, [resumeToken, reconcile])

  if (!snapshot.portal) {
    return <main id="main" className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16"><p className="text-primary text-xs font-semibold tracking-[0.16em] uppercase">Nuzultrip Equity Relations</p><h1 className="font-display text-fg mt-3 text-4xl font-semibold">Portal belum diterbitkan</h1><p className="text-fg-muted mt-4 max-w-2xl text-lg leading-8">Halaman publik belum tersedia. Konten akan ditampilkan setelah diterbitkan melalui dasbor admin.</p></main>
  }

  return <><PublicPortalExact page={snapshot.portal.page} sections={snapshot.portal.sections} navigation={snapshot.navigation} publicDocuments={snapshot.publicDocuments} brandLogoUrl={snapshot.brandLogoUrl} /><PublicConnectLinks navigation={snapshot.navigation} /></>
}

export function PublicRealtimeSurface({ initialSnapshot, children }: { initialSnapshot?: PublicPortalSnapshot; children?: ReactNode }) {
  const topic = topics.portal()
  return <RealtimeProvider topics={[topic]}>{initialSnapshot ? <LiveContent initialSnapshot={initialSnapshot} /> : children}</RealtimeProvider>
}
