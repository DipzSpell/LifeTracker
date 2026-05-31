/**
 * Login.jsx — Premium Life OS authentication page
 *
 * Layout:
 *  - Full-screen dark background with ambient gradient orbs + grid overlay
 *  - Centered card: Google OAuth button (primary) + email/password (collapsible)
 *  - Smooth framer-motion transitions throughout
 *  - Accessible: all interactive elements have unique IDs, ARIA labels
 */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, AlertTriangle, ChevronDown, Loader2 } from 'lucide-react'

// ── Google SVG icon (official brand colors) ────────────────────────────────
function GoogleIcon({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

// ── Animated background dots / particles ──────────────────────────────────
// Generated once at module level (not per render) to avoid impure calls during render
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 8 + 4,
  delay: Math.random() * 4,
}))

function FloatingParticles() {

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {PARTICLES.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-cyan-400/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ── Feature pill ───────────────────────────────────────────────────────────
function FeaturePill({ emoji, label }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
      <span className="text-sm">{emoji}</span>
      <span className="text-[11px] text-white/50 font-medium">{label}</span>
    </div>
  )
}

export default function Login() {
  const { signInWithGoogle, login, signup } = useAuth()

  // Google loading state
  const [googleLoading, setGoogleLoading] = useState(false)

  // Email form
  const [showEmail, setShowEmail]     = useState(false)
  const [emailMode, setEmailMode]     = useState('login')   // 'login' | 'signup'
  const [form, setForm]               = useState({ name: '', email: '', password: '' })
  const [showPass, setShowPass]       = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  // Error
  const [error, setError] = useState('')

  // Parse error parameters from URL (e.g. OAuth failures)
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      let oauthError = url.searchParams.get('error_description') || url.searchParams.get('error')

      // Check hash parameters if using HashRouter (e.g. #/login?error=...)
      if (!oauthError && window.location.hash) {
        const hashQuery = window.location.hash.split('?')[1]
        if (hashQuery) {
          const params = new URLSearchParams(hashQuery)
          oauthError = params.get('error_description') || params.get('error')
        } else if (window.location.hash.startsWith('#error=')) {
          const params = new URLSearchParams(window.location.hash.substring(1))
          oauthError = params.get('error_description') || params.get('error')
        }
      }

      if (oauthError) {
        console.error('[Login] OAuth redirect error:', oauthError)
        setError(decodeURIComponent(oauthError).replace(/\+/g, ' '))

        // Clear query parameters from URL history to break redirect loops
        const cleanUrl = window.location.origin + window.location.pathname + (window.location.hash ? window.location.hash.split('?')[0] : '')
        window.history.replaceState({}, document.title, cleanUrl)
      }
    } catch (err) {
      console.warn('[Login] Error parsing URL error params:', err)
    }
  }, [])

  // Clear error when switching modes (done inline on button clicks)

  // ── Google OAuth ─────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      // Browser will redirect — loading stays true intentionally.
      // If popup is blocked or the call fails, we catch below.
    } catch (err) {
      console.error('[Login] Google OAuth error:', err)
      setError(
        err.message?.includes('fetch')
          ? 'Network error — check your connection and try again.'
          : err.message || 'Could not sign in with Google. Please try again.'
      )
      setGoogleLoading(false)
    }
  }

  // ── Email / Password ─────────────────────────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (emailMode === 'signup' && !form.name.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!form.email.trim()) { setError('Please enter your email.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setEmailLoading(true)
    try {
      if (emailMode === 'login') {
        await login(form.email, form.password)
      } else {
        await signup(form.email, form.password, form.name)
        setSignupSuccess(true)
      }
    } catch (err) {
      console.error('[Login] Email auth error:', err)
      setError(err.message || 'Authentication failed. Check your credentials.')
    } finally {
      setEmailLoading(false)
    }
  }

  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  const isLoading = googleLoading || emailLoading

  return (
    <div className="min-h-screen bg-background text-text flex flex-col items-center justify-center px-4 relative overflow-hidden transition-colors duration-300">

      {/* ── Ambient Background ──────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
        {/* Primary glow — top center */}
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[700px]
                        bg-cyan-500/8 rounded-full blur-[140px]" />
        {/* Secondary glows */}
        <div className="absolute bottom-[-5%] left-[-5%] w-96 h-96 bg-emerald-500/6 rounded-full blur-3xl" />
        <div className="absolute bottom-[-5%] right-[-5%] w-96 h-96 bg-violet-600/6 rounded-full blur-3xl" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Floating particles */}
      <FloatingParticles />

      <div className="relative z-10 w-full max-w-sm">

        {/* ── App logo + headline ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-8"
        >
          <motion.div
            whileHover={{ scale: 1.06, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 400 }}
            className="w-[76px] h-[76px] rounded-[24px] mx-auto mb-5 overflow-hidden flex items-center justify-center
                       bg-gradient-to-br from-cyan-400 via-cyan-500 to-emerald-500
                       shadow-[0_0_40px_rgba(34,211,238,0.35)] ring-1 ring-white/10"
          >
            <img src="/logo.png" alt="LifeTracker Logo" className="w-full h-full object-cover" />
          </motion.div>

          <h1 className="text-[2.1rem] font-black tracking-tight gradient-text leading-none mb-1.5">
            LifeTracker
          </h1>
          <p className="text-white/35 text-[0.8rem] tracking-wide font-medium">
            Your Personal Life OS ✦
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {[
              ['🎯', 'Habits'],
              ['💪', 'Fitness'],
              ['📊', 'Analytics'],
              ['✅', 'Tasks'],
            ].map(([emoji, label]) => (
              <FeaturePill key={label} emoji={emoji} label={label} />
            ))}
          </div>
        </motion.div>

        {/* ── Auth Card ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative bg-white/[0.04] backdrop-blur-xl border border-white/10
                          rounded-2xl p-7 shadow-[0_8px_60px_rgba(0,0,0,0.5)]
                          overflow-hidden">
            {/* Card shimmer top border */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r
                            from-transparent via-cyan-400/40 to-transparent" />

            <p className="text-center text-white/40 text-[11px] font-semibold
                          uppercase tracking-[0.18em] mb-6">
              {signupSuccess
                ? 'Registration Complete'
                : !showEmail
                  ? 'Sign in to continue'
                  : emailMode === 'login'
                    ? 'Sign in with email'
                    : 'Create your account'}
            </p>

            {signupSuccess ? (
              <motion.div
                key="signup-success-view"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center py-4 space-y-4"
              >
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full mx-auto flex items-center justify-center text-emerald-400">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                </div>
                <h3 className="text-lg font-bold text-white">Verify your email</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  We've sent a verification link to <span className="text-cyan-400 font-semibold">{form.email}</span>.
                  Please check your inbox (and spam folder) to complete registration and confirm your account.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSignupSuccess(false)
                      setEmailMode('login')
                      setForm({ name: '', email: '', password: '' })
                    }}
                    className="btn-cyber-primary btn-primary w-full py-2.5 text-xs font-semibold"
                  >
                    Back to Sign In
                  </button>
                </div>
              </motion.div>
            ) : (
              <>
                {/* ── Google button ─────────────────────────────────────────── */}
                <motion.button
                  id="google-login-btn"
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleLogin}
                  whileHover={!isLoading ? { scale: 1.018, y: -1 } : {}}
                  whileTap={!isLoading ? { scale: 0.975 } : {}}
                  aria-label="Continue with Google"
                  className="w-full relative flex items-center justify-center gap-3 py-3.5 px-5
                             rounded-xl bg-white text-gray-800 font-semibold text-[0.9rem]
                             shadow-[0_4px_24px_rgba(0,0,0,0.25)]
                             hover:bg-gray-50 disabled:opacity-75 disabled:cursor-not-allowed
                             transition-colors duration-150
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin text-gray-500 flex-shrink-0" />
                      <span>Redirecting to Google…</span>
                    </>
                  ) : (
                    <>
                      <GoogleIcon size={20} />
                      <span>Continue with Google</span>
                    </>
                  )}
                </motion.button>

                {/* ── Divider / email toggle ─────────────────────────────────── */}
                <div className="flex items-center gap-3 my-5">
                  <div className="h-px flex-1 bg-white/8" />
                  <button
                    type="button"
                    onClick={() => { setShowEmail(v => !v); setError('') }}
                    className="flex items-center gap-1.5 text-[11px] text-white/30
                               hover:text-white/55 uppercase tracking-wider font-medium
                               transition-colors duration-150"
                  >
                    or use email
                    <motion.span
                      animate={{ rotate: showEmail ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={12} />
                    </motion.span>
                  </button>
                  <div className="h-px flex-1 bg-white/8" />
                </div>

                {/* ── Email / Password form (collapsible) ───────────────────── */}
                <AnimatePresence initial={false}>
                  {showEmail && (
                    <motion.div
                      key="email-form"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      {/* Mode tabs */}
                      <div className="flex bg-white/5 rounded-xl p-1 mb-4">
                        {[['login', 'Sign In'], ['signup', 'Sign Up']].map(([m, label]) => (
                          <button
                            key={m}
                            id={`auth-${m}-tab`}
                            type="button"
                            onClick={() => { setEmailMode(m); setError('') }}
                            className={`flex-1 py-2 rounded-lg text-[12px] font-semibold
                                        transition-all duration-200 ${
                              emailMode === m
                                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                                : 'text-white/35 hover:text-white/60'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <form onSubmit={handleEmailSubmit} className="space-y-3">
                        {/* Name — signup only */}
                        <AnimatePresence initial={false}>
                          {emailMode === 'signup' && (
                            <motion.div
                              key="name-field"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <input
                                id="signup-name"
                                type="text"
                                placeholder="Full name"
                                value={form.name}
                                onChange={setField('name')}
                                autoComplete="name"
                                className="input-cyber text-sm"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <input
                          id="auth-email"
                          type="email"
                          placeholder="Email address"
                          value={form.email}
                          onChange={setField('email')}
                          required
                          autoComplete={emailMode === 'login' ? 'username' : 'email'}
                          className="input-cyber text-sm"
                        />

                        <div className="relative">
                          <input
                            id="auth-password"
                            type={showPass ? 'text' : 'password'}
                            placeholder={emailMode === 'signup' ? 'Create password (6+ chars)' : 'Password'}
                            value={form.password}
                            onChange={setField('password')}
                            required
                            autoComplete={emailMode === 'login' ? 'current-password' : 'new-password'}
                            className="input-cyber text-sm pr-11"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPass(v => !v)}
                            tabIndex={-1}
                            aria-label={showPass ? 'Hide password' : 'Show password'}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2
                                       text-white/30 hover:text-white/60 transition-colors"
                          >
                            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>

                        <motion.button
                          id="auth-submit"
                          type="submit"
                          disabled={isLoading}
                          whileTap={{ scale: 0.97 }}
                          className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm"
                        >
                          {emailLoading
                            ? <Loader2 size={16} className="animate-spin" />
                            : emailMode === 'login' ? 'Sign In' : 'Create Account'
                          }
                        </motion.button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Error banner ─────────────────────────────────────────── */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      key="error-banner"
                      id="auth-error-banner"
                      role="alert"
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="mt-4 overflow-hidden"
                    >
                      <div className="flex gap-2.5 items-start text-red-400 text-xs
                                      bg-red-500/10 border border-red-500/25 rounded-xl px-3.5 py-3">
                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">{emailMode === 'login' ? 'Sign in failed' : 'Registration failed'}</p>
                          <p className="opacity-75 mt-0.5 leading-relaxed">{error}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Switcher link ── */}
                <div className="mt-6 pt-4 border-t border-white/5 text-center text-xs text-white/40">
                  {!showEmail ? (
                    <p>
                      New to LifeTracker?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setShowEmail(true)
                          setEmailMode('signup')
                          setError('')
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors focus:outline-none"
                      >
                        Create an account
                      </button>
                    </p>
                  ) : emailMode === 'login' ? (
                    <p>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setEmailMode('signup')
                          setError('')
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors focus:outline-none"
                      >
                        Sign Up
                      </button>
                    </p>
                  ) : (
                    <p>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setEmailMode('login')
                          setError('')
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors focus:outline-none"
                      >
                        Sign In
                      </button>
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Card shimmer bottom border */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r
                            from-transparent via-white/8 to-transparent" />
          </div>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-white/20 text-[11px] mt-5 leading-relaxed"
          >
            Your data is end-to-end isolated per account.
            <br />Protected by Supabase Row Level Security 🔐
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
