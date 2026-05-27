import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, AlertTriangle, ChevronDown, Zap } from 'lucide-react'

// ── Google SVG icon ───────────────────────────────────────────────────────────
function GoogleIcon({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ className = '' }) {
  return <div className={`rounded-full border-2 border-current border-t-transparent animate-spin ${className}`} />
}

export default function Login() {
  const { signInWithGoogle, login, signup } = useAuth()

  // Google loading
  const [googleLoading, setGoogleLoading] = useState(false)

  // Email form (secondary / collapsed by default)
  const [showEmail, setShowEmail] = useState(false)
  const [emailMode, setEmailMode] = useState('login') // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  // Error
  const [error, setError] = useState('')

  // ── Google OAuth ────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      // The page will redirect; no need to set loading back to false.
    } catch (err) {
      setError(err.message || 'Could not connect to Google. Please try again.')
      setGoogleLoading(false)
    }
  }

  // ── Email / Password ────────────────────────────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (emailMode === 'signup' && !form.name.trim()) {
      setError('Please enter your name.')
      return
    }
    setEmailLoading(true)
    try {
      if (emailMode === 'login') {
        await login(form.email, form.password)
      } else {
        await signup(form.email, form.password, form.name)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Check your credentials.')
    } finally {
      setEmailLoading(false)
    }
  }

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* ── Ambient background ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px]
                        bg-cyber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-600/8 rounded-full blur-3xl" />
        {/* grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
             style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">

        {/* ── Logo ───────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="text-center mb-10"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-[72px] h-[72px] rounded-[22px] mx-auto mb-5 flex items-center justify-center
                       bg-gradient-to-br from-cyber-400 to-emerald-500 shadow-xl glow-cyan"
          >
            <Zap size={36} className="text-white" fill="currentColor" />
          </motion.div>
          <h1 className="text-[2rem] font-display font-extrabold gradient-text leading-tight">
            LifeTracker
          </h1>
          <p className="text-white/35 text-[0.8rem] mt-1.5 tracking-wide">
            Your Personal Life OS
          </p>
        </motion.div>

        {/* ── Card ───────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
        >
          <div className="glass-card p-7 border border-white/10 shadow-2xl">

            <p className="text-center text-white/50 text-xs font-medium uppercase tracking-widest mb-6">
              Sign in to continue
            </p>

            {/* ── Google button ──────────────────────────────────────────────── */}
            <motion.button
              id="google-login-btn"
              type="button"
              disabled={googleLoading || emailLoading}
              onClick={handleGoogleLogin}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl
                         bg-white hover:bg-gray-50 disabled:bg-white/80
                         text-gray-800 font-semibold text-[0.9rem]
                         shadow-lg shadow-black/20 transition-colors duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-400"
            >
              {googleLoading
                ? <Spinner className="w-5 h-5 text-gray-500" />
                : <GoogleIcon size={20} />
              }
              <span>{googleLoading ? 'Redirecting to Google…' : 'Continue with Google'}</span>
            </motion.button>

            {/* ── Divider ────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-white/8" />
              <button
                type="button"
                onClick={() => { setShowEmail((v) => !v); setError('') }}
                className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/50
                           uppercase tracking-wider font-medium transition-colors"
              >
                or use email
                <motion.span animate={{ rotate: showEmail ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={12} />
                </motion.span>
              </button>
              <div className="h-px flex-1 bg-white/8" />
            </div>

            {/* ── Email form (collapsible) ────────────────────────────────────── */}
            <AnimatePresence>
              {showEmail && (
                <motion.div
                  key="email-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
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
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                          emailMode === m
                            ? 'bg-cyber-500 text-white shadow-md shadow-cyber-500/20'
                            : 'text-white/35 hover:text-white/60'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-3">
                    {/* Name — signup only */}
                    <AnimatePresence>
                      {emailMode === 'signup' && (
                        <motion.input
                          key="name-field"
                          id="signup-name"
                          type="text"
                          placeholder="Full name"
                          value={form.name}
                          onChange={setField('name')}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="input-cyber text-sm"
                        />
                      )}
                    </AnimatePresence>

                    <input
                      id="auth-email"
                      type="email"
                      placeholder="Email address"
                      value={form.email}
                      onChange={setField('email')}
                      required
                      className="input-cyber text-sm"
                    />

                    <div className="relative">
                      <input
                        id="auth-password"
                        type={showPass ? 'text' : 'password'}
                        placeholder="Password"
                        value={form.password}
                        onChange={setField('password')}
                        required
                        className="input-cyber text-sm pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                        tabIndex={-1}
                      >
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    <button
                      id="auth-submit"
                      type="submit"
                      disabled={emailLoading || googleLoading}
                      className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm"
                    >
                      {emailLoading
                        ? <Spinner className="w-4 h-4 text-white/60" />
                        : emailMode === 'login' ? 'Sign In' : 'Create Account'
                      }
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Error banner ───────────────────────────────────────────────── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="error-banner"
                  id="auth-error-banner"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mt-4 flex gap-2.5 items-start text-red-400 text-xs
                             bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-3"
                >
                  <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <p className="font-semibold">Authentication failed</p>
                    <p className="opacity-75 mt-0.5">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Footer note ──────────────────────────────────────────────────── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
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
