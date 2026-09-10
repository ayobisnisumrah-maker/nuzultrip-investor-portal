'use client'

import { Button } from '@/ui/button'

export function FinancialReportPrintButton() {
  return <Button onClick={() => window.print()}>Cetak / Simpan PDF</Button>
}
