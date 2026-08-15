'use server'

import { z } from 'zod'

import { canPublicationTransition, type PublicationStatus } from '@/core/documents/publication'
import { ConflictError, ForbiddenError, NotFoundError } from '@/core/errors'
import { defineAction, requirePermission } from '@/server/auth/guards'

const documentIdSchema = z.object({ documentId: z.string().uuid() })
const grantSchema = z.object({
  documentId: z.string().uuid(),
  investorId: z.string().uuid(),
  note: z.string().trim().max(1000).optional(),
})
const revokeSchema = z.object({ grantId: z.string().uuid() })

async function transitionDocument(
  documentId: string,
  target: PublicationStatus,
  supabase: Parameters<Parameters<typeof defineAction>[0]['handler']>[0]['supabase'],
) {
  const { data: document, error: readError } = await supabase
    .from('documents')
    .select('id, title, status, current_version_id')
    .eq('id', documentId)
    .maybeSingle()
  if (readError) throw new ConflictError(`Failed to read document: ${readError.message}`, 'Dokumen tidak dapat dibaca saat ini.')
  if (!document) throw new NotFoundError('Dokumen')

  const current = document.status as PublicationStatus
  if (!canPublicationTransition(current, target)) {
    throw new ForbiddenError(`Invalid document publication transition: ${current} -> ${target}.`, { from: current, to: target })
  }

  if (target === 'published') {
    if (!document.current_version_id) {
      throw new ConflictError('Document has no current version.', 'Dokumen belum memiliki versi yang dapat diterbitkan.')
    }
    const { data: version, error: versionReadError } = await supabase
      .from('document_versions')
      .select('id, status')
      .eq('id', document.current_version_id)
      .eq('document_id', document.id)
      .maybeSingle()
    if (versionReadError) throw new ConflictError(`Failed to read document version: ${versionReadError.message}`, 'Versi dokumen tidak dapat dibaca saat ini.')
    if (!version || version.status !== 'approved') {
      throw new ConflictError('Current document version is not approved.', 'Versi aktif dokumen harus disetujui sebelum diterbitkan.')
    }
    const { error: versionError } = await supabase.from('document_versions').update({ status: 'published' }).eq('id', version.id)
    if (versionError) throw new ConflictError(`Failed to publish document version: ${versionError.message}`, 'Versi dokumen tidak dapat diterbitkan saat ini.')
  } else if (target !== 'archived' && document.current_version_id) {
    // The container and its current version share the same review lifecycle.
    // Published versions are never changed here; archiving is container-only.
    const { error: versionError } = await supabase
      .from('document_versions')
      .update({ status: target })
      .eq('id', document.current_version_id)
      .eq('document_id', document.id)
    if (versionError) throw new ConflictError(`Failed to update document version: ${versionError.message}`, 'Versi dokumen tidak dapat diperbarui saat ini.')
  }

  const update = target === 'published'
    ? { status: target, published_version_id: document.current_version_id }
    : { status: target }
  const { data: updated, error } = await supabase.from('documents').update(update).eq('id', document.id).select('id, title, status').maybeSingle()
  if (error) throw new ConflictError(`Failed to update document: ${error.message}`, 'Status dokumen tidak dapat diperbarui saat ini.')
  if (!updated) throw new NotFoundError('Dokumen')
  return { documentId: updated.id, title: updated.title, previousStatus: current, status: updated.status as PublicationStatus }
}

function defineTransitionAction(target: PublicationStatus, permission: 'documents.review' | 'documents.approve' | 'documents.publish' | 'documents.archive', action: string, summary: (title: string) => string) {
  return defineAction({
    access: { permission }, input: documentIdSchema, audit: { action, entityType: 'document' },
    handler: async ({ input, supabase, audit }) => {
      const result = await transitionDocument(input.documentId, target, supabase)
      audit({ entityId: result.documentId, summary: summary(result.title), changes: { status: { before: result.previousStatus, after: result.status } } })
      return result
    },
  })
}

