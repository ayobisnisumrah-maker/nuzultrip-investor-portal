import type { ReactNode } from 'react'

import { requireInvestorDataPage } from '@/server/auth/page-guards'

export default async function InvestorProfileLayout({ children }: { children: ReactNode }) {
  await requireInvestorDataPage('/investor/profile')
  return children
}
