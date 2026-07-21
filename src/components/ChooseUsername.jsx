/**
 * ChooseUsername.jsx — one-time gate for OAuth (Google/GitHub) sign-ins.
 *
 * Google/GitHub never collect a username, so AuthContext's `needsUsername`
 * flips true for any signed-in user with no public.profiles row yet.
 * App.jsx's ProtectedRoute renders this instead of the app until they claim
 * one; it never reappears afterward since claimUsername() creates the row.
 */
import { useEffect, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

export default function ChooseUsername() {
  const { user, claimUsername, checkUsernameAvailable } = useAuth()
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState('idle') // idle | checking | available | taken | invalid | error
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!username) { setStatus('idle'); return }
    if (!/^[a-zA-Z0-9_.]{3,20}$/.test(username)) { setStatus('invalid'); return }
    setStatus('checking')
    const t = setTimeout(async () => {
      try {
        const ok = await checkUsernameAvailable(username)
        setStatus(ok ? 'available' : 'taken')
      } catch (err) {
        // Silently swallowing this (old behavior) left users stuck with a
        // permanently disabled Continue and no clue why — most commonly
        // because profiles_migration.sql was never run in Supabase.
        console.error('[ChooseUsername] availability check failed:', err)
        setStatus('error')
      }
    }, 400)
    return () => clearTimeout(t)
  }, [username, checkUsernameAvailable])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (status !== 'available' || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await claimUsername(username)
    } catch (err) {
      setError(err.message || 'Could not save that userid.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
      <div className="glass-card p-6 w-full" style={{ maxWidth: 380 }}>
        <div className="flex flex-col items-center text-center mb-5">
          <Logo size={44} className="rounded-2xl mb-3" />
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Choose your userid</h1>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Welcome, {user?.displayName || 'there'} — pick a userid so you can also sign in with it later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <div className="relative">
              <input
                id="choose-username-input"
                type="text"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value.trim())}
                placeholder="yourname"
                className="glass-input"
                style={{ paddingRight: 34 }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {status === 'checking' && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
                {status === 'available' && <Check size={14} style={{ color: 'var(--success)' }} />}
                {(status === 'taken' || status === 'invalid' || status === 'error') && <X size={14} style={{ color: 'var(--danger)' }} />}
              </span>
            </div>
            <p className="text-xs mt-1.5" style={{
              color: status === 'taken' || status === 'invalid' || status === 'error' ? 'var(--danger)'
                : status === 'available' ? 'var(--success)' : 'var(--text-muted)',
            }}>
              {status === 'idle' && '3-20 characters: letters, numbers, dot or underscore.'}
              {status === 'checking' && 'Checking availability...'}
              {status === 'available' && 'Available!'}
              {status === 'taken' && 'That userid is already taken.'}
              {status === 'invalid' && '3-20 characters: letters, numbers, dot or underscore.'}
              {status === 'error' && 'Could not check availability — the database setup (profiles_migration.sql) may not have been run yet.'}
            </p>
          </div>

          {error && (
            <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
          )}

          <button
            id="choose-username-submit"
            type="submit"
            disabled={status !== 'available' || submitting}
            className="glass-btn glass-btn-accent w-full"
            style={{ padding: '0.65rem 1rem', fontSize: 13, fontWeight: 700 }}
          >
            {submitting ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
