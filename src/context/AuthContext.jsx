import { createContext, useContext, useState, useEffect } from 'react'

// Simple auth context using localStorage (no Firebase required for demo)
// To enable Firebase auth, uncomment the Firebase imports below

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('lt_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch { /* ignore */ }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    // Demo auth — replace with Firebase Auth for real auth
    if (!email || !password) throw new Error('Email and password are required')
    
    const userData = {
      uid: `user_${email.replace(/[^a-z0-9]/gi, '_')}`,
      email,
      displayName: email.split('@')[0],
      avatar: null,
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem('lt_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const signup = async (email, password, displayName) => {
    if (!email || !password) throw new Error('Email and password are required')
    const userData = {
      uid: `user_${email.replace(/[^a-z0-9]/gi, '_')}`,
      email,
      displayName: displayName || email.split('@')[0],
      avatar: null,
      createdAt: new Date().toISOString(),
    }
    localStorage.setItem('lt_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const logout = () => {
    localStorage.removeItem('lt_user')
    setUser(null)
  }

  const updateProfile = (updates) => {
    const updated = { ...user, ...updates }
    localStorage.setItem('lt_user', JSON.stringify(updated))
    setUser(updated)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
