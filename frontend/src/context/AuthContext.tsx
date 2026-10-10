
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { Profile } from '../lib/types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Failed to load user profile:', error.message)
      return null
    }

    return data as Profile
  }, [])

  useEffect(() => {
    let active = true
    let requestId = 0

    async function syncSession(nextSession: Session | null) {
      const currentRequest = ++requestId

      setSession(nextSession)
      setLoading(true)

      if (!nextSession) {
        setProfile(null)

        if (active && currentRequest === requestId) {
          setLoading(false)
        }

        return
      }

      try {
        const nextProfile = await loadProfile(nextSession.user.id)

        if (active && currentRequest === requestId) {
          setProfile(nextProfile)
        }
      } catch (error) {
        console.error('Unexpected profile loading error:', error)

        if (active && currentRequest === requestId) {
          setProfile(null)
        }
      } finally {
        if (active && currentRequest === requestId) {
          setLoading(false)
        }
      }
    }

    async function initializeSession() {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        if (active) {
          await syncSession(data.session)
        }
      } catch (error) {
        console.error('Failed to initialize authentication:', error)

        if (active) {
          setSession(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    void initializeSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Defer profile queries until the Supabase auth callback finishes.
      Promise.resolve().then(() => {
        if (active) {
          void syncSession(nextSession)
        }
      })
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session) {
      setProfile(null)
      return
    }

    const currentUserId = session.user.id
    const nextProfile = await loadProfile(currentUserId)

    // Avoid applying a profile to a different signed-in user.
    if (nextProfile && session.user.id === currentUserId) {
      setProfile(nextProfile)
    }
  }, [session, loadProfile])

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
