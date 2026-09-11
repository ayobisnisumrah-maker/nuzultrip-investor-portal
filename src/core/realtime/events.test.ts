// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { eventsForTopic, TOPIC_EVENTS } from './events'

describe('document realtime invalidation', () => {
  it('invalidates the public portal when document state changes', () => {
    expect(TOPIC_EVENTS['portal:public']).toContain('document.state_changed')
  })

  it('invalidates the shared investor surface when document state changes', () => {
    expect(TOPIC_EVENTS['investors:all']).toContain('document.state_changed')
  })

  it('invalidates an individual investor surface when document state changes', () => {
    expect(eventsForTopic('investor:11111111-1111-4111-8111-111111111111')).toContain(
      'document.state_changed',
    )
  })
})
