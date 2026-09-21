'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Award, Clock, FileText, Scale, SearchCheck, ShieldCheck } from 'lucide-react'
import styles from './public-portal-exact.module.css'

type Step={number:string;title:string;description:string;duration:string;output:string}
const stepIcons=[FileText,SearchCheck,Scale,Award]
export function V2Process({eyebrow,title,description,steps,primary,secondary}:{eyebrow:string;title:string;description:string;steps:Step[];primary:{label:string;href:string};secondary:{label:string;href:string}}){
 const [active,setActive]=useState(0);const lines=title.split('|')
 return <section className={styles.processV2} id="proses"><div className={styles.processV2Glow}/><div className={styles.shell}><header className={styles.processV2Header}><div className={styles.eyebrowLight}>{eyebrow}</div><h2>{lines.map((line,i)=><span key={line+i}>{line}{i<lines.length-1?<br/>:null}</span>)}</h2><p>{description}</p></header><div className={styles.processV2Grid}>{steps.map((step,index)=>{const StepIcon=stepIcons[index]??FileText;return <div role="button" tabIndex={0} key={step.number} onClick={()=>setActive(index)} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setActive(index)}}} className={index===active?styles.processV2CardActive:styles.processV2Card}><span className={styles.processV2Beam}/><div><div className={styles.processV2Top}><div><strong>{step.number}</strong><i/></div><span className={styles.processV2Icon}><StepIcon size={20}/></span></div><h3>{step.title}</h3><p>{step.description}</p></div><footer><div><span><Clock size={13}/> Estimasi</span><b>{step.duration}</b></div><div><span><ShieldCheck size={13}/> Output</span><em>{step.output}</em></div></footer></div>})}</div><div className={styles.processV2Actions}><Link href={primary.href} className={styles.processV2Primary}>{primary.label} <ArrowRight size={15}/></Link><Link href={secondary.href} className={styles.processV2Secondary}>{secondary.label}</Link></div></div></section>
}
