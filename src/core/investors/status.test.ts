// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  INVESTOR_STATUSES,
  INVESTOR_STATUS_DESCRIPTIONS,
  INVESTOR_STATUS_LABELS,
  INVESTOR_TRANSITIONS,
  canTransition,
  grantsDataAccess,
  isTerminal,
  type InvestorStatus,
} from './status'

describe('investor lifecycle', () => {
  it('labels and describes every status', () => {
    for (const status of INVESTOR_STATUSES) {
      expect(INVESTOR_STATUS_LABELS[status], status).toBeTruthy()
      expect(INVESTOR_STATUS_DESCRIPTIONS[status], status).toBeTruthy()
    }
  })

  it('only ever transitions to a declared status', () => {
    const known = new Set<string>(INVESTOR_STATUSES)
    for (const [from, targets] of Object.entries(INVESTOR_TRANSITIONS)) {
      for (const target of targets) {
        expect(known.has(target), `${from} → ${target}`).toBe(true)
      }
    }
  })

  it('never allows a self-transition', () => {
    for (const status of INVESTOR_STATUSES) {
      expect(canTransition(status, status), status).toBe(false)
    }
  })

  it.each([
    ['prospective', 'submitted', true],
    ['submitted', 'under_review', true],
    ['submitted', 'rejected', true],
    ['under_review', 'approved', true],
    ['approved', 'active', true],
    ['active', 'inactive', true],
    ['inactive', 'active', true],
    ['rejected', 'under_review', true],
  ] as const)('permits %s → %s', (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected)
  })

  it.each([
    // The escalation shortcuts that must never exist.
    ['prospective', 'approved'],
    ['prospective', 'active'],
    ['submitted', 'active'],
    ['under_review', 'active'],
    ['rejected', 'active'],
    ['rejected', 'approved'],
    ['inactive', 'approved'],
    ['active', 'approved'],
  ] as const)('refuses %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false)
  })

  it('grants data access only once approved or active', () => {
    const granted = INVESTOR_STATUSES.filter(grantsDataAccess)
    expect(granted).toEqual<InvestorStatus[]>(['approved', 'active'])
  })

  it('reaches every status from prospective', () => {
    // A status no workflow can reach is dead schema — and usually a mistake.
    const reached = new Set<InvestorStatus>(['prospective'])
    const queue: InvestorStatus[] = ['prospective']
    while (queue.length > 0) {
      const current = queue.shift()!
      for (const next of INVESTOR_TRANSITIONS[current]) {
        if (!reached.has(next)) {
          reached.add(next)
          queue.push(next)
        }
      }
    }
    expect([...reached].sort()).toEqual([...INVESTOR_STATUSES].sort())
  })

  it('marks the workflow-terminal statuses', () => {
    expect(INVESTOR_STATUSES.filter(isTerminal)).toEqual<InvestorStatus[]>([
      'rejected',
      'active',
      'inactive',
    ])
  })
})
