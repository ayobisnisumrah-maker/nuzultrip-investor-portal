import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const RETENTION_HOURS = 72
const BATCH_SIZE = 50
const WORKER_LABEL = 'Rejected investor retention worker'

type Candidate = {
  id: string
  reference_code: string
  rejected_at: string
  ktp_storage_bucket: string | null
  ktp_storage_path: string | null
}

type AuditChanges = Record<string, unknown>

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

async function writeAudit(
  admin: SupabaseClient,
  action: string,
  candidate: Pick<Candidate, 'id' | 'reference_code' | 'rejected_at'>,
  summary: string,
  changes: AuditChanges,
) {
  const { error } = await admin.from('audit_logs').insert({
    actor_id: null,
    actor_type: 'system',
    actor_label: WORKER_LABEL,
    action,
    entity_type: 'investor',
    entity_id: candidate.id,
    summary,
    changes: {
      referenceCode: candidate.reference_code,
      rejectedAt: candidate.rejected_at,
      retentionHours: RETENTION_HOURS,
      ...changes,
    },
  })
  if (error) throw new Error(`audit:${action}:${error.message}`)
}

async function findBlockers(admin: SupabaseClient, investorId: string): Promise<string[]> {
  const { data, error } = await admin.rpc('rejected_investor_purge_blockers', {
    p_investor_id: investorId,
  })
  if (error) throw new Error(`blockers:${error.message}`)
  return Array.isArray(data) ? data.filter((value): value is string => typeof value === 'string') : []
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) return json(500, { error: 'worker_not_configured' })

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''

  // Service-role use is restricted to scheduled maintenance: validating the
  // Vault-backed scheduler token, checking purge blockers, deleting private KTP
  // storage/Auth identities, and writing durable audit evidence.
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authorized, error: authError } = await admin.rpc(
    'authorize_rejected_purge_scheduler',
    { p_token: token },
  )
  if (authError || authorized !== true) return json(401, { error: 'unauthorized' })

  const { data, error } = await admin.rpc('list_rejected_investor_purge_candidates', {
    p_limit: BATCH_SIZE,
  })
  if (error) return json(500, { error: 'candidate_query_failed' })

  const candidates = (data ?? []) as Candidate[]
  let purged = 0
  let blocked = 0
  let failed = 0

  for (const candidate of candidates) {
    try {
      // Re-check immediately before destruction. This closes the gap between the
      // candidate query and any ownership/financial record created afterwards.
      const blockers = await findBlockers(admin, candidate.id)
      if (blockers.length > 0) {
        blocked += 1
        await writeAudit(
          admin,
          'investor.rejected_purge_blocked',
          candidate,
          'Rejected investor purge blocked by durable ownership or financial references.',
          { blockers },
        )
        continue
      }

      await writeAudit(
        admin,
        'investor.rejected_purge_started',
        candidate,
        'Rejected investor retention purge started.',
        {},
      )

      let documentDeleted = false
      if (candidate.ktp_storage_bucket && candidate.ktp_storage_path) {
        const { error: storageError } = await admin.storage
          .from(candidate.ktp_storage_bucket)
          .remove([candidate.ktp_storage_path])
        if (storageError) throw new Error(`storage:${storageError.message}`)
        documentDeleted = true
      }

      const { error: deleteError } = await admin.auth.admin.deleteUser(candidate.id)
      if (deleteError) throw new Error(`auth:${deleteError.message}`)

      // audit_logs.entity_id intentionally has no FK to investors, so this
      // tombstone survives the cascading deletion without retaining candidate PII.
      await writeAudit(
        admin,
        'investor.rejected_purged',
        candidate,
        'Rejected investor data purged after the retention window.',
        { purgedAt: new Date().toISOString(), documentDeleted },
      )
      purged += 1
    } catch (cause) {
      failed += 1
      try {
        await writeAudit(
          admin,
          'investor.rejected_purge_failed',
          candidate,
          'Rejected investor purge failed and requires review.',
          { errorClass: cause instanceof Error ? cause.message.split(':', 1)[0] : 'unknown' },
        )
      } catch {
        // The HTTP summary still reports failure if even audit persistence fails.
      }
    }
  }

  return json(200, {
    scanned: candidates.length,
    purged,
    blocked,
    failed,
    retentionHours: RETENTION_HOURS,
  })
})
