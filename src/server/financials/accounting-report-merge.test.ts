import { describe, expect, it } from 'vitest'

import { mergeGeneratedWithManualAccounting } from './accounting-report-merge'

describe('mergeGeneratedWithManualAccounting', () => {
  it('removes legacy derived totals so dashboards do not count them twice', () => {
    const result = mergeGeneratedWithManualAccounting(
      {
        lineItems: [
          {
            statement: 'income',
            category: 'revenue',
            lineKey: 'gross_revenue',
            label: 'Pendapatan bruto',
            amount: 100,
            currency: 'IDR',
          },
          {
            statement: 'income',
            category: 'expense',
            lineKey: 'operating_expenses',
            label: 'Beban operasional',
            amount: 20,
            currency: 'IDR',
          },
        ],
        kpis: [],
        totals: {
          grossRevenue: 100,
          refunds: 0,
          expenses: 20,
          operatingResult: 80,
          cashIn: 100,
          cashOut: 20,
          netCashflow: 80,
          receivables: 0,
          pax: 1,
          invoiceCount: 1,
        },
      },
      [
        {
          statement: 'income',
          category: 'revenue',
          line_key: 'net_revenue',
          label: 'Total turunan lama',
          amount: 100,
          currency: 'IDR',
          note: null,
        },
        {
          statement: 'balance',
          category: 'asset',
          line_key: 'cash_and_bank',
          label: 'Kas dan bank',
          amount: 80,
          currency: 'IDR',
          note: null,
        },
      ],
      [],
    )

    expect(result.lineItems.map((item) => item.lineKey)).toEqual([
      'gross_revenue',
      'operating_expenses',
      'cash_and_bank',
    ])
    expect(result.preservedLineItemCount).toBe(1)
  })
})
