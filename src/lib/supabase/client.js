import { createClient } from '@supabase/supabase-js'

export function getSupabaseConfig(env) {
  const url = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Supabase browser configuration is missing')
  }

  return { url, anonKey }
}

const { url, anonKey } = getSupabaseConfig(import.meta.env)

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
