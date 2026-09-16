'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'

import type { PublicPortalNavigationItem } from '@/server/portal/public-queries'

type Message = { role: 'user' | 'assistant'; content: string }
type PublicConnectLinksProps = { navigation: PublicPortalNavigationItem[] }

export function PublicConnectLinks({ navigation }: PublicConnectLinksProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Halo, saya Halo Nuzul. Ada yang bisa saya bantu mengenai Nuzultrip?' },
  ])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [handoffUrl, setHandoffUrl] = useState<string | null>(null)
  const hasOfficialLinks = navigation.some((item) => item.location === 'social')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = input.trim()
    if (!content || pending || handoffUrl) return

    const nextMessages = [...messages, { role: 'user' as const, content }]
    setMessages(nextMessages)
    setInput('')
    setError(null)
    setPending(true)

    try {
      const response = await fetch('/api/public/halo-nuzul', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.slice(-24) }),
      })
      const payload = (await response.json()) as { reply?: string; error?: string; handoffUrl?: string | null; handoff?: boolean }
      if (!response.ok || !payload.reply) throw new Error(payload.error || 'Jawaban belum tersedia.')
      setMessages((current) => [...current, { role: 'assistant', content: payload.reply! }])
      if (payload.handoff && payload.handoffUrl) setHandoffUrl(payload.handoffUrl)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Halo Nuzul sedang tidak dapat menjawab.')
    } finally {
      setPending(false)
    }
  }

  return (
    <details className="group fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6" data-has-official-links={hasOfficialLinks ? 'true' : 'false'}>
      <summary className="bg-primary text-primary-foreground shadow-lg shadow-black/10 inline-flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="relative flex size-2.5" aria-hidden="true"><span className="bg-primary-foreground/40 absolute inline-flex size-full animate-ping rounded-full" /><span className="bg-primary-foreground relative inline-flex size-2.5 rounded-full" /></span>
        Chat Halo Nuzul
        <span className="text-base leading-none transition-transform group-open:rotate-45" aria-hidden="true">+</span>
      </summary>

      <div className="border-border bg-surface absolute right-0 bottom-[calc(100%+0.75rem)] flex h-[min(34rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl shadow-black/15">
        <div className="border-border border-b px-4 py-3">
          <p className="text-fg text-sm font-semibold">Halo Nuzul</p>
          <p className="text-fg-muted mt-0.5 text-xs">Informasi profesional seputar Nuzultrip</p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <p className={`${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-fg'} max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 whitespace-pre-wrap`}>{message.content}</p>
            </div>
          ))}
          {pending ? <p className="text-fg-muted text-xs">Halo Nuzul sedang menyiapkan jawaban…</p> : null}
          {error ? <p className="text-danger text-xs">{error}</p> : null}
          {handoffUrl ? (
            <div className="border-border bg-surface-muted rounded-xl border p-3">
              <p className="text-fg text-sm font-medium">Lanjutkan melalui kanal resmi</p>
              <p className="text-fg-muted mt-1 text-xs leading-5">Untuk tindak lanjut berikutnya, buka kanal resmi Nuzultrip.</p>
              <Link href={handoffUrl} target="_blank" rel="noopener noreferrer" className="bg-primary text-primary-foreground mt-3 inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-semibold">Buka Linktree Nuzultrip</Link>
            </div>
          ) : null}
        </div>

        <form onSubmit={submit} className="border-border border-t p-3">
          <label htmlFor="halo-nuzul-message" className="sr-only">Tulis pertanyaan</label>
          <div className="flex gap-2">
            <input id="halo-nuzul-message" value={input} onChange={(event) => setInput(event.target.value)} disabled={pending || Boolean(handoffUrl)} maxLength={2000} placeholder={handoffUrl ? 'Percakapan diarahkan ke kanal resmi' : 'Tulis pertanyaan…'} className="border-border bg-canvas text-fg min-h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-60" />
            <button type="submit" disabled={pending || !input.trim() || Boolean(handoffUrl)} className="bg-primary text-primary-foreground min-h-11 rounded-xl px-4 text-sm font-semibold disabled:opacity-50">Kirim</button>
          </div>
        </form>
      </div>
    </details>
  )
}
