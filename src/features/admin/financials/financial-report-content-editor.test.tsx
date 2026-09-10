import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { FinancialReportContentEditor } from './financial-report-content-editor'

vi.mock('@/server/financials/report-actions', () => ({
  saveFinancialReportContent: vi.fn(),
}))

describe('FinancialReportContentEditor balance sheet template', () => {
  it('adds only missing balance sheet positions and preserves existing values', () => {
    render(
      <FinancialReportContentEditor
        reportId="report-test"
        initialLines={[
          {
            statement: 'balance',
            category: 'asset',
            lineKey: 'accounts_receivable',
            label: 'Piutang Usaha',
            amount: '125000',
            currency: 'IDR',
            note: 'Dihitung dari invoice operasional.',
          },
        ]}
        initialKpis={[]}
        initialAsset={null}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Template posisi keuangan' }))

    expect(screen.getAllByDisplayValue('Piutang Usaha')).toHaveLength(1)
    expect(screen.getByDisplayValue('125000')).toBeTruthy()
    expect(screen.getByDisplayValue('Kas & Bank')).toBeTruthy()
    expect(screen.getByDisplayValue('Uang Muka & Biaya Dibayar Dimuka')).toBeTruthy()
    expect(screen.getByDisplayValue('Utang Vendor')).toBeTruthy()
    expect(screen.getByDisplayValue('Uang Muka / Titipan Pelanggan')).toBeTruthy()
    expect(screen.getByDisplayValue('Kewajiban Lainnya')).toBeTruthy()
    expect(screen.getByDisplayValue('Modal Disetor')).toBeTruthy()
    expect(screen.getByDisplayValue('Saldo Laba')).toBeTruthy()
    expect(screen.getByText('Neraca perlu rekonsiliasi')).toBeTruthy()
    expect(screen.getByText(/7 pos template posisi keuangan ditambahkan/i)).toBeTruthy()
  })

  it('does not duplicate template positions when applied more than once', () => {
    render(
      <FinancialReportContentEditor
        reportId="report-test"
        initialLines={[]}
        initialKpis={[]}
        initialAsset={null}
      />,
    )

    const templateButton = screen.getByRole('button', { name: 'Template posisi keuangan' })
    fireEvent.click(templateButton)
    fireEvent.click(templateButton)

    expect(screen.getAllByDisplayValue('Kas & Bank')).toHaveLength(1)
    expect(screen.getAllByDisplayValue('Modal Disetor')).toHaveLength(1)
    expect(screen.getByText('Neraca seimbang')).toBeTruthy()
    expect(screen.getByText(/semua pos template posisi keuangan sudah tersedia/i)).toBeTruthy()
  })
})
