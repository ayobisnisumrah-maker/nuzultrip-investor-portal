import 'server-only'

import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { getServiceRoleClient } from './service-client'

export const HALO_SESSION_COOKIE = 'halo_nuzul_session'
export const HALO_SESSION_MAX_AGE = 24 * 60 * 60

export type HaloReservation = {
  sessionId: string
  reservationId: string
  allowed: boolean
  questionsRemaining: number
  sessionExpiresAt: string
}

export function validHaloSessionId(value: string | undefined): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
}

export function newHaloSessionId(): string {
  return randomBytes(32).toString('base64url')
}

function hashHaloSessionId(sessionId: string): string {
  return createHash('sha256').update(sessionId, 'utf8').digest('hex')
}

export async function reserveHaloQuestion(candidateSessionId?: string): Promise<HaloReservation> {
  const sessionId = validHaloSessionId(candidateSessionId) ? candidateSessionId : newHaloSessionId()
  const sessionHash = hashHaloSessionId(sessionId)
  const reservationId = randomUUID()
  // Service role is required because anonymous clients must never be able to
  // inspect or burn another Halo session's product quota. Only the SHA-256
  // digest reaches persistence; the opaque browser token is never stored.
  const client = getServiceRoleClient()
  const { data, error } = await client.rpc('reserve_halo_nuzul_question', {
    p_session_id: sessionHash,
    p_reservation_id: reservationId,
    p_window_seconds: HALO_SESSION_MAX_AGE,
    p_reservation_seconds: 120,
  })
  if (error) throw new Error(`Halo quota reservation failed: ${error.message}`)
  const row = data?.[0]
  if (!row) throw new Error('Halo quota reservation returned no result.')
  return {
    sessionId,
    reservationId,
    allowed: row.allowed,
    questionsRemaining: row.questions_remaining,
    sessionExpiresAt: row.session_expires_at,
  }
}

export async function commitHaloQuestion(sessionId: string, reservationId: string) {
  const client = getServiceRoleClient()
  const { data, error } = await client.rpc('commit_halo_nuzul_question', {
    p_session_id: hashHaloSessionId(sessionId),
    p_reservation_id: reservationId,
  })
  if (error) throw new Error(`Halo quota commit failed: ${error.message}`)
  const row = data?.[0]
  if (!row?.committed) throw new Error('Halo quota reservation could not be committed.')
  return {
    questionsRemaining: row.questions_remaining,
    sessionExpiresAt: row.session_expires_at,
  }
}

export async function releaseHaloQuestion(sessionId: string, reservationId: string): Promise<void> {
  const client = getServiceRoleClient()
  const { error } = await client.rpc('release_halo_nuzul_question', {
    p_session_id: hashHaloSessionId(sessionId),
    p_reservation_id: reservationId,
  })
  if (error) throw new Error(`Halo quota release failed: ${error.message}`)
}
