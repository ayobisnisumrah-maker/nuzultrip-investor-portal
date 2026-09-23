'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, Download } from 'lucide-react'

type HeroProps = {
  id: string
  eyebrow: string
  titleLines: string[]
  description: string
  primary: { label: string; href: string }
  secondary: { label: string; href: string }
  tags: string[]
}

function Atmosphere({ scrollY }: { scrollY: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number | null>(null)
  const lastScrollY = useRef(scrollY)
  const scrollVelocity = useRef(0)

  useEffect(() => {
    const delta = scrollY - lastScrollY.current
    lastScrollY.current = scrollY
    scrollVelocity.current = Math.max(-20, Math.min(20, delta))
  }, [scrollY])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)
    const resize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)
    const colors = ['rgba(5, 150, 105, ', 'rgba(16, 185, 129, ', 'rgba(52, 211, 153, ', 'rgba(71, 85, 105, ']
    const particles = Array.from({ length: Math.min(Math.floor(width / 32), 36) }, (_, i) => ({
      x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - .5) * .45,
      baseVy: (Math.random() - .5) * .4, radius: Math.random() * 2 + 1,
      alpha: Math.random() * .4 + .25, pulseSpeed: Math.random() * .02 + .01,
      pulsePhase: Math.random() * Math.PI * 2, color: colors[i % colors.length]!,
    }))
    const render = () => {
      ctx.clearRect(0, 0, width, height)
      const velocityBonus = scrollVelocity.current * .05
      scrollVelocity.current *= .94
      for (let i=0;i<particles.length;i++) for (let j=i+1;j<particles.length;j++) {
        const a=particles[i]!, b=particles[j]!, dx=a.x-b.x, dy=a.y-b.y, dist=Math.hypot(dx,dy)
        if (dist < 110) { ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(16, 185, 129, ${(1-dist/110)*.15})`;ctx.lineWidth=.75;ctx.stroke() }
      }
      for (const p of particles) {
        p.pulsePhase += p.pulseSpeed
        const alpha=Math.max(.12,p.alpha+Math.sin(p.pulsePhase)*.15)
        p.x+=p.vx;p.y+=p.baseVy-velocityBonus
        if(p.x<0)p.x=width;if(p.x>width)p.x=0;if(p.y<0)p.y=height;if(p.y>height)p.y=0
        ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fillStyle=`${p.color}${alpha})`;ctx.fill()
      }
      frameRef.current=requestAnimationFrame(render)
    }
    render()
    return()=>{window.removeEventListener('resize',resize);if(frameRef.current)cancelAnimationFrame(frameRef.current)}
  },[])

  const progress=Math.min(Math.max(scrollY/700,0),1), arcY=scrollY*.28, arcScale=1+progress*.1
  return <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
    <div className="absolute inset-0 transition-opacity duration-300" style={{background:'radial-gradient(ellipse 120% 90% at 50% 10%, #FFFFFF 0%, #F6F8F7 50%, #EDF2EF 100%)'}}/>
    <div className="absolute w-[800px] h-[500px] -top-[120px] left-1/2 -translate-x-1/2 rounded-full blur-[130px] will-change-transform" style={{opacity:Math.max(.3,1-progress*.6),transform:`translate3d(-50%, ${arcY*.4}px, 0) scale(${1+progress*.15})`,background:'radial-gradient(50% 50% at 50% 50%, rgba(16, 185, 129, 0.18) 0%, rgba(52, 211, 153, 0.09) 45%, transparent 100%)'}}/>
    <canvas ref={canvasRef} className="absolute inset-0 z-[1] will-change-transform" style={{opacity:Math.max(.4,1-progress*.6),transform:`translate3d(0, ${-scrollY*.12}px, 0)`}}/>
    <div className="absolute left-1/2 -translate-x-1/2 w-[1300px] h-[650px] bottom-[-220px] sm:bottom-[-180px] z-[2] will-change-transform" style={{transform:`translate3d(-50%, ${arcY}px, 0) scale(${arcScale})`,opacity:Math.max(.35,1-progress*.7)}}>
      <svg viewBox="0 0 1300 650" className="w-full h-full overflow-visible" fill="none"><defs><linearGradient id="light-arc-grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#059669" stopOpacity="0"/><stop offset="20%" stopColor="#059669" stopOpacity=".4"/><stop offset="50%" stopColor="#10b981" stopOpacity=".9"/><stop offset="80%" stopColor="#059669" stopOpacity=".4"/><stop offset="100%" stopColor="#059669" stopOpacity="0"/></linearGradient><linearGradient id="light-arc-core" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" stopOpacity="0"/><stop offset="30%" stopColor="#34d399" stopOpacity=".6"/><stop offset="50%" stopColor="#059669" stopOpacity="1"/><stop offset="70%" stopColor="#34d399" stopOpacity=".6"/><stop offset="100%" stopColor="#10b981" stopOpacity="0"/></linearGradient><filter id="light-arc-glow"><feGaussianBlur stdDeviation="16"/></filter></defs><ellipse cx="650" cy="480" rx="520" ry="220" stroke="#10b981" strokeWidth="32" opacity=".12" filter="url(#light-arc-glow)"/><g style={{transformOrigin:'650px 480px',transform:`rotate(${scrollY*.035}deg)`}}><ellipse cx="650" cy="480" rx="540" ry="230" stroke="url(#light-arc-grad)" strokeWidth="1.5" strokeDasharray="10 8 4 8" opacity=".65"/></g><g style={{transformOrigin:'650px 480px',transform:`rotate(${-scrollY*.025}deg)`}}><path d="M 120 500 Q 650 220 1180 500" stroke="url(#light-arc-grad)" strokeWidth="10" opacity=".3" filter="url(#light-arc-glow)"/><path d="M 120 500 Q 650 220 1180 500" stroke="url(#light-arc-core)" strokeWidth="2.2" strokeLinecap="round"/></g></svg>
    </div>
    <div className="absolute bottom-0 inset-x-0 h-[180px] z-[1]" style={{maskImage:'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 60%, transparent 100%)',perspective:'600px'}}><div className="w-full h-[360px] absolute bottom-0 left-0" style={{backgroundImage:'linear-gradient(to right, rgba(16,185,129,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,.08) 1px, transparent 1px)',backgroundSize:'40px 40px',backgroundPosition:`0px ${(scrollY*.35)%40}px`,transform:'rotateX(68deg) translateY(50px)',transformOrigin:'bottom center'}}/></div>
    <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-[#FFFFFF] via-[#FFFFFF]/80 to-transparent z-[3]"/>
  </div>
}

export function V2Hero({ id, eyebrow, titleLines, description, primary, secondary }: HeroProps) {
  const [visible,setVisible]=useState(false),[scrollY,setScrollY]=useState(0)
  useEffect(()=>{const t=setTimeout(()=>setVisible(true),80);return()=>clearTimeout(t)},[])
  useEffect(()=>{let ticking=false;const onScroll=()=>{if(!ticking){requestAnimationFrame(()=>{setScrollY(window.scrollY);ticking=false});ticking=true}};window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll)},[])
  const entrance=visible?'entrance visible':'entrance'
  const heading={transform:`translate3d(0, ${scrollY*.14}px, 0)`,opacity:Math.max(0,1-scrollY/650),transition:'transform 0.05s linear'}
  const subtitle={transform:`translate3d(0, ${scrollY*.1}px, 0)`,opacity:Math.max(0,1-scrollY/550),transition:'transform 0.05s linear'}
  const buttons={transform:`translate3d(0, ${scrollY*.06}px, 0)`,opacity:Math.max(0,1-scrollY/480),transition:'transform 0.05s linear'}
  const metrics=[['40%','Alokasi Equity'],['50 Unit','Ketersediaan'],['Rp 100 Jt','Nilai per Unit'],['Bulanan','Bagi Hasil'],['4 Negara','Jaringan Mitra'],['1.000+','Jamaah / Tahun']]
  return <section id={id} className="relative min-h-[100dvh] flex flex-col justify-center items-center overflow-hidden bg-[#FAFBF9] text-[#0f172a] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
    <Atmosphere scrollY={scrollY}/>
    <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center my-auto space-y-6 sm:space-y-7">
      <div className={`${entrance} stagger-1 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/90 border border-emerald-200/80 text-emerald-800 text-[11px] sm:text-[12px] font-bold tracking-[0.16em] uppercase shadow-xs`} style={heading}><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"/><span>{eyebrow}</span></div>
      <h1 className={`${entrance} stagger-2 text-[32px] sm:text-[48px] lg:text-[62px] font-extrabold text-[#0f172a] tracking-tight leading-[1.08] max-w-4xl text-balance`} style={heading}>{titleLines.map((line,i)=>i===titleLines.length-1?<span key={line} className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent"> {line}</span>:<span key={line}>{line} </span>)}</h1>
      {description?<p className={`${entrance} stagger-3 text-[15px] sm:text-[17px] text-[#475569] max-w-2xl leading-relaxed text-balance`} style={subtitle}>{description}</p>:null}
      <div className={`${entrance} stagger-4 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto pt-2`} style={buttons}><Link href={primary.href} className="w-full sm:w-auto px-8 py-3.5 sm:py-4 rounded-full font-bold text-sm sm:text-base text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-98 transition-all duration-200 shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2.5"><span>{primary.label}</span><ArrowRight size={17}/></Link><Link href={secondary.href} className="w-full sm:w-auto px-7 py-3.5 sm:py-4 rounded-full font-semibold text-sm sm:text-base text-[#1e293b] bg-white/90 hover:bg-white border border-slate-200/90 hover:border-slate-300 active:scale-98 transition-all duration-200 shadow-xs flex items-center justify-center gap-2.5"><Download size={16} className="text-emerald-600"/><span>{secondary.label}</span></Link></div>
      <div className={`${entrance} stagger-5 w-full max-w-4xl pt-6 sm:pt-8 border-t border-black/[0.08] mt-4 sm:mt-6`} style={{transform:`translate3d(0, ${scrollY*.03}px, 0)`,opacity:Math.max(0,1-scrollY/420),transition:'transform 0.05s linear'}}><div className="text-[10.5px] sm:text-[11.5px] font-bold text-emerald-800 uppercase tracking-[0.18em] mb-3.5 text-center">Sorotan Ekosistem Investasi</div><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">{metrics.map(([value,label])=><div key={label} className="py-3 px-2 sm:px-3 rounded-xl bg-white/80 backdrop-blur-xs border border-black/[0.08] hover:border-emerald-500/40 hover:shadow-xs transition-all flex flex-col items-center justify-center text-center"><span className="text-[17px] sm:text-[19px] font-extrabold text-[#0f172a] tracking-tight leading-none mb-1">{value}</span><span className="text-[11px] text-[#64748b] font-medium leading-tight">{label}</span></div>)}</div></div>
      <div className="flex flex-col items-center gap-1 pt-2 pointer-events-none select-none transition-opacity duration-300" style={{opacity:Math.max(0,1-scrollY/90)}} aria-hidden="true"><span className="text-[10px] tracking-[0.2em] uppercase font-bold text-slate-400">Scroll Eksplorasi</span><ChevronDown size={14} className="text-emerald-600 animate-bounce"/></div>
    </div>
  </section>
}
