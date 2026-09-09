import type { ReactNode } from 'react'

import { requireInvestorDataPage } from '@/server/auth/page-guards'

export default async function InvestorDocumentsLayout({ children }: { children: ReactNode }) {
  await requireInvestorDataPage('/investor/documents')
  return children
}
