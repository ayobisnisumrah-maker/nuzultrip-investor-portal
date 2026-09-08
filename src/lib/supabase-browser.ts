'use client'

// Compatibility bridge for older imports. Browser code must share the same
// Supabase client and Realtime socket as the application-wide provider.
export { getBrowserSupabase } from '@/lib/supabase/browser'
