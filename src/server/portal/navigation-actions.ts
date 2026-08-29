'use server'

import { z } from 'zod'

import { ForbiddenError, NotFoundError } from '@/core/errors'
import { defineAction } from '@/server/auth/guards'

const navLocation = z.enum(['header', 'footer', 'legal', 'social'])

const navTarget = z.enum(['_self', '_blank'])

const hrefSchema = z
  .string()
  .trim()
  .min(1, 'URL atau path wajib diisi.')
  .max(2000, 'URL terlalu panjang.')

const optionalIconSchema = z
  .string()
  .trim()
  .max(100, 'Icon terlalu panjang.')
  .optional()
  .or(z.literal(''))

const createNavigationSchema = z.object({
  label: z.string().trim().min(1, 'Label wajib diisi.').max(120),
  href: hrefSchema,
  target: navTarget.default('_self'),
  location: navLocation,
  parentId: z.uuid().nullable().optional(),
  icon: optionalIconSchema,
})

const updateNavigationSchema = z.object({
  id: z.uuid(),
  label: z.string().trim().min(1, 'Label wajib diisi.').max(120),
  href: hrefSchema,
  target: navTarget,
  location: navLocation,
  parentId: z.uuid().nullable(),
  icon: optionalIconSchema,
})

const deleteNavigationSchema = z.object({
  id: z.uuid(),
})

const visibilitySchema = z.object({
  id: z.uuid(),
  isVisible: z.boolean(),
})

const reorderNavigationSchema = z.object({
  location: navLocation,
  ids: z.array(z.uuid()).min(1),
})

/**
 * Create navigation item.
 */
export const createPortalNavigation = defineAction({
  access: { permission: 'portal.manage_navigation' },
  input: createNavigationSchema,
  audit: {
    action: 'portal.navigation.create',
    entityType: 'portal_navigation',
  },
  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    if (input.parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('portal_navigation')
        .select('id, location')
        .eq('id', input.parentId)
        .maybeSingle()

      if (parentError || !parent) {
        throw new NotFoundError('Navigation parent')
      }

      if (parent.location !== input.location) {
        throw new Error('Parent navigation harus berada pada location yang sama.')
      }
    }

    const { data: last } = await supabase
      .from('portal_navigation')
      .select('position')
      .eq('location', input.location)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data, error } = await supabase
      .from('portal_navigation')
      .insert({
        label: input.label,
        href: input.href,
        target: input.target,
        location: input.location,
        parent_id: input.parentId ?? null,
        icon: input.icon || null,
        position: (last?.position ?? -1) + 1,
        is_visible: true,
      })
      .select('id, label, href, location, position')
      .single()

    if (error || !data) {
      throw new Error(`Gagal membuat navigation: ${error?.message ?? 'unknown error'}`)
    }

    audit({
      entityId: data.id,
      summary: `Navigation "${data.label}" dibuat pada ${data.location}.`,
    })

    return { navigationId: data.id }
  },
})

/**
 * Update navigation item.
 */
export const updatePortalNavigation = defineAction({
  access: { permission: 'portal.manage_navigation' },
  input: updateNavigationSchema,
  audit: {
    action: 'portal.navigation.update',
    entityType: 'portal_navigation',
  },
  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const { data: existing, error: existingError } = await supabase
      .from('portal_navigation')
      .select('id, label, location')
      .eq('id', input.id)
      .maybeSingle()

    if (existingError || !existing) {
      throw new NotFoundError('Navigation')
    }

    if (input.parentId === input.id) {
      throw new Error('Navigation tidak boleh menjadi parent dirinya sendiri.')
    }

    if (input.parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('portal_navigation')
        .select('id, location, parent_id')
        .eq('id', input.parentId)
        .maybeSingle()

      if (parentError || !parent) {
        throw new NotFoundError('Navigation parent')
      }

      if (parent.location !== input.location) {
        throw new Error('Parent navigation harus berada pada location yang sama.')
      }

      if (parent.parent_id) {
        throw new Error('Nested navigation lebih dari satu level belum didukung.')
      }
    }

    const { error } = await supabase
      .from('portal_navigation')
      .update({
        label: input.label,
        href: input.href,
        target: input.target,
        location: input.location,
        parent_id: input.parentId,
        icon: input.icon || null,
      })
      .eq('id', input.id)

    if (error) {
      throw new Error(`Gagal memperbarui navigation: ${error.message}`)
    }

    audit({
      entityId: input.id,
      summary: `Navigation "${existing.label}" diperbarui.`,
    })

    return { navigationId: input.id }
  },
})

