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

export function validateProfile({ displayName, timezone }) {
  const trimmedName = displayName?.trim()
  const trimmedTimezone = timezone?.trim()

  if (!trimmedName) throw new Error('Please add a display name.')
  if (trimmedName.length > 80) throw new Error('Display names can be up to 80 characters.')
  if (!trimmedTimezone) throw new Error('Choose a valid IANA timezone.')

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: trimmedTimezone })
  } catch {
    throw new Error('Choose a valid IANA timezone.')
  }

  return { displayName: trimmedName, timezone: trimmedTimezone }
}

export async function updateProfile(userId, values) {
  if (!userId) throw new Error('Please sign in before updating your profile.')

  const { displayName, timezone } = validateProfile(values)
  const { data, error } = await supabase.from('profiles')
    .update({ display_name: displayName, timezone })
    .eq('id', userId)
    .select('*')
    .single()

  if (error) throw error
  return data
}
