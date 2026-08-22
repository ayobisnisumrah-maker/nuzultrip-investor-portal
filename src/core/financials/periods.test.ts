import { describe, expect, it } from 'vitest'

import {
  canCloseFinancialPeriod,
  canLockFinancialPeriod,
  canTransitionFinancialPeriod,
  FINANCIAL_PERIOD_STATUS_LABELS,
  FINANCIAL_PERIOD_TYPE_LABELS,
  getFinancialPeriodMaxIndex,
  isFinancialPeriodEditable,
} from './periods'

describe('financial period lifecycle', () => {
  it('allows open to closed', () => {
    expect(canTransitionFinancialPeriod('open', 'closed')).toBe(true)
  })

  it('allows open to locked', () => {
    expect(canTransitionFinancialPeriod('open', 'locked')).toBe(true)
  })

  it('allows closed to locked', () => {
    expect(canTransitionFinancialPeriod('closed', 'locked')).toBe(true)
  })

  it('does not allow closed to open', () => {
    expect(canTransitionFinancialPeriod('closed', 'open')).toBe(false)
  })

  it('does not allow locked to any status', () => {
    expect(canTransitionFinancialPeriod('locked', 'open')).toBe(false)

    expect(canTransitionFinancialPeriod('locked', 'closed')).toBe(false)
  })

  it('only open periods are editable', () => {
    expect(isFinancialPeriodEditable('open')).toBe(true)
    expect(isFinancialPeriodEditable('closed')).toBe(false)
    expect(isFinancialPeriodEditable('locked')).toBe(false)
  })

  it('only open periods can be closed', () => {
    expect(canCloseFinancialPeriod('open')).toBe(true)
    expect(canCloseFinancialPeriod('closed')).toBe(false)
    expect(canCloseFinancialPeriod('locked')).toBe(false)
  })

  it('open and closed periods can be locked', () => {
    expect(canLockFinancialPeriod('open')).toBe(true)
    expect(canLockFinancialPeriod('closed')).toBe(true)
    expect(canLockFinancialPeriod('locked')).toBe(false)
  })
})

describe('financial period metadata', () => {
  it('uses the correct maximum index', () => {
    expect(getFinancialPeriodMaxIndex('monthly')).toBe(12)
    expect(getFinancialPeriodMaxIndex('quarterly')).toBe(4)
    expect(getFinancialPeriodMaxIndex('yearly')).toBe(1)
  })

  it('has Indonesian type labels', () => {
    expect(FINANCIAL_PERIOD_TYPE_LABELS.monthly).toBe('Bulanan')
    expect(FINANCIAL_PERIOD_TYPE_LABELS.quarterly).toBe('Kuartalan')
    expect(FINANCIAL_PERIOD_TYPE_LABELS.yearly).toBe('Tahunan')
  })

  it('has Indonesian status labels', () => {
    expect(FINANCIAL_PERIOD_STATUS_LABELS.open).toBe('Terbuka')
    expect(FINANCIAL_PERIOD_STATUS_LABELS.closed).toBe('Ditutup')
    expect(FINANCIAL_PERIOD_STATUS_LABELS.locked).toBe('Terkunci')
  })
})
