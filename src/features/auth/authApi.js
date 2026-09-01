import { supabase } from '../../lib/supabase/client.js'

function authClient() {
  if (!supabase) throw new Error('Supabase browser configuration is missing')
  return supabase.auth
}

export const signUp = ({ email, password, displayName, timezone }) =>
  authClient().signUp({
    email,
    password,
    options: { data: { display_name: displayName, timezone } },
  })

export const signIn = ({ email, password }) =>
  authClient().signInWithPassword({ email, password })

export const requestPasswordReset = (email) =>
  authClient().resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

export const updatePassword = (password) => authClient().updateUser({ password })

export const signOut = () => authClient().signOut()
