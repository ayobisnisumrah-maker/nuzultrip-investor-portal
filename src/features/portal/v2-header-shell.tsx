'use client'

import { useEffect, useState, type ReactNode } from 'react'

export function V2HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      id="site-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-black/[0.06] py-3 shadow-[0_2px_16px_rgba(0,0,0,0.05)]'
          : 'bg-transparent py-4 sm:py-5'
      }`}
    >
      {children}
    </header>
  )
}
