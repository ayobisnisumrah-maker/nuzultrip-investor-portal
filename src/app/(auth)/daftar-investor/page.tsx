import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Masuk Investor',
  robots: { index: false, follow: false },
}

export default function InvestorApplicationPage() {
  redirect('/masuk')
}