export const submitDocumentForReview = defineTransitionAction('review', 'documents.review', 'document.review_started', (title) => `Dokumen ${title} dikirim untuk peninjauan.`)
export const approveDocument = defineTransitionAction('approved', 'documents.approve', 'document.approved', (title) => `Dokumen ${title} disetujui.`)
export const publishDocument = defineTransitionAction('published', 'documents.publish', 'document.published', (title) => `Dokumen ${title} diterbitkan.`)
export const archiveDocument = defineTransitionAction('archived', 'documents.archive', 'document.archived', (title) => `Dokumen ${title} diarsipkan.`)

export const grantDocumentAccess = defineAction({
  access: { permission: 'investor_documents.assign' }, input: grantSchema,
  audit: { action: 'document.access_granted', entityType: 'document' },
  handler: async ({ input, supabase, audit, principal }) => {
    requirePermission(principal, 'documents.view')
    requirePermission(principal, 'investors.view')
    const { data: document } = await supabase.from('documents').select('id, title, visibility').eq('id', input.documentId).maybeSingle()
    if (!document) throw new NotFoundError('Dokumen')
    if (document.visibility !== 'restricted') throw new ConflictError('Document is not restricted.', 'Akses individual hanya berlaku untuk dokumen dengan visibilitas investor terpilih.')
    const { data: investor } = await supabase.from('investors').select('id, reference_code').eq('id', input.investorId).maybeSingle()
    if (!investor) throw new NotFoundError('Investor')
    const { data: existing, error: existingError } = await supabase.from('document_access_grants').select('id').eq('document_id', document.id).eq('investor_id', investor.id).is('revoked_at', null).maybeSingle()
    if (existingError) throw new ConflictError(`Failed to read document access grant: ${existingError.message}`, 'Akses dokumen tidak dapat diperiksa saat ini.')
    if (existing) throw new ConflictError('Live document grant already exists.', 'Investor sudah memiliki akses ke dokumen ini.')
    const { data: grant, error } = await supabase.from('document_access_grants').insert({ document_id: document.id, investor_id: investor.id, note: input.note || null }).select('id, granted_at').maybeSingle()
    if (error || !grant) throw new ConflictError(`Failed to grant document access: ${error?.message ?? 'no row'}`, 'Akses dokumen tidak dapat diberikan saat ini.')
    audit({ entityId: document.id, summary: `Akses dokumen ${document.title} diberikan kepada investor ${investor.reference_code}.`, changes: { access: { before: null, after: { investorId: investor.id, grantId: grant.id } } } })
    return { grantId: grant.id, grantedAt: grant.granted_at }
  },
})

export const revokeDocumentAccess = defineAction({
  access: { permission: 'investor_documents.revoke' }, input: revokeSchema,
  audit: { action: 'document.access_revoked', entityType: 'document' },
  handler: async ({ input, supabase, audit, principal }) => {
    requirePermission(principal, 'investor_documents.view')
    const { data: grant, error: readError } = await supabase.from('document_access_grants').select('id, document_id, investor_id, revoked_at, documents(title), investors(reference_code)').eq('id', input.grantId).maybeSingle()
    if (readError) throw new ConflictError(`Failed to read document access grant: ${readError.message}`, 'Akses dokumen tidak dapat dibaca saat ini.')
    if (!grant) throw new NotFoundError('Akses dokumen')
    if (grant.revoked_at) throw new ConflictError('Document grant is already revoked.', 'Akses dokumen sudah dicabut.')
    const { error } = await supabase.from('document_access_grants').update({ revoked_at: new Date().toISOString() }).eq('id', grant.id).is('revoked_at', null)
    if (error) throw new ConflictError(`Failed to revoke document access: ${error.message}`, 'Akses dokumen tidak dapat dicabut saat ini.')
    const document = Array.isArray(grant.documents) ? grant.documents[0] : grant.documents
    const investor = Array.isArray(grant.investors) ? grant.investors[0] : grant.investors
    audit({ entityId: grant.document_id, summary: `Akses dokumen ${document?.title ?? grant.document_id} dicabut dari investor ${investor?.reference_code ?? grant.investor_id}.`, changes: { access: { before: { investorId: grant.investor_id, grantId: grant.id }, after: null } } })
    return { grantId: grant.id, documentId: grant.document_id }
  },
})
