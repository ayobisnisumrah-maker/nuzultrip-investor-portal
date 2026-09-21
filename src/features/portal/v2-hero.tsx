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

  useEffect(() => { velocity.current = Math.max(-25, Math.min(25, scrollY - previous.current)); previous.current = scrollY }, [scrollY])
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const ctx = context
    let frame = 0
    let width = 0
    let height = 0
    const particles = Array.from({ length: Math.min(Math.floor(window.innerWidth / 22), 48) }, () => ({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .35, r: Math.random() * 1.6 + 1.2, a: Math.random() * .45 + .25, p: Math.random() * Math.PI * 2, s: Math.random() * .02 + .01 }))
    const resize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const draw = () => {
      velocity.current *= .92; const drift = velocity.current * .8; ctx.clearRect(0, 0, width, height)
      const max = Math.min(130, width * .16)
      for (let i=0;i<particles.length;i++) for(let j=i+1;j<particles.length;j++){const first=particles[i],second=particles[j];if(!first||!second)continue;const dx=first.x-second.x,dy=first.y-second.y,d=Math.hypot(dx,dy);if(d<max){ctx.beginPath();ctx.moveTo(first.x,first.y);ctx.lineTo(second.x,second.y);ctx.strokeStyle=`rgba(52,211,153,${(1-d/max)*.08})`;ctx.lineWidth=.85;ctx.stroke()}}
      for(const p of particles){p.p+=p.s;p.x+=p.vx;p.y+=p.vy-drift;if(p.x< -20)p.x=width+20;if(p.x>width+20)p.x=-20;if(p.y< -20)p.y=height+20;if(p.y>height+20)p.y=-20;const a=Math.max(0,p.a+Math.sin(p.p)*.15);ctx.beginPath();ctx.arc(p.x,p.y,p.r*2.8,0,Math.PI*2);ctx.fillStyle=`rgba(52,211,153,${a*.18})`;ctx.fill();ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(167,243,208,${a})`;ctx.fill()}
      frame=requestAnimationFrame(draw)
    }
    frame=requestAnimationFrame(draw)
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize)}
  },[])
  const progress=Math.min(Math.max(scrollY/700,0),1)
  return <div className={styles.heroAtmosphere} aria-hidden="true"><div className={styles.heroAurora} style={{opacity:Math.max(.2,1-progress*.7),transform:`translate3d(-50%,${scrollY*.175}px,0) scale(${1+progress*.2})`}}/><canvas ref={canvasRef} style={{opacity:Math.max(.3,1-progress*.65),transform:`translate3d(0,${-scrollY*.15}px,0)`}}/><div className={styles.heroArcs} style={{transform:`translate3d(-50%,${scrollY*.35}px,0) scale(${1+progress*.12})`,opacity:Math.max(.15,1-progress*.8)}}><div className={styles.heroArcOuter} style={{transform:`rotate(${scrollY*.04}deg)`}}/><div className={styles.heroArcInner} style={{transform:`rotate(${-scrollY*.03}deg)`}}/></div><div className={styles.heroHorizon} style={{backgroundPosition:`0 ${(scrollY*.4)%40}px`}}/></div>
}

export function V2Hero({ id, eyebrow, titleLines, description, primary, secondary, tags }: HeroProps) {
  const [visible,setVisible]=useState(false),[scrollY,setScrollY]=useState(0)
  useEffect(()=>{const timer=setTimeout(()=>setVisible(true),80);return()=>clearTimeout(timer)},[])
  useEffect(()=>{let ticking=false;const onScroll=()=>{if(!ticking){requestAnimationFrame(()=>{setScrollY(window.scrollY);ticking=false});ticking=true}};window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll)},[])
  const heading={transform:`translate3d(0,${scrollY*.16}px,0)`,opacity:Math.max(0,1-scrollY/680)}
  const subtitle={transform:`translate3d(0,${scrollY*.22}px,0)`,opacity:Math.max(0,1-scrollY/560)}
  const buttons={transform:`translate3d(0,${scrollY*.26}px,0)`,opacity:Math.max(0,1-scrollY/490)}
  const doubled=[...tags.slice(0,8),...tags.slice(0,8)]
  return <section className={styles.hero} id={id}><Atmosphere scrollY={scrollY}/><div className={styles.heroInner}><div className={styles.heroCopy}>
    <div className={`${styles.heroEntrance} ${visible?styles.heroEntranceVisible:''} ${styles.eyebrow}`} style={heading}>{eyebrow}</div>
    <h1 className={`${styles.heroEntrance} ${visible?styles.heroEntranceVisible:''}`} style={heading}>{titleLines.map((line,index)=><span key={line} className={index===titleLines.length-1?styles.heroAccent:undefined}>{line}</span>)}</h1>
    {description?<p className={`${styles.heroEntrance} ${visible?styles.heroEntranceVisible:''}`} style={subtitle}>{description}</p>:null}
    <div className={`${styles.heroButtons} ${styles.heroEntrance} ${visible?styles.heroEntranceVisible:''}`} style={buttons}><Link href={primary.href} className={styles.lightButton}>{primary.label} <span>→</span></Link><Link href={secondary.href} className={styles.textButton}><span aria-hidden="true">↓</span>{secondary.label}</Link></div>
    {doubled.length?<div className={styles.heroPartners} style={{transform:`translate3d(0,${scrollY*.12}px,0)`}}><div className={styles.heroPartnersLabel}><i/><span>SOROTAN EKOSISTEM NUZULTRIP</span><i/></div><div className={styles.heroTags}><div className={styles.heroMarquee}>{doubled.map((tag,index)=><span key={`${tag}-${index}`}>{tag}</span>)}</div></div></div>:null}
    <div className={styles.heroScrollCue} style={{opacity:Math.max(0,1-scrollY/90)}}><span>Scroll Eksplorasi</span><b>⌄</b></div>
  </div></div></section>
}
