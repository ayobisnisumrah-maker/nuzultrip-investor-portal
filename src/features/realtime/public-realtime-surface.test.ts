import { describe, expect, it } from 'vitest'

import { eventsForTopic, topics } from '@/core/realtime/events'

const PUBLIC_PORTAL_RECONCILE_EVENTS = [
  'portal.page_published',
  'portal.section_published',
  'portal.theme_updated',
  'portal.navigation_updated',
  'document.published',
  'document.state_changed',
] as const

describe('public portal realtime event contract', () => {
  it('delivers every event that must reconcile the public snapshot', () => {
    expect(eventsForTopic(topics.portal())).toEqual(PUBLIC_PORTAL_RECONCILE_EVENTS)
  })

  it('keeps document visibility changes on the public topic', () => {
    expect(eventsForTopic(topics.portal())).toContain('document.state_changed')
  })
})
