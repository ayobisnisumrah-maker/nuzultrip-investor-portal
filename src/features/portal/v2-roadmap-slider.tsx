'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type RoadmapItem = { period:string; title:string; description:string; status:string; bullets:string[]; metricLabel:string; metricValue:string }

export function V2RoadmapSlider({ items }: { items: RoadmapItem[] }) {
  const phases=items.slice(0,5)
  const initial=Math.min(3,Math.max(phases.length-1,0))
  const [active,setActive]=useState(initial)
  const scrollRef=useRef<HTMLDivElement>(null)

  function scrollToIndex(index:number){
    const target=scrollRef.current?.children[index] as HTMLElement|undefined
    if(!target)return
    target.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'})
    setActive(index)
  }
  useEffect(()=>{const timer=window.setTimeout(()=>scrollToIndex(initial),250);return()=>window.clearTimeout(timer)},[initial])
  function handleScroll(){
    const container=scrollRef.current;if(!container)return
    const center=container.scrollLeft+container.clientWidth/2
    let closest=0,min=Infinity
    Array.from(container.children).forEach((child,index)=>{const el=child as HTMLElement;const d=Math.abs(el.offsetLeft+el.clientWidth/2-center);if(d<min){min=d;closest=index}})
    if(closest!==active)setActive(closest)
  }
  return <>
    <div className="flex items-center gap-3 shrink-0 absolute right-0 -top-[74px] max-md:static max-md:mb-6">
      <span className="text-xs font-bold text-[#666666] tracking-wider uppercase bg-black/[0.04] px-3 py-1.5 rounded-full border border-black/[0.06]">FASE {String(active+1).padStart(2,'0')} / {String(phases.length).padStart(2,'0')}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={()=>scrollToIndex(Math.max(0,active-1))} disabled={active===0} aria-label="Fase sebelumnya" className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${active===0?'border-black/[0.08] text-black/20 cursor-not-allowed':'border-black/20 text-[#111111] hover:bg-black hover:text-white hover:border-black shadow-xs cursor-pointer'}`}><ChevronLeft size={16}/></button>
        <button type="button" onClick={()=>scrollToIndex(Math.min(phases.length-1,active+1))} disabled={active===phases.length-1} aria-label="Fase berikutnya" className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${active===phases.length-1?'border-black/[0.08] text-black/20 cursor-not-allowed':'border-black/20 text-[#111111] hover:bg-black hover:text-white hover:border-black shadow-xs cursor-pointer'}`}><ChevronRight size={16}/></button>
      </div>
    </div>
    <div className="hidden sm:grid grid-cols-5 gap-2 mb-6 p-1.5 bg-white rounded-xl border border-black/[0.08] shadow-xs">
      {phases.map((phase,index)=>{const current=index===active;return <button key={index} type="button" onClick={()=>scrollToIndex(index)} className={`py-2 px-3 rounded-lg text-left transition-all cursor-pointer flex flex-col justify-center ${current?'bg-[#111111] text-white shadow-xs':'hover:bg-black/[0.03] text-[#666666]'}`}><div className="flex items-center justify-between text-[11px] font-bold"><span>FASE {String(index+1).padStart(2,'0')}</span>{index<3?<span className={current?'text-white/80':'text-emerald-600'}>✓</span>:index===3?<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>:null}</div><span className={`text-[12px] font-medium truncate mt-0.5 ${current?'text-white':'text-[#333333]'}`}>{phase.period}</span></button>})}
    </div>
    <div ref={scrollRef} onScroll={handleScroll} className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0" style={{scrollbarWidth:'none',msOverflowStyle:'none'}}>
      {phases.map((item,index)=>{const selected=index===active;const status=item.status|| (index<3?'Terlaksana':index===3?'Fase Aktif':'Rencana Mendatang');return <div key={index} onClick={()=>scrollToIndex(index)} className={`shrink-0 w-[290px] sm:w-[320px] lg:w-[340px] snap-center rounded-2xl p-6 border transition-all duration-300 flex flex-col justify-between cursor-pointer ${selected?'bg-white border-black/40 shadow-md ring-1 ring-black/10':'bg-white/80 border-black/[0.08] hover:border-black/20 hover:bg-white'}`}>
        <div><div className="flex items-center justify-between mb-3.5"><span className="text-[12px] font-extrabold text-[#111111] tracking-wider uppercase">FASE {String(index+1).padStart(2,'0')}</span><span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${index<3?'bg-emerald-50 border-emerald-200 text-emerald-700':index===3?'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold':'bg-black/[0.03] border-black/[0.06] text-[#777777]'}`}>{index===3?<span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping mr-1.5 align-middle"/>:null}{status}</span></div>
        <div className="text-[12px] font-semibold text-[#888888] mb-1.5">{item.period}</div><h3 className="text-[17px] sm:text-[18px] font-bold text-[#111111] leading-snug tracking-tight mb-2.5">{item.title}</h3><p className="text-[13.5px] text-[#555555] leading-relaxed mb-4">{item.description}</p>
        {item.bullets.length?<div className="space-y-1.5 pt-3 border-t border-black/[0.06]">{item.bullets.slice(0,4).map((point,p)=><div key={p} className="flex items-start gap-2 text-[12.5px] text-[#444444]"><span className="w-1.5 h-1.5 rounded-full bg-[#111111]/40 mt-1.5 shrink-0"/><span>{point}</span></div>)}</div>:null}</div>
        {(item.metricLabel||item.metricValue)?<div className="mt-5 pt-3 border-t border-black/[0.06] flex items-center justify-between"><span className="text-[11px] font-medium text-[#777777] uppercase tracking-wider">{item.metricLabel}</span><span className="text-[12.5px] font-bold text-[#111111]">{item.metricValue}</span></div>:null}
      </div>})}
    </div>
  </>
}
