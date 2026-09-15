'use server'

import { z } from 'zod'

import { defineAction } from '@/server/auth/guards'
import { getWhatsAppSettings } from '@/server/settings/whatsapp'
import { getServerSupabase } from '@/server/supabase/server'

const whatsappSettingsSchema = z
  .object({
    enabled: z.boolean(),
    senderPhone: z.string().trim().max(24),
    phoneNumberId: z.string().trim().max(120),
    investorInvitationEnabled: z.boolean(),
    templateName: z
      .string()
      .trim()
      .min(1, 'Nama template wajib diisi.')
      .max(512)
      .regex(/^[a-z0-9_]+$/, 'Nama template hanya boleh memakai huruf kecil, angka, dan underscore.'),
    languageCode: z.string().trim().min(2).max(20),
    preview: z.string().trim().min(10).max(2000),
  })
  .superRefine((input, context) => {
    if (!input.enabled) return

    if (!input.senderPhone) {
      context.addIssue({
        code: 'custom',
        path: ['senderPhone'],
        message: 'Nomor WhatsApp pengirim wajib diisi ketika WhatsApp diaktifkan.',
      })
    }

    if (!input.phoneNumberId) {
      context.addIssue({
        code: 'custom',
        path: ['phoneNumberId'],
        message: 'Phone Number ID wajib diisi ketika WhatsApp diaktifkan.',
      })
    }
  })

export const updateAdminWhatsAppSettings = defineAction({
  access: { permission: 'settings.update' },
  input: whatsappSettingsSchema,
  audit: {
    action: 'settings.whatsapp_updated',
    entityType: 'site_setting',
  },
  handler: async ({ input, principal, audit }) => {
    const supabase = await getServerSupabase()
    const before = await getWhatsAppSettings()

    const rows = [
      {
        key: 'whatsapp.provider',
        value: {
          enabled: input.enabled,
          sender_phone: input.senderPhone,
          phone_number_id: input.phoneNumberId,
        },
        description: 'Konfigurasi non-secret untuk WhatsApp Cloud API.',
        is_public: false,
      },
      {
        key: 'whatsapp.investor_invitation',
        value: {
          enabled: input.investorInvitationEnabled,
          template_name: input.templateName,
          language_code: input.languageCode,
          preview: input.preview,
        },
        description: 'Template WhatsApp untuk konfirmasi undangan investor.',
        is_public: false,
      },
    ]

    const { error } = await supabase.from('site_settings').upsert(
      rows.map((row) => ({
        ...row,
        updated_by: principal.kind === 'anonymous' ? null : principal.userId,
      })),
      { onConflict: 'key' },
    )

    if (error) throw new Error(`Gagal menyimpan konfigurasi WhatsApp: ${error.message}`)

    audit({
      summary: 'Konfigurasi WhatsApp diperbarui dari Pengaturan.',
      changes: {
        enabled: { before: before.enabled, after: input.enabled },
        senderPhone: { before: before.senderPhone, after: input.senderPhone },
        phoneNumberId: {
          before: before.phoneNumberId ? '[configured]' : '',
          after: input.phoneNumberId ? '[configured]' : '',
        },
        templateName: {
          before: before.investorInvitation.templateName,
          after: input.templateName,
        },
      },
    })

    return { updated: true }
  },
})
