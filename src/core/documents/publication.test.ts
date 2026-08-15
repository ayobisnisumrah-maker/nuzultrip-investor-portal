// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  PUBLICATION_STATUSES,
  PUBLICATION_STATUS_LABELS,
  PUBLICATION_TRANSITIONS,
  PUBLICATION_TRANSITION_ACTION,
  VISIBILITIES,
  VISIBILITY_DESCRIPTIONS,
  VISIBILITY_LABELS,
  canPublicationTransition,
} from './publication'

describe('publication lifecycle', () => {
  it('labels every status and visibility', () => {
    for (const status of PUBLICATION_STATUSES)
      expect(PUBLICATION_STATUS_LABELS[status]).toBeTruthy()
    for (const visibility of VISIBILITIES) {
      expect(VISIBILITY_LABELS[visibility]).toBeTruthy()
      expect(VISIBILITY_DESCRIPTIONS[visibility]).toBeTruthy()
    }
  })

  it('requires review before approval and approval before publication', () => {
    expect(canPublicationTransition('draft', 'published')).toBe(false)
    expect(canPublicationTransition('draft', 'approved')).toBe(false)
    expect(canPublicationTransition('review', 'published')).toBe(false)
    expect(canPublicationTransition('draft', 'review')).toBe(true)
    expect(canPublicationTransition('review', 'approved')).toBe(true)
    expect(canPublicationTransition('approved', 'published')).toBe(true)
  })

  it('allows sending work back for revision', () => {
    expect(canPublicationTransition('review', 'draft')).toBe(true)
    expect(canPublicationTransition('approved', 'draft')).toBe(true)
  })

  it('never returns a published item to an editable state', () => {
    // Published artefacts are immutable; corrections create a new version.
    for (const target of PUBLICATION_STATUSES) {
      if (target === 'archived') continue
      expect(canPublicationTransition('published', target), `published → ${target}`).toBe(false)
    }
    expect(canPublicationTransition('published', 'archived')).toBe(true)
  })

  it('makes archived terminal', () => {
    expect(PUBLICATION_TRANSITIONS.archived).toEqual([])
  })

  it('never allows a self-transition', () => {
    for (const status of PUBLICATION_STATUSES) {
      expect(canPublicationTransition(status, status), status).toBe(false)
    }
  })

  it('maps every protected lifecycle target to its authoritative permission action', () => {
    expect(PUBLICATION_TRANSITION_ACTION.review).toBe('review')
    expect(PUBLICATION_TRANSITION_ACTION.approved).toBe('approve')
    expect(PUBLICATION_TRANSITION_ACTION.published).toBe('publish')
    expect(PUBLICATION_TRANSITION_ACTION.archived).toBe('archive')
  })
})
