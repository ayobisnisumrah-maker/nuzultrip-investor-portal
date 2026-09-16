import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getServerEnv } from '@/lib/server-env'
import { getPublishedHomePage, getPublishedNavigation } from '@/server/portal/public-queries'

const requestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(2000) })).min(1).max(24),
})

function linktreeUrl(navigation: Awaited<ReturnType<typeof getPublishedNavigation>>) {
  const explicit = navigation.find((item) => item.location === 'social' && /linktree/i.test(`${item.label} ${item.href}`))
  return explicit?.href ?? null
}

function outputText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as { output_text?: unknown; output?: unknown }
  if (typeof record.output_text === 'string' && record.output_text.trim()) return record.output_text.trim()
  if (!Array.isArray(record.output)) return null
  for (const item of record.output) {
    if (!item || typeof item !== 'object') continue
    const content = (item as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if (part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string') {
        const text = (part as { text: string }).text.trim()
        if (text) return text
      }
    }
  }
  return null
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Pesan tidak valid.' }, { status: 400 })

  const userQuestions = parsed.data.messages.filter((message) => message.role === 'user').length
  const [home, navigation] = await Promise.all([getPublishedHomePage(), getPublishedNavigation()])
  const handoffUrl = linktreeUrl(navigation)

  if (userQuestions >= 10 && handoffUrl) {
    return NextResponse.json({
      reply: 'Terima kasih sudah berdiskusi cukup mendalam. Agar kebutuhan Anda dapat ditindaklanjuti melalui kanal resmi Nuzultrip, silakan lanjutkan melalui tautan berikut.',
      handoffUrl,
      handoff: true,
    })
  }

  const env = getServerEnv()
  if (!env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Layanan Halo Nuzul belum diaktifkan oleh administrator.' }, { status: 503 })
  }

  const knowledge = JSON.stringify({
    page: home?.page ? { title: home.page.title, seo: home.page.seo } : null,
    sections: home?.sections.map((section) => ({ kind: section.section_kind, content: section.content })) ?? [],
  }).slice(0, 30000)

  const instructions = `Anda adalah Halo Nuzul, asisten layanan profesional Nuzultrip. Jawab seperti staf customer/investor relations yang tenang, ringkas, sopan, dan memahami bisnis Nuzultrip. Gunakan hanya fakta yang tersedia pada konteks portal publik berikut. Jangan mengarang harga, legalitas, izin, imbal hasil, jadwal, atau janji investasi. Jika informasi tidak tersedia, katakan bahwa informasi tersebut perlu dikonfirmasi melalui kanal resmi. Jangan menawarkan atau menjanjikan keuntungan investasi dan jangan mendesak pengguna berinvestasi. Jangan secara proaktif membahas bahwa Anda AI atau model. Namun jika pengguna bertanya langsung apakah Anda manusia/AI/otomatis, jawab secara transparan bahwa Halo Nuzul adalah asisten digital otomatis Nuzultrip; jangan pernah mengaku sebagai manusia. Setelah sistem melakukan handoff, pengguna akan diarahkan ke kanal resmi.\n\nKONTEKS PORTAL PUBLIK:\n${knowledge}`

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.HALO_NUZUL_MODEL,
      instructions,
      input: parsed.data.messages,
      max_output_tokens: 500,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) return NextResponse.json({ error: 'Halo Nuzul sedang tidak dapat menjawab. Silakan coba lagi.' }, { status: 502 })
  const payload = await response.json()
  const reply = outputText(payload)
  if (!reply) return NextResponse.json({ error: 'Halo Nuzul belum menghasilkan jawaban.' }, { status: 502 })

  return NextResponse.json({ reply, handoffUrl: null, handoff: false })
}
