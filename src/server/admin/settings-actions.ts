'use server'

import { z } from 'zod'
import { defineAction } from '@/server/auth/guards'
import { writeAudit } from '@/server/audit'
import { emitBrandRefresh } from '@/server/realtime/brand-refresh'
import { getBrandSettings } from '@/server/settings/brand'
import { getEmailSettings } from '@/server/settings/email'
import { getNotificationSoundSettings } from '@/server/settings/notification-sound'
import { getTypographySettings } from '@/server/settings/typography'
import { getServerSupabase } from '@/server/supabase/server'

const brandSettingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
})

const emailSettingsSchema = z.object({
  provider: z.enum(['supabase_auth', 'smtp', 'resend']),
  providerEnabled: z.boolean(),
  senderName: z.string().trim().min(1).max(120),
  senderAddress: z.email(),
  replyTo: z.email(),
  notificationsEnabled: z.boolean(),
  passwordReset: z.boolean(),
  investorInvitation: z.boolean(),
  securityAlert: z.boolean(),
})

const notificationSoundSchema = z.object({
  enabled: z.boolean(),
  path: z.string().trim().max(500).nullable(),
  volume: z.number().min(0).max(1),
})

const typographySettingsSchema = z.object({
  fontFamily: z.enum(['figtree', 'system', 'arial', 'georgia']),
  fontSizePercent: z.number().min(85).max(125),
  letterSpacingEm: z.number().min(-0.03).max(0.08),
  lineHeight: z.number().min(1.2).max(1.9),
})

export const getAdminBrandSettings = defineAction({
  access: { permission: 'settings.view' },
  handler: async () => {
    return await getBrandSettings()
  },
})

export const updateAdminBrandSettings = defineAction({
  access: { permission: 'settings.update' },
  input: brandSettingsSchema,
  handler: async ({ input, principal }) => {
    const supabase = await getServerSupabase()
    const before = await getBrandSettings()
    const { error } = await supabase.from('site_settings').upsert(
      {
        key: 'brand.name',
        value: { name: input.name },
        description: 'Nama aplikasi yang digunakan pada judul browser dan identitas global sistem.',
        is_public: true,
        updated_by: principal.kind === 'anonymous' ? null : principal.userId,
      },
      { onConflict: 'key' },
    )

    if (error) throw new Error(`Gagal menyimpan nama aplikasi: ${error.message}`)

    if (principal.kind !== 'anonymous') {
      await writeAudit(principal, {
        action: 'settings.brand_name_updated',
        entityType: 'site_setting',
        entityId: null,
        summary: 'Nama aplikasi global diperbarui dari Pengaturan.',
        changes: { name: { before: before.name, after: input.name } },
      })
    }

    await emitBrandRefresh()
    return { updated: true }
  },
})

export const getAdminEmailSettings = defineAction({
  access: { permission: 'settings.view' },
  handler: async () => {
    return await getEmailSettings()
  },
})

export const updateAdminEmailSettings = defineAction({
  access: { permission: 'settings.update' },
  input: emailSettingsSchema,
  handler: async ({ input, principal }) => {
    const supabase = await getServerSupabase()

    const settings = [
      {
        key: 'email.provider',
        value: {
          type: input.provider,
          enabled: input.providerEnabled,
        },
        description: 'Provider email autentikasi dan notifikasi aplikasi.',
        is_public: false,
      },
      {
        key: 'email.sender',
        value: {
          name: input.senderName,
          address: input.senderAddress,
          reply_to: input.replyTo,
        },
        description: 'Identitas pengirim email aplikasi.',
        is_public: false,
      },
      {
        key: 'email.notifications',
        value: {
          enabled: input.notificationsEnabled,
          password_reset: input.passwordReset,
          investor_invitation: input.investorInvitation,
          security_alert: input.securityAlert,
        },
        description: 'Pengaturan notifikasi email aplikasi.',
        is_public: false,
      },
    ]

    const { error } = await supabase.from('site_settings').upsert(
      settings.map((setting) => ({
        ...setting,
        updated_by: principal.kind === 'anonymous' ? null : principal.userId,
      })),
      {
        onConflict: 'key',
      },
    )

    if (error) {
      throw new Error(`Gagal menyimpan konfigurasi email: ${error.message}`)
    }

    return {
      updated: true,
    }
  },
})

export const loadAdminEmailSettings = defineAction({
  access: { permission: 'settings.view' },
  handler: async () => {
    return await getEmailSettings()
  },
})

export const getAdminNotificationSoundSettings = defineAction({
  access: { permission: 'settings.view' },
  handler: async () => {
    return await getNotificationSoundSettings()
  },
})

export const updateAdminNotificationSoundSettings = defineAction({
  access: { permission: 'settings.update' },
  input: notificationSoundSchema,
  handler: async ({ input, principal }) => {
    const supabase = await getServerSupabase()
    const { error } = await supabase.from('site_settings').upsert(
      {
        key: 'notification.sound',
        value: {
          enabled: input.enabled,
          bucket: 'notification-sounds',
          path: input.path,
          volume: input.volume,
        },
        description: 'Global in-app notification sound configuration.',
        is_public: true,
        updated_by: principal.kind === 'anonymous' ? null : principal.userId,
      },
      { onConflict: 'key' },
    )

    if (error) throw new Error(`Gagal menyimpan suara notifikasi: ${error.message}`)
    return { updated: true }
  },
})

export const getAdminTypographySettings = defineAction({
  access: { permission: 'settings.view' },
  handler: async () => {
    return await getTypographySettings()
  },
})

export const updateAdminTypographySettings = defineAction({
  access: { permission: 'settings.update' },
  input: typographySettingsSchema,
  handler: async ({ input, principal }) => {
    const supabase = await getServerSupabase()
    const { error } = await supabase.from('site_settings').upsert(
      {
        key: 'appearance.typography',
        value: {
          font_family: input.fontFamily,
          font_size_percent: input.fontSizePercent,
          letter_spacing_em: input.letterSpacingEm,
          line_height: input.lineHeight,
        },
        description: 'Global typography configuration for public portal, auth, Admin, Investor, and application UI.',
        is_public: true,
        updated_by: principal.kind === 'anonymous' ? null : principal.userId,
      },
      { onConflict: 'key' },
    )

    if (error) throw new Error(`Gagal menyimpan tipografi global: ${error.message}`)
    return { updated: true }
  },
})
