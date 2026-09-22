'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Award, Clock, FileText, Scale, SearchCheck, ShieldCheck } from 'lucide-react'

type Step = { number: string; title: string; description: string; duration: string; output: string }
const stepIcons = [FileText, SearchCheck, Scale, Award]

export function V2Process({ eyebrow, title, description, steps, primary, secondary }: { eyebrow: string; title: string; description: string; steps: Step[]; primary: { label: string; href: string }; secondary: { label: string; href: string } }) {
  const [activeStep, setActiveStep] = useState(0)
  const lines = title.split('|')

  return (
    <section id="proses" className="bg-[#090a10] text-white py-16 sm:py-24 lg:py-28 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/[0.04] rounded-full blur-[140px] pointer-events-none" aria-hidden="true" />
      <div className="w-full mx-auto px-5 sm:px-8 md:px-12 lg:px-16 max-w-[1320px]">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 flex flex-col items-center px-4">
          <div className="text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.16em] mb-4 sm:mb-5 select-none text-white/70">{eyebrow}</div>
          <h2 className="font-h2 font-bold text-white leading-[1.14] tracking-tight mb-3 sm:mb-4">{lines.map((line,index)=><span key={line+index}>{line}{index<lines.length-1?<br/>:null}</span>)}</h2>
          <p className="text-[15px] sm:text-[16px] text-white/70 leading-[1.6] max-w-lg">{description}</p>
        </div>
        <div className="relative mb-12 sm:mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 relative z-10">
            {steps.map((step,index)=>{
              const selected=activeStep===index
              const Icon=stepIcons[index]??FileText
              return <div key={step.number} role="button" tabIndex={0} onClick={()=>setActiveStep(index)} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setActiveStep(index)}}} className={`group relative rounded-2xl p-5 sm:p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between border overflow-hidden ${selected?'bg-white/[0.07] border-emerald-400/70 shadow-[0_8px_30px_rgba(16,185,129,0.18)] -translate-y-1':'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-emerald-400/50 hover:shadow-[0_0_28px_rgba(16,185,129,0.18)] hover:-translate-y-1.5'}`}>
                <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"/>
                <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/0 group-hover:bg-emerald-500/10 rounded-full blur-xl transition-colors duration-500 pointer-events-none"/>
                <div><div className="flex items-center justify-between mb-5"><div className="flex items-center gap-2.5"><span className={`text-[24px] sm:text-[26px] font-extrabold tracking-tight transition-colors ${selected?'text-emerald-400':'text-white/50 group-hover:text-emerald-300'}`}>{step.number}</span><div className="relative flex items-center justify-center w-3 h-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-0 group-hover:opacity-90 duration-700"/><span className={`relative inline-flex rounded-full h-1.5 w-1.5 transition-all ${selected?'bg-emerald-400 ring-2 ring-emerald-400/40':'bg-white/30 group-hover:bg-emerald-400 group-hover:ring-2 group-hover:ring-emerald-400/50'}`}/></div></div><div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 relative ${selected?'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 ring-2 ring-emerald-400/20':'bg-white/[0.05] border border-white/10 text-white/50 group-hover:text-emerald-300 group-hover:bg-emerald-500/15 group-hover:border-emerald-400/40 group-hover:ring-4 group-hover:ring-emerald-400/20 group-hover:scale-105'}`}><Icon size={20} className="text-emerald-400"/></div></div>
                <h3 className="text-[17px] font-bold text-white tracking-tight mb-2.5 leading-snug">{step.title}</h3><p className="text-[13.5px] text-white/65 leading-relaxed mb-6">{step.description}</p></div>
                <div className="pt-4 border-t border-white/10 space-y-2"><div className="flex items-center justify-between text-xs text-white/50"><span className="flex items-center gap-1.5"><Clock size={12} className="text-emerald-400/80"/><span>Estimasi</span></span><span className="font-semibold text-white/80">{step.duration}</span></div><div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 text-white/50"><ShieldCheck size={12} className="text-emerald-400/80"/><span>Output</span></span><span className="font-medium text-emerald-300/90 truncate max-w-[150px]">{step.output}</span></div></div>
              </div>
            })}
          </div>
        </div>
        <div className="max-w-xl mx-auto text-center flex flex-col sm:flex-row items-center justify-center gap-3.5 px-4">
          <Link id="process-primary-cta" href={primary.href} className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all duration-200 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"><span>{primary.label}</span><ArrowRight size={16}/></Link>
          <Link id="process-secondary-cta" href={secondary.href} className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white font-medium text-sm transition-all duration-200 cursor-pointer text-center">{secondary.label}</Link>
        </div>
      </div>
    </section>
  )
}
