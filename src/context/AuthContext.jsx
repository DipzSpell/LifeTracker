import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Normalize the Supabase user object to match the schema expected by the application
  const normalizeUser = (sbUser) => {
    if (!sbUser) return null
    return {
      uid: sbUser.id, // Maps Supabase id to uid for compatibility
      email: sbUser.email,
      displayName:
        sbUser.user_metadata?.display_name ||
        sbUser.user_metadata?.full_name ||
        sbUser.email?.split('@')[0] ||
        'User',
      avatar: sbUser.user_metadata?.avatar_url || null,
      createdAt: sbUser.created_at,
    }
  }

  useEffect(() => {
    // 1. Get initial session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(normalizeUser(session?.user ?? null))
      setLoading(false)
    }).catch((err) => {
      console.error('Error fetching Supabase session:', err)
      setLoading(false)
    })

    // 2. Listen for authentication state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(normalizeUser(session?.user ?? null))
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Email/Password Login
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return normalizeUser(data.user)
  }

  // Email/Password Sign Up
  const signup = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    })
    if (error) throw error
    return normalizeUser(data.user)
  }

  // Google OAuth flow
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) throw error
    return data
  }

  // Sign Out
  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Update profile metadata
  const updateProfile = async (updates) => {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: updates.displayName,
      },
    })
    if (error) throw error
    const updatedUser = normalizeUser(data.user)
    setUser(updatedUser)
    return updatedUser
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        signInWithGoogle,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
