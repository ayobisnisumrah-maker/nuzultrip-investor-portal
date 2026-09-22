'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, Download } from 'lucide-react'

import styles from './public-portal-exact.module.css'

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
  const velocity = useRef(0)
  const previous = useRef(scrollY)

  useEffect(() => {
    velocity.current = Math.max(-25, Math.min(25, scrollY - previous.current))
    previous.current = scrollY
  }, [scrollY])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let frame = 0
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)
    const colors = ['rgba(52, 211, 153, ', 'rgba(16, 185, 129, ', 'rgba(167, 243, 208, ', 'rgba(255, 255, 255, ']
    const particles = Array.from({ length: Math.min(Math.floor(width / 22), 48) }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      vx: (Math.random() - .5) * .4, baseVy: (Math.random() - .5) * .35,
      radius: Math.random() * 1.6 + 1.2, alpha: Math.random() * .45 + .25,
      pulseSpeed: Math.random() * .02 + .01, pulsePhase: Math.random() * Math.PI * 2,
      color: colors[Math.floor(Math.random() * colors.length)] ?? colors[0]!,
    }))
    const resize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)
    const render = () => {
      velocity.current *= .92
      const drift = velocity.current * .8
      ctx.clearRect(0, 0, width, height)
      const maxDistance = Math.min(130, width * .16)
      for (let i=0;i<particles.length;i++) for (let j=i+1;j<particles.length;j++) {
        const a=particles[i]!, b=particles[j]!, dx=a.x-b.x, dy=a.y-b.y, dist=Math.hypot(dx,dy)
        if (dist < maxDistance) {
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y)
          ctx.strokeStyle=`rgba(52, 211, 153, ${(1-dist/maxDistance)*.18*Math.min(a.alpha,b.alpha)})`; ctx.lineWidth=.85; ctx.stroke()
        }
      }
      for (const p of particles) {
        p.pulsePhase += p.pulseSpeed
        const alpha = Math.max(0,p.alpha+Math.sin(p.pulsePhase)*.15)
        p.x += p.vx; p.y += p.baseVy-drift
        if(p.x < -20)p.x=width+20;if(p.x>width+20)p.x=-20;if(p.y < -20)p.y=height+20;if(p.y>height+20)p.y=-20
        ctx.beginPath();ctx.arc(p.x,p.y,p.radius*2.8,0,Math.PI*2);ctx.fillStyle=`${p.color}${alpha*.25})`;ctx.fill()
        ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fillStyle=`${p.color}${alpha})`;ctx.fill()
      }
      frame=requestAnimationFrame(render)
    }
    frame=requestAnimationFrame(render)
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize)}
  },[])

  const progress=Math.min(Math.max(scrollY/700,0),1)
  const arcY=scrollY*.35, arcScale=1+progress*.12
  return <div className={styles.heroAtmosphere} aria-hidden="true">
    <div className={styles.heroBase}/>
    <div className={styles.heroAurora} style={{opacity:Math.max(.2,1-progress*.7),transform:`translate3d(-50%,${arcY*.5}px,0) scale(${1+progress*.2})`}}/>
    <canvas ref={canvasRef} style={{opacity:Math.max(.3,1-progress*.65),transform:`translate3d(0,${-scrollY*.15}px,0)`}}/>
    <div className={styles.heroOrbital} style={{transform:`translate3d(-50%,${arcY}px,0) scale(${arcScale})`,opacity:Math.max(.15,1-progress*.8)}}>
      <svg viewBox="0 0 1400 700" fill="none">
        <defs>
          <linearGradient id="portal-arc-outer" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" stopOpacity="0"/><stop offset="15%" stopColor="#10b981" stopOpacity=".2"/><stop offset="50%" stopColor="#34d399" stopOpacity=".85"/><stop offset="85%" stopColor="#10b981" stopOpacity=".2"/><stop offset="100%" stopColor="#10b981" stopOpacity="0"/></linearGradient>
          <linearGradient id="portal-arc-inner" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#34d399" stopOpacity="0"/><stop offset="25%" stopColor="#6ee7b7" stopOpacity=".4"/><stop offset="50%" stopColor="#fff" stopOpacity=".95"/><stop offset="75%" stopColor="#6ee7b7" stopOpacity=".4"/><stop offset="100%" stopColor="#34d399" stopOpacity="0"/></linearGradient>
          <filter id="portal-arc-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
          <filter id="portal-arc-mist" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="60"/></filter>
        </defs>
        <ellipse cx="700" cy="520" rx="560" ry="240" stroke="#10b981" strokeWidth="38" opacity=".2" filter="url(#portal-arc-mist)"/>
        <g style={{transformOrigin:'700px 520px',transform:`rotate(${scrollY*.04}deg)`}}><ellipse cx="700" cy="520" rx="580" ry="260" stroke="url(#portal-arc-outer)" strokeWidth="1.6" strokeDasharray="12 8 4 8" opacity=".75"/></g>
        <g style={{transformOrigin:'700px 520px',transform:`rotate(${-scrollY*.03}deg)`}}><path d="M 120 540 Q 700 240 1280 540" stroke="url(#portal-arc-outer)" strokeWidth="14" opacity=".45" filter="url(#portal-arc-glow)"/><path d="M 120 540 Q 700 240 1280 540" stroke="url(#portal-arc-inner)" strokeWidth="2.4" strokeLinecap="round"/></g>
      </svg>
    </div>
    <div className={styles.heroHorizon}><div style={{backgroundPosition:`0 ${(scrollY*.4)%40}px`}}/></div>
    <div className={styles.heroTopVignette}/>
  </div>
}
export function V2Hero({ id, eyebrow, titleLines, description, primary, secondary, tags }: HeroProps) {
  const [visible, setVisible] = useState(false)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const entrance = visible ? 'entrance visible' : 'entrance'
  const heading = { transform: `translate3d(0, ${scrollY * 0.16}px, 0)`, opacity: Math.max(0, 1 - scrollY / 680), transition: 'transform 0.05s linear' }
  const subtitle = { transform: `translate3d(0, ${scrollY * 0.22}px, 0)`, opacity: Math.max(0, 1 - scrollY / 560), transition: 'transform 0.05s linear' }
  const buttons = { transform: `translate3d(0, ${scrollY * 0.26}px, 0)`, opacity: Math.max(0, 1 - scrollY / 490), transition: 'transform 0.05s linear' }
  const partners = { transform: `translate3d(0, ${scrollY * 0.12}px, 0)`, transition: 'transform 0.05s linear' }
  const visibleTags = tags.slice(0, 8)

  return (
    <section id={id} className="hero relative overflow-hidden bg-[#08090f]">
      <Atmosphere scrollY={scrollY} />
      <div className="hero-content relative z-[2]">
        <div className="hero-spacer" />
        <span className={`${entrance} stagger-1 hero-overline text-emerald-400 will-change-transform`} style={heading}>{eyebrow}</span>
        <h1 className={`${entrance} stagger-2 hero-heading will-change-transform`} style={heading}>
          {titleLines.map((line, index) => index === titleLines.length - 1
            ? <span key={line} style={{ color: '#34d399', textShadow: '0 0 35px rgba(16, 185, 129, 0.45)' }}>{line}</span>
            : <span key={line}>{line}{' '}</span>)}
        </h1>
        {description ? <p className={`${entrance} stagger-3 hero-subtitle will-change-transform`} style={subtitle}>{description}</p> : null}
        <div className={`${entrance} stagger-4 hero-buttons will-change-transform`} style={buttons}>
          <Link href={primary.href} id="hero-cta-primary" className="group relative px-8 py-3.5 sm:py-4 rounded-full font-semibold text-sm sm:text-base text-white transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] shadow-lg flex items-center justify-center gap-2.5 cursor-pointer overflow-hidden" style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.45), 0 10px 40px rgba(16, 185, 129, 0.25)' }}>
            <span className="relative z-10">{primary.label}</span><ArrowRight className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 100%)' }} />
          </Link>
          <Link href={secondary.href} id="hero-cta-pitchdeck" className="px-7 py-3.5 sm:py-4 rounded-full font-medium text-sm sm:text-base text-[#f0f0f5] bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.14] hover:border-white/[0.25] backdrop-blur-md transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer">
            <Download className="w-4 h-4 text-emerald-400" /><span>{secondary.label}</span>
          </Link>
        </div>
        {visibleTags.length ? <div className={`${entrance} stagger-5 hero-partners will-change-transform`} style={partners}>
          <div className="hero-partners-label-row"><span className="hero-partners-label-line" aria-hidden="true" /><span className="hero-partners-label text-emerald-400">SOROTAN EKOSISTEM NUZULTRIP</span><span className="hero-partners-label-line" aria-hidden="true" /></div>
          <div className="hero-partners-track"><div className="animate-marquee-slow flex items-center gap-2">{[...visibleTags, ...visibleTags].map((tag, index) => <div key={`${tag}-${index}`} className="hero-chip"><span className="hero-chip-dot" style={{ background: '#10b981', boxShadow: '0 0 5px rgba(16, 185, 129, 0.8), 0 0 10px rgba(16, 185, 129, 0.35)' }} /><span>{tag}</span></div>)}</div></div>
        </div> : null}
        <div className="flex flex-col items-center gap-1.5 pt-4 transition-opacity duration-300 pointer-events-none select-none" style={{ opacity: Math.max(0, 1 - scrollY / 90) }} aria-hidden="true"><span className="text-[10px] tracking-[0.2em] uppercase font-bold text-white/40">Scroll Eksplorasi</span><ChevronDown size={14} className="text-emerald-400/80 animate-bounce" /></div>
      </div>
    </section>
  )
}
