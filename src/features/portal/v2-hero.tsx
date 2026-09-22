'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

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
  const [visible,setVisible]=useState(false),[scrollY,setScrollY]=useState(0)
  useEffect(()=>{const timer=setTimeout(()=>setVisible(true),80);return()=>clearTimeout(timer)},[])
  useEffect(()=>{let ticking=false;const onScroll=()=>{if(!ticking){requestAnimationFrame(()=>{setScrollY(window.scrollY);ticking=false});ticking=true}};window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll)},[])
  const heading={transform:`translate3d(0,${scrollY*.16}px,0)`,opacity:Math.max(0,1-scrollY/680)}
  const subtitle={transform:`translate3d(0,${scrollY*.22}px,0)`,opacity:Math.max(0,1-scrollY/560)}
  const buttons={transform:`translate3d(0,${scrollY*.26}px,0)`,opacity:Math.max(0,1-scrollY/490)}
  const visibleTags=tags.slice(0,8)
  return <section className={styles.hero} id={id}><Atmosphere scrollY={scrollY}/><div className={styles.heroInner}><div className={styles.heroCopy}>
    <div className={`${styles.heroEntrance} ${visible?styles.heroEntranceVisible:''} ${styles.eyebrow}`} style={heading}>{eyebrow}</div>
    <h1 className={`${styles.heroEntrance} ${visible?styles.heroEntranceVisible:''}`} style={heading}>{titleLines.map((line,index)=><span key={line} className={index===titleLines.length-1?styles.heroAccent:undefined}>{line}</span>)}</h1>
    {description?<p className={`${styles.heroEntrance} ${visible?styles.heroEntranceVisible:''}`} style={subtitle}>{description}</p>:null}
    <div className={`${styles.heroButtons} ${styles.heroEntrance} ${visible?styles.heroEntranceVisible:''}`} style={buttons}><Link href={primary.href} className={styles.lightButton}>{primary.label} <span>→</span></Link><Link href={secondary.href} className={styles.textButton}><span aria-hidden="true">↓</span>{secondary.label}</Link></div>
    {visibleTags.length?<div className={styles.heroPartners} style={{transform:`translate3d(0,${scrollY*.12}px,0)`}}><div className={styles.heroPartnersLabel}><i/><span>SOROTAN EKOSISTEM NUZULTRIP</span><i/></div><div className={styles.heroTags}><div className={styles.heroChipRow}>{[...visibleTags,...visibleTags].map((tag,index)=><span key={`${tag}-${index}`} className={styles.heroFeatureChip}>{tag}</span>)}</div></div></div>:null}
    <div className={styles.heroScrollCue} style={{opacity:Math.max(0,1-scrollY/90)}}><span>Scroll Eksplorasi</span><b>⌄</b></div>
  </div></div></section>
}
