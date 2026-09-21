'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './public-portal-exact.module.css'

type Step={number:string;title:string;description:string;duration:string;output:string}
export function V2Process({eyebrow,title,description,steps,primary,secondary}:{eyebrow:string;title:string;description:string;steps:Step[];primary:{label:string;href:string};secondary:{label:string;href:string}}){
 const [active,setActive]=useState(0);const lines=title.split('|')
 return <section className={styles.processV2} id="proses"><div className={styles.processV2Glow}/><div className={styles.shell}><header className={styles.processV2Header}><div className={styles.eyebrowLight}>{eyebrow}</div><h2>{lines.map((line,i)=><span key={line+i}>{line}{i<lines.length-1?<br/>:null}</span>)}</h2><p>{description}</p></header><div className={styles.processV2Grid}>{steps.map((step,index)=><button type="button" key={step.number} onClick={()=>setActive(index)} className={index===active?styles.processV2CardActive:styles.processV2Card}><span className={styles.processV2Beam}/><div><div className={styles.processV2Top}><div><strong>{step.number}</strong><i/></div><span className={styles.processV2Icon}>◇</span></div><h3>{step.title}</h3><p>{step.description}</p></div><footer><div><span>◷&nbsp; Estimasi</span><b>{step.duration}</b></div><div><span>◇&nbsp; Output</span><em>{step.output}</em></div></footer></button>)}</div><div className={styles.processV2Actions}><Link href={primary.href} className={styles.processV2Primary}>{primary.label} →</Link><Link href={secondary.href} className={styles.processV2Secondary}>{secondary.label}</Link></div></div></section>
}
