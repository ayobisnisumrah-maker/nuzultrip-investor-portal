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

async function hasAny(
  admin: SupabaseClient,
  table: string,
  column: string,
  investorId: string,
): Promise<boolean> {
  const { data, error } = await admin.from(table).select('id').eq(column, investorId).limit(1)
  if (error) throw new Error(`blocker:${table}:${error.message}`)
  return (data?.length ?? 0) > 0
}

async function findBlockers(admin: SupabaseClient, investorId: string): Promise<string[]> {
  const blockers: string[] = []

  if (await hasAny(admin, 'ownership_holdings', 'investor_id', investorId)) blockers.push('ownership_holdings')
  if (await hasAny(admin, 'ownership_inheritance', 'current_investor_id', investorId)) blockers.push('ownership_inheritance')
  if (await hasAny(admin, 'profit_distribution_allocations', 'investor_id', investorId)) blockers.push('profit_distribution_allocations')
  if (await hasAny(admin, 'profit_distribution_payment_proofs', 'investor_id', investorId)) blockers.push('profit_distribution_payment_proofs')

  const { data: transfers, error: transfersError } = await admin
    .from('ownership_transfers')
    .select('id')
    .or(`from_investor_id.eq.${investorId},to_investor_id.eq.${investorId}`)
    .limit(1)
  if (transfersError) throw new Error(`blocker:ownership_transfers:${transfersError.message}`)
  if ((transfers?.length ?? 0) > 0) blockers.push('ownership_transfers')

  return blockers
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

  const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString()
  const { data, error } = await admin
    .from('investors')
    .select('id,reference_code,rejected_at,ktp_storage_bucket,ktp_storage_path')
    .eq('status', 'rejected')
    .not('rejected_at', 'is', null)
    .lte('rejected_at', cutoff)
    .order('rejected_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) return json(500, { error: 'candidate_query_failed' })

  const candidates = (data ?? []) as Candidate[]
  let purged = 0
  let blocked = 0
  let failed = 0

  for (const candidate of candidates) {
    try {
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
        { cutoff },
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
