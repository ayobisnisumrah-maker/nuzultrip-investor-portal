import 'server-only'

import { getServerSupabase } from '@/server/supabase/server'

export type EmailProviderType = 'supabase_auth' | 'smtp' | 'resend'

export type EmailProviderSettings = {
  type: EmailProviderType
  enabled: boolean
}

export type EmailSenderSettings = {
  name: string
  address: string
  reply_to: string
}

export type EmailNotificationSettings = {
  enabled: boolean
  password_reset: boolean
  investor_invitation: boolean
  security_alert: boolean
}

export type EmailSettings = {
  provider: EmailProviderSettings
  sender: EmailSenderSettings
  notifications: EmailNotificationSettings
}

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  provider: {
    type: 'supabase_auth',
    enabled: true,
  },
  sender: {
    name: 'Nuzultrip',
    address: 'halonuzul@gmail.com',
    reply_to: 'halonuzul@gmail.com',
  },
  notifications: {
    enabled: true,
    password_reset: true,
    investor_invitation: true,
    security_alert: true,
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readProvider(value: unknown): EmailProviderSettings {
  if (!isRecord(value)) return DEFAULT_EMAIL_SETTINGS.provider

  const type = value.type
  const enabled = value.enabled

  if (
    type !== 'supabase_auth' &&
    type !== 'smtp' &&
    type !== 'resend'
  ) {
    return DEFAULT_EMAIL_SETTINGS.provider
  }

  return {
    type,
    enabled: typeof enabled === 'boolean' ? enabled : true,
  }
}

function readSender(value: unknown): EmailSenderSettings {
  if (!isRecord(value)) return DEFAULT_EMAIL_SETTINGS.sender

  return {
    name:
      typeof value.name === 'string' && value.name.trim()
        ? value.name.trim()
        : DEFAULT_EMAIL_SETTINGS.sender.name,
    address:
      typeof value.address === 'string' && value.address.trim()
        ? value.address.trim()
        : DEFAULT_EMAIL_SETTINGS.sender.address,
    reply_to:
      typeof value.reply_to === 'string' && value.reply_to.trim()
        ? value.reply_to.trim()
        : DEFAULT_EMAIL_SETTINGS.sender.reply_to,
  }
}

function readNotifications(value: unknown): EmailNotificationSettings {
  if (!isRecord(value)) return DEFAULT_EMAIL_SETTINGS.notifications

  return {
    enabled:
      typeof value.enabled === 'boolean'
        ? value.enabled
        : DEFAULT_EMAIL_SETTINGS.notifications.enabled,
    password_reset:
      typeof value.password_reset === 'boolean'
        ? value.password_reset
        : DEFAULT_EMAIL_SETTINGS.notifications.password_reset,
    investor_invitation:
      typeof value.investor_invitation === 'boolean'
        ? value.investor_invitation
        : DEFAULT_EMAIL_SETTINGS.notifications.investor_invitation,
    security_alert:
      typeof value.security_alert === 'boolean'
        ? value.security_alert
        : DEFAULT_EMAIL_SETTINGS.notifications.security_alert,
  }
}

export async function getEmailSettings(): Promise<EmailSettings> {
  const supabase = await getServerSupabase()

  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['email.provider', 'email.sender', 'email.notifications'])

  if (error) {
    throw new Error(`Failed to load email settings: ${error.message}`)
  }

  const settings = new Map(
    (data ?? []).map((row) => [row.key, row.value] as const),
  )

  return {
    provider: readProvider(settings.get('email.provider')),
    sender: readSender(settings.get('email.sender')),
    notifications: readNotifications(settings.get('email.notifications')),
  }
}
