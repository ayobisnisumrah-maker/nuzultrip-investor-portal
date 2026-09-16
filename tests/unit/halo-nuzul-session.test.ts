import { beforeEach, describe, expect, it } from 'vitest'
import {
  canAsk,
  freshSession,
  questionsRemaining,
  readHaloSession,
  recordQuestion,
  serializeHaloSession,
} from '@/server/halo-nuzul/session'

describe('Halo Nuzul signed session', () => {
  beforeEach(() => {
    process.env.AUDIT_IP_SALT = 'test-halo-session-secret'
  })

  it('round-trips a signed session without trusting browser JSON', () => {
    const session = recordQuestion(freshSession())
    expect(readHaloSession(serializeHaloSession(session))).toEqual(session)
  })

  it('rejects a forged cookie and starts a fresh session', () => {
    const forged = `${Buffer.from(JSON.stringify({ v: 1, questions: 10, exp: 4_102_444_800 })).toString('base64url')}.forged`
    const session = readHaloSession(forged)
    expect(session.questions).toBe(0)
    expect(canAsk(session)).toBe(true)
  })

  it('allows exactly ten accepted questions and blocks the eleventh', () => {
    let session = freshSession()
    for (let index = 0; index < 10; index += 1) session = recordQuestion(session)
    expect(session.questions).toBe(10)
    expect(questionsRemaining(session)).toBe(0)
    expect(canAsk(session)).toBe(false)
    expect(recordQuestion(session).questions).toBe(10)
  })
})
