import { createClient } from '@supabase/supabase-js'

export function getSupabaseConfig(env) {
  const url = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Supabase browser configuration is missing')
  }

  return { url, anonKey }
}

const config = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  ? getSupabaseConfig(import.meta.env)
  : null

export const isSupabaseConfigured = Boolean(config)
export const supabase = config
  ? createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
