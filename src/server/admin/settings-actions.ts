'use server'

import { z } from 'zod'
import { defineAction } from '@/server/auth/guards'
import { getEmailSettings } from '@/server/settings/email'
import { getServerSupabase } from '@/server/supabase/server'

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
