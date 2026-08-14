/**
 * Test harness for Row Level Security.
 *
 * These tests talk to a real Postgres with the real migrations applied, and
 * exercise policies exactly as PostgREST does: by switching to the `anon` or
 * `authenticated` role and setting `request.jwt.claims`, which is where
 * `auth.uid()` reads the subject from.
 *
 * The application layer is deliberately not in the picture. What is under test
 * is the last line of defence, on the assumption that everything above it may
 * have a bug (docs/SECURITY.md §1).
 */
import postgres, { type Sql, type TransactionSql } from 'postgres'

/** The connection handed to a callback inside `as()` or `cleanup()`. */
export type Tx = TransactionSql<Record<string, never>>

const CONNECTION_STRING =
  process.env['TEST_DATABASE_URL'] ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

let sql: Sql | null = null

/**
 * A privileged connection. `postgres` has BYPASSRLS, so this stands in for the
 * service role: it is how fixtures are created, and it is never used to assert
 * a policy outcome.
 */
export function db(): Sql {
  sql ??= postgres(CONNECTION_STRING, {
    max: 4,
    onnotice: () => {},
    // numeric/int8 arrive as strings; keeping them that way is exactly what the
    // application does, so assertions match production behaviour.
    types: {},
  })
  return sql
}

export async function closeDb(): Promise<void> {
  if (sql) {
    await sql.end({ timeout: 5 })
    sql = null
  }
}

export type Principal = { kind: 'anon' } | { kind: 'authenticated'; userId: string }

/**
 * Run a callback inside a transaction impersonating a principal, then roll the
 * transaction back so tests never leak state into one another.
 *
 * `set local role` is applied *after* the claims are set, because once the
 * session is `authenticated` it can no longer call `set_config` on some
 * configurations. Rolling back also restores the role.
 */
export async function as<T>(principal: Principal, run: (tx: Tx) => Promise<T>): Promise<T> {
  const client = db()
  let result!: T
  let rolledBack = false

  try {
    await client.begin(async (tx) => {
      if (principal.kind === 'anon') {
        await tx`select set_config('request.jwt.claims', ${JSON.stringify({ role: 'anon' })}, true)`
        await tx`set local role anon`
      } else {
        await tx`select set_config('request.jwt.claims', ${JSON.stringify({
          sub: principal.userId,
          role: 'authenticated',
        })}, true)`
        await tx`set local role authenticated`
      }

      result = await run(tx)

      // Always roll back: these are assertions, not fixtures.
      rolledBack = true
      throw new RollbackSignal()
    })
  } catch (error) {
    if (!(error instanceof RollbackSignal)) throw error
  }

  if (!rolledBack) throw new Error('Transaction did not run.')
  return result
}

class RollbackSignal extends Error {
  constructor() {
    super('rollback')
    this.name = 'RollbackSignal'
  }
}

/**
 * Assert that a statement is rejected by the database. Returns the error so the
 * caller can assert on the message or SQLSTATE.
 *
 * A policy that *hides* rows produces an empty result, not an error — that is
 * asserted with a row count instead. This helper is for policies that reject a
 * write, and for triggers that raise.
 */
/**
 * Run privileged cleanup with user triggers disabled.
 *
 * Published versions are immutable by trigger — that is the point — so test
 * teardown cannot remove them the ordinary way. `session_replication_role`
 * suspends user triggers for this connection only, and is restored afterwards.
 * It is never used by anything that asserts behaviour.
 */
export async function cleanup(run: (tx: Tx) => Promise<void>): Promise<void> {
  const client = db()
  await client.begin(async (tx) => {
    await tx`set local session_replication_role = replica`
    await run(tx)
  })
}

export async function expectRejected(
  run: () => Promise<unknown>,
): Promise<{ code?: string; message: string }> {
  try {
    await run()
  } catch (error) {
    const pgError = error as { code?: string; message?: string }
    return { code: pgError.code, message: pgError.message ?? String(error) }
  }
  throw new Error('Expected the statement to be rejected, but it succeeded.')
}
