import type { ReactNode } from 'react'

import { requireInvestorDataPage } from '@/server/auth/page-guards'

export default async function InvestorMessagesLayout({ children }: { children: ReactNode }) {
  await requireInvestorDataPage('/investor/messages')
  return children
}