/**
 * Toggle navigation visibility.
 */
export const setPortalNavigationVisibility = defineAction({
  access: { permission: 'portal.manage_navigation' },
  input: visibilitySchema,
  audit: {
    action: 'portal.navigation.visibility',
    entityType: 'portal_navigation',
  },
  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const { data, error } = await supabase
      .from('portal_navigation')
      .update({ is_visible: input.isVisible })
      .eq('id', input.id)
      .select('id, label')
      .maybeSingle()

    if (error || !data) {
      throw new NotFoundError('Navigation')
    }

    audit({
      entityId: data.id,
      summary: `Navigation "${data.label}" ${input.isVisible ? 'ditampilkan' : 'disembunyikan'}.`,
    })

    return { navigationId: data.id }
  },
})

/**
 * Delete navigation.
 */
export const deletePortalNavigation = defineAction({
  access: { permission: 'portal.manage_navigation' },
  input: deleteNavigationSchema,
  audit: {
    action: 'portal.navigation.delete',
    entityType: 'portal_navigation',
  },
  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const { data: existing, error: existingError } = await supabase
      .from('portal_navigation')
      .select('id, label')
      .eq('id', input.id)
      .maybeSingle()

    if (existingError || !existing) {
      throw new NotFoundError('Navigation')
    }

    const { data: children } = await supabase
      .from('portal_navigation')
      .select('id')
      .eq('parent_id', input.id)
      .limit(1)

    if (children && children.length > 0) {
      throw new Error(
        'Navigation masih memiliki submenu. Pindahkan atau hapus submenu terlebih dahulu.',
      )
    }

    const { error } = await supabase.from('portal_navigation').delete().eq('id', input.id)

    if (error) {
      throw new Error(`Gagal menghapus navigation: ${error.message}`)
    }

    audit({
      entityId: existing.id,
      summary: `Navigation "${existing.label}" dihapus.`,
    })

    return { navigationId: existing.id }
  },
})

/**
 * Reorder navigation items within one location.
 */
export const reorderPortalNavigation = defineAction({
  access: { permission: 'portal.manage_navigation' },
  input: reorderNavigationSchema,
  audit: {
    action: 'portal.navigation.reorder',
    entityType: 'portal_navigation',
  },
  handler: async ({ principal, input, supabase, audit }) => {
    if (principal.kind !== 'admin') {
      throw new ForbiddenError('Admin principal required.')
    }

    const uniqueIds = [...new Set(input.ids)]

    if (uniqueIds.length !== input.ids.length) {
      throw new Error('Daftar navigation mengandung ID duplikat.')
    }

    const { data: rows, error: rowsError } = await supabase
      .from('portal_navigation')
      .select('id, label, location')
      .in('id', uniqueIds)

    if (rowsError || !rows || rows.length !== uniqueIds.length) {
      throw new Error('Sebagian navigation tidak ditemukan.')
    }

    if (rows.some((row) => row.location !== input.location)) {
      throw new Error('Semua navigation harus berada pada location yang sama.')
    }

    for (const [position, id] of uniqueIds.entries()) {
      const { error } = await supabase.from('portal_navigation').update({ position }).eq('id', id)

      if (error) {
        throw new Error(`Gagal mengurutkan navigation: ${error.message}`)
      }
    }

    audit({
      summary: `Urutan navigation pada ${input.location} diperbarui.`,
    })

    return { count: uniqueIds.length }
  },
})
