import { createHmac, timingSafeEqual } from 'node:crypto'

const MAX_QUESTIONS = 10
const SESSION_TTL_SECONDS = 24 * 60 * 60

type HaloSession = {
  v: 1
  questions: number
  exp: number
}

function secret(): string {
  const value = process.env.AUDIT_IP_SALT
  if (!value) throw new Error('AUDIT_IP_SALT is required for Halo Nuzul sessions')
  return value
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function readHaloSession(cookieValue: string | undefined): HaloSession {
  if (!cookieValue) return freshSession()
  const [payload, signature] = cookieValue.split('.')
  if (!payload || !signature) return freshSession()

  const expected = sign(payload)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return freshSession()

  try {
    const parsed = JSON.parse(decode(payload)) as Partial<HaloSession>
    if (parsed.v !== 1 || !Number.isInteger(parsed.questions) || typeof parsed.exp !== 'number') return freshSession()
    if ((parsed.questions ?? 0) < 0 || (parsed.questions ?? 0) > MAX_QUESTIONS || parsed.exp <= Math.floor(Date.now() / 1000)) return freshSession()
    return parsed as HaloSession
  } catch {
    return freshSession()
  }
}

export function freshSession(): HaloSession {
  return { v: 1, questions: 0, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }
}

export function canAsk(session: HaloSession): boolean {
  return session.questions < MAX_QUESTIONS
}

export function recordQuestion(session: HaloSession): HaloSession {
  if (!canAsk(session)) return session
  return { ...session, questions: session.questions + 1 }
}

export function questionsRemaining(session: HaloSession): number {
  return Math.max(0, MAX_QUESTIONS - session.questions)
}

export function serializeHaloSession(session: HaloSession): string {
  const payload = encode(JSON.stringify(session))
  return `${payload}.${sign(payload)}`
}

export const HALO_SESSION_COOKIE = 'halo_nuzul_session'
export const HALO_SESSION_MAX_AGE = SESSION_TTL_SECONDS
