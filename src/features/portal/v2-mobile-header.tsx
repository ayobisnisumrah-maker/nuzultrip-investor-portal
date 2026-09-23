/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'

type MobileNavItem = { id: string; label: string; href: string }
type MobileAction = { label: string; href: string }

export function V2MobileHeader({ items, logoSrc, primaryAction, loginAction }: { items: MobileNavItem[]; logoSrc: string; primaryAction: MobileAction; loginAction: MobileAction }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)}
    window.addEventListener('keydown',onKeyDown)
    return()=>{document.body.style.overflow='';window.removeEventListener('keydown',onKeyDown)}
  },[open])

  return <>
    <button id="mobile-menu-toggle" type="button" onClick={()=>setOpen(!open)} className="lg:hidden p-2 -mr-1 rounded-lg text-white hover:bg-white/10 transition-colors focus-visible:outline-none" aria-label={open?'Tutup menu':'Buka menu'} aria-expanded={open}>
      {open?<X size={22}/>:<Menu size={22}/>}
    </button>
    {open?<div id="mobile-nav-overlay" className="lg:hidden fixed inset-0 top-[56px] bg-[#111822]/98 backdrop-blur-2xl z-40 px-6 py-6 flex flex-col justify-between border-t border-white/10 overflow-y-auto animate-in fade-in duration-200">
      <div className="flex flex-col gap-3.5">
        {items.slice(0,7).map(item=><Link key={item.id} href={item.href} onClick={()=>setOpen(false)} className="text-[17px] font-semibold text-white py-2.5 border-b border-white/10 flex items-center justify-between"><span>{item.label}</span><ArrowRight size={15} className="text-emerald-400"/></Link>)}
      </div>
      <div className="pt-6 pb-4 flex flex-col gap-3">
        <Link href={primaryAction.href} onClick={()=>setOpen(false)} className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-[#0d151d] font-bold text-center flex items-center justify-center gap-2 active:scale-98 transition-all shadow-md"><span>{primaryAction.label}</span><ArrowRight size={16}/></Link>
        <Link href={loginAction.href} onClick={()=>setOpen(false)} className="w-full py-3 px-5 rounded-xl border border-white/20 text-white font-medium text-center hover:bg-white/10 transition-all">{loginAction.label}</Link>
      </div>
    </div>:null}
  </>
}
