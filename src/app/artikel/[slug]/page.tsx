import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublishedPortalArticle } from '@/server/portal/public-queries'

type Props = { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getPublishedPortalArticle('article', slug)
  if (!article) return { title: 'Artikel tidak ditemukan', robots: { index: false, follow: false } }
  return { title: article.title, description: article.description || undefined, openGraph: { title: article.title, description: article.description || undefined, type: 'article' } }
}
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = await getPublishedPortalArticle('article', slug)
  if (!article) notFound()
  const paragraphs = article.body.split(/\n\s*\n/).map((v) => v.trim()).filter(Boolean)
  return <main className="min-h-screen bg-black text-white"><article className="mx-auto max-w-3xl px-6 py-20 sm:py-28"><Link href="/#artikel" className="text-sm text-white/60 hover:text-white">← Kembali ke Artikel & Berita</Link><div className="mt-12 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Artikel Nuzultrip{article.date ? ` · ${article.date}` : ''}</div><h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{article.title}</h1>{article.description ? <p className="mt-6 text-lg leading-8 text-white/65">{article.description}</p> : null}<div className="mt-12 space-y-6 text-[17px] leading-8 text-white/78">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></article></main>
}
