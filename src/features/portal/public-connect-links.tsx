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
      const response = await fetch('/api/halo-nuzul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })
      const data = (await response.json()) as { reply?: string; handoffUrl?: string; error?: string }
      if (!response.ok) throw new Error(data.error || 'Halo Nuzul sedang tidak tersedia.')
      if (data.reply) setMessages((current) => [...current, { role: 'assistant', content: data.reply! }])
      if (data.handoffUrl) setHandoffUrl(data.handoffUrl)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Halo Nuzul sedang tidak tersedia.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-border/70 bg-card/70 p-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={message.role === 'user' ? 'ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground' : 'max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-foreground'}
          >
            <p className="text-sm leading-6">{message.content}</p>
          </div>
        ))}
        {pending ? <p className="text-sm text-muted-foreground">Halo Nuzul sedang menyiapkan jawaban…</p> : null}
      </div>

      {handoffUrl ? (
        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-sm leading-6 text-muted-foreground">Untuk bantuan lebih lanjut, silakan lanjutkan melalui kanal resmi Nuzultrip.</p>
          <Link className="mt-3 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground" href={handoffUrl} target="_blank" rel="noreferrer">
            Buka Linktree Nuzultrip
          </Link>
        </div>
      ) : (
        <form className="flex gap-2" onSubmit={submit}>
          <input
            className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Tanyakan tentang Nuzultrip…"
            aria-label="Pesan untuk Halo Nuzul"
          />
          <button className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50" type="submit" disabled={pending || !input.trim()}>
            Kirim
          </button>
        </form>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {hasOfficialLinks ? <p className="text-xs leading-5 text-muted-foreground">Informasi resmi dan kanal kontak Nuzultrip tetap tersedia pada tautan sosial portal.</p> : null}
    </div>
  )
}
