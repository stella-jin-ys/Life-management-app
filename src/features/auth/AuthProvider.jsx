import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { isSupabaseConfigured, supabase } from '../../lib/supabase/client.js'
import { signOut as signOutRequest } from './authApi.js'

const AuthContext = createContext(null)

async function loadProfile(user) {
  if (!user || !supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (error) throw error
  return data
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshProfile = useCallback(async () => {
    const nextProfile = await loadProfile(session?.user)
    setProfile(nextProfile)
    setError('')
    return nextProfile
  }, [session?.user])

  useEffect(() => {
    let active = true

    if (!isSupabaseConfigured) {
      setError('Add the Supabase values from .env.example before signing in.')
      setLoading(false)
      return () => { active = false }
    }

    async function restore() {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (!active) return
      if (sessionError) setError('We could not restore your session. Please sign in again.')
      setSession(data.session)
      try {
        setProfile(await loadProfile(data.session?.user))
      } catch {
        setError('We could not load your profile. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }

    restore()
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setIsPasswordRecovery(false)
      window.setTimeout(async () => {
        if (!active) return
        try {
          setProfile(await loadProfile(nextSession?.user))
          setError('')
        } catch {
          setError('We could not load your profile. Please try again.')
        }
      }, 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    isPasswordRecovery,
    profile,
    loading,
    error,
    refreshProfile,
    signOut: signOutRequest,
  }), [session, isPasswordRecovery, profile, loading, error, refreshProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
