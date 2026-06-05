/**
 * AuthContext.jsx — Authentication provider using Supabase
 *
 * ── Why we removed getSession() ──────────────────────────────────────────────
 *
 * The original code called BOTH getSession() and onAuthStateChange(). This
 * caused a race condition on Google OAuth redirect:
 *
 *   1. Google redirects back → URL is: http://localhost:5173/#access_token=TOKEN
 *   2. React mounts, getSession() fires immediately
 *   3. Supabase hasn't parsed the #access_token from the URL yet
 *   4. getSession() returns null → setLoading(false) with user=null
 *   5. ProtectedRoute sees user=null + loading=false → Navigate to /login
 *   6. Redirect loop! The token is in the URL but we've already redirected away.
 *
 * ── The correct approach (Supabase JS v2) ────────────────────────────────────
 *
 * In Supabase JS v2, onAuthStateChange() fires an INITIAL_SESSION event on
 * first mount. This event fires AFTER Supabase has:
 *   a) Checked localStorage for an existing session, AND
 *   b) Parsed any #access_token fragment from the URL (OAuth redirect token)
 *
 * So onAuthStateChange is the SINGLE source of truth. We set loading=false
 * ONLY when the INITIAL_SESSION event arrives. This guarantees we never
 * redirect to /login before the OAuth token has been processed.
 *
 * Reference: https://supabase.com/docs/reference/javascript/auth-onauthstatechange
 */
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

/** Maps a raw Supabase user → stable app user shape */
const normalizeUser = (sbUser) => {
  if (!sbUser) return null
  return {
    uid: sbUser.id,                               // UUID used in all DB tables
    email: sbUser.email,
    displayName:
      sbUser.user_metadata?.display_name ||
      sbUser.user_metadata?.full_name ||
      sbUser.user_metadata?.name ||               // Google sends `name`
      sbUser.email?.split('@')[0] ||
      'User',
    avatar:
      sbUser.user_metadata?.avatar_url ||
      sbUser.user_metadata?.picture ||            // Google sends `picture`
      null,
    provider: sbUser.app_metadata?.provider || 'email',
    createdAt: sbUser.created_at,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)   // MUST start as true — never flip to false early

  useEffect(() => {
    /**
     * onAuthStateChange is the ONLY place we set user + flip loading=false.
     *
     * Events fired on first mount (in order):
     *   INITIAL_SESSION — fires once after Supabase has checked localStorage
     *                     AND parsed any #access_token from the URL.
     *                     This is the signal that "auth check is complete."
     *
     * Events fired later:
     *   SIGNED_IN       — user logs in (email or OAuth)
     *   SIGNED_OUT      — user logs out
     *   TOKEN_REFRESHED — JWT auto-refreshed (transparent to the UI)
     *   USER_UPDATED    — profile metadata changed
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.debug('[Auth] event:', event, '| user:', session?.user?.email ?? 'none')

        setUser(normalizeUser(session?.user ?? null))

        // If a session is established, clear any error queries from the URL history
        if (session) {
          try {
            const url = new URL(window.location.href)
            if (
              url.searchParams.has('error') ||
              url.searchParams.has('error_description') ||
              window.location.hash.includes('error=')
            ) {
              url.searchParams.delete('error')
              url.searchParams.delete('error_code')
              url.searchParams.delete('error_description')
              
              // Clean hash parameters too
              let cleanHash = url.hash
              if (cleanHash.includes('?')) {
                const hashParts = cleanHash.split('?')
                const hashParams = new URLSearchParams(hashParts[1])
                hashParams.delete('error')
                hashParams.delete('error_code')
                hashParams.delete('error_description')
                const searchStr = hashParams.toString()
                cleanHash = hashParts[0] + (searchStr ? '?' + searchStr : '')
              }
              window.history.replaceState({}, document.title, url.pathname + cleanHash)
            }
          } catch (err) {
            console.warn('[Auth] Error clearing URL parameters:', err)
          }
        }

        // Only set loading=false once the initial check is complete.
        // All subsequent events (SIGNED_IN, SIGNED_OUT, etc.) also set it false,
        // which is a no-op after the first time — safe and correct.
        if (
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN'       ||
          event === 'SIGNED_OUT'      ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
      },
    })
    if (error) throw error
    return data
  }

  // ── Email / Password Login ────────────────────────────────────────────────────
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return normalizeUser(data.user)
  }

  // ── Email / Password Sign Up ──────────────────────────────────────────────────
  const signup = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) throw error
    return normalizeUser(data.user)
  }

  // ── Sign Out ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // ── Update profile display name ───────────────────────────────────────────────
  const updateProfile = async (updates) => {
    const data = {}
    if (updates.displayName !== undefined) data.display_name = updates.displayName
    if (updates.avatarUrl !== undefined) data.avatar_url = updates.avatarUrl
    if (updates.dob !== undefined) data.dob = updates.dob
    if (updates.height !== undefined) data.height = updates.height
    if (updates.weight !== undefined) data.weight = updates.weight
    if (updates.onboarding_completed !== undefined) data.onboarding_completed = updates.onboarding_completed

    const { data: resData, error } = await supabase.auth.updateUser({
      data
    })
    if (error) throw error
    const updatedUser = normalizeUser(resData.user)
    setUser(updatedUser)
    return updatedUser
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, signInWithGoogle, logout, updateProfile }}
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
