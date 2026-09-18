import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getServerEnv } from '@/lib/server-env'
import { adminWithPermission } from '@/server/auth/page-guards'
import { getPublishedHomePage } from '@/server/portal/public-queries'

const schema = z.object({
  type: z.enum(['article', 'news']),
  title: z.string().trim().min(5).max(180),
  prompt: z.string().trim().max(1500).default(''),
}).strict()

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
        const value = (part as { text: string }).text.trim()
        if (value) return value
      }
    }
  }
  return null
}

function slugify(value: string) {
  return value.toLocaleLowerCase('id-ID').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100)
}

export async function POST(request: Request) {
  const principal = await adminWithPermission('portal.update', '/admin/portal/articles')
  if (!principal) return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Input generator AI tidak valid.' }, { status: 400 })

  const env = getServerEnv()
  if (!env.OPENAI_API_KEY) return NextResponse.json({ error: 'Layanan AI belum dikonfigurasi.' }, { status: 503 })

  const home = await getPublishedHomePage().catch(() => null)
  const context = JSON.stringify((home?.sections ?? []).map((section) => ({ kind: section.section_kind, content: section.content }))).slice(0, 18000)
  const instructions = `Anda membantu Admin Nuzultrip menyiapkan DRAF ${parsed.data.type === 'news' ? 'berita' : 'artikel'} dalam Bahasa Indonesia. Tulis ringkasan 2-4 kalimat, faktual, profesional, natural, dan tidak promosi berlebihan. Gunakan konteks Nuzultrip hanya bila relevan dan hanya fakta yang tersedia. Jangan mengarang harga, izin, jadwal, statistik, kinerja, investasi, atau peristiwa terkini. Untuk BERITA, bila prompt tidak memberikan fakta/sumber kejadian yang cukup, nyatakan secara singkat bahwa fakta berita perlu dilengkapi Admin; jangan menciptakan kejadian. Keluarkan hanya ringkasan tanpa judul, markdown, label, atau komentar.\n\nKONTEKS PORTAL TERBIT:\n${context}`
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.HALO_NUZUL_MODEL,
      instructions,
      input: [{ role: 'user', content: `Judul: ${parsed.data.title}\nArahan Admin: ${parsed.data.prompt || 'Buat ringkasan yang relevan dengan judul.'}` }],
      max_output_tokens: 350,
      store: false,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) return NextResponse.json({ error: 'AI sedang tidak dapat membuat draf.' }, { status: 502 })
  const description = outputText(await response.json().catch(() => null))
  if (!description) return NextResponse.json({ error: 'AI belum menghasilkan draf.' }, { status: 502 })
  return NextResponse.json({ draft: { description, slug: slugify(parsed.data.title) } })
}
