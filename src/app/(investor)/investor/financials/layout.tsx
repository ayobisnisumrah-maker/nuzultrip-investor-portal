import type { ReactNode } from 'react'

import { requireInvestorDataPage } from '@/server/auth/page-guards'

export default async function InvestorFinancialsLayout({ children }: { children: ReactNode }) {
  await requireInvestorDataPage('/investor/financials')
  return children
}
