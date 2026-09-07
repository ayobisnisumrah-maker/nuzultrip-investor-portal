'use client'

import type { ReactNode } from 'react'

import { topics, type EventKind } from '@/core/realtime/events'
import { RealtimeProvider } from '@/features/realtime/realtime-provider'
import { RealtimeRefresher } from '@/features/realtime/realtime-refresher'

const PUBLIC_PORTAL_EVENTS = [
  'portal.page_published',
  'portal.section_published',
  'portal.theme_updated',
  'portal.navigation_updated',
  'document.published',
] as const satisfies readonly EventKind[]

export function PublicRealtimeSurface({ children }: { children: ReactNode }) {
  const topic = topics.portal()

  return (
    <RealtimeProvider topics={[topic]}>
      <RealtimeRefresher topic={topic} kinds={PUBLIC_PORTAL_EVENTS} />
      {children}
    </RealtimeProvider>
  )
}
