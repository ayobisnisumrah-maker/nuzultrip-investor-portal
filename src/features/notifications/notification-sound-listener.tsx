'use client'

import { useEffect, useMemo, useRef } from 'react'

import type { RealtimeEvent } from '@/core/realtime/events'
import { useRealtime } from '@/features/realtime/realtime-provider'

export function NotificationSoundListener({
  topics,
  role,
  enabled,
  soundUrl,
  volume,
}: {
  topics: readonly string[]
  role: 'admin' | 'investor'
  enabled: boolean
  soundUrl: string | null
  volume: number
}) {
  const realtime = useRealtime()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const unlockedRef = useRef(false)
  const recentEvents = useRef(new Map<string, number>())
  const topicKey = useMemo(() => topics.join('|'), [topics])

  useEffect(() => {
    if (!enabled || !soundUrl) return

    const audio = new Audio(soundUrl)
    audio.preload = 'auto'
    audio.volume = Math.min(1, Math.max(0, volume))
    audioRef.current = audio

    const unlock = async () => {
      if (unlockedRef.current) return
      try {
        audio.muted = true
        await audio.play()
        audio.pause()
        audio.currentTime = 0
        audio.muted = false
        unlockedRef.current = true
      } catch {
        // Browser autoplay restrictions can reject until a later interaction.
      }
    }

    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      audio.pause()
      audioRef.current = null
    }
  }, [enabled, soundUrl, volume])

  useEffect(() => {
    if (!enabled || !soundUrl) return

    function shouldPlay(event: RealtimeEvent) {
      if (event.kind === 'message.received') {
        return role === 'investor' ? event.actorType === 'admin' : event.actorType === 'investor'
      }

      if (event.kind === 'notification.created') return true
      if (role === 'admin' && event.kind === 'inquiry.received') return true
      return false
    }

    function handler(event: RealtimeEvent) {
      if (!shouldPlay(event)) return

      const key = `${event.kind}:${event.entityId ?? 'none'}:${event.occurredAt}`
      const now = Date.now()
      for (const [storedKey, at] of recentEvents.current) {
        if (now - at > 2_000) recentEvents.current.delete(storedKey)
      }
      if (recentEvents.current.has(key)) return
      recentEvents.current.set(key, now)

      const audio = audioRef.current
      if (!audio || !unlockedRef.current) return
      audio.currentTime = 0
      void audio.play().catch(() => undefined)
    }

    const unsubscribers = topics.map((topic) => realtime.subscribe(topic, handler))
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [enabled, realtime, role, soundUrl, topicKey, topics])

  return null
}
