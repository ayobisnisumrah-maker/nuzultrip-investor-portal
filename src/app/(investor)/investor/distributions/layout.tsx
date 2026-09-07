import type { ReactNode } from 'react'

import { requireInvestorDataPage } from '@/server/auth/page-guards'

export default async function InvestorDistributionsLayout({ children }: { children: ReactNode }) {
  await requireInvestorDataPage('/investor/distributions')
  return children
}
