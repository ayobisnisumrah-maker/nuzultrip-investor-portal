import type { ReactNode } from 'react'

import { requireInvestorDataPage } from '@/server/auth/page-guards'

export default async function InvestorNotificationsLayout({ children }: { children: ReactNode }) {
  await requireInvestorDataPage('/investor/notifications')
  return children
}
