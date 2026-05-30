/**
 * App.jsx — Root router with protected routes
 *
 * ── Redirect loop fix ────────────────────────────────────────────────────────
 *
 * The loop was caused by two issues:
 *
 * 1. AuthContext set loading=false too early (via getSession) before Supabase
 *    had a chance to parse the #access_token from the OAuth redirect URL.
 *    → Fixed in AuthContext.jsx (now uses INITIAL_SESSION event only)
 *
 * 2. The /login route redirect (`user ? <Navigate to="/" /> : <Login />`) did
 *    NOT check `loading`. So if user was briefly null while loading, the login
 *    page would render, then immediately redirect to /, which then checked the
 *    protected route, saw no user, and went back to /login.
 *    → Fixed below: /login shows a loading spinner while loading=true.
 *
 * 3. HashRouter + OAuth token: When Google redirects to
 *    http://localhost:5173/#access_token=TOKEN, HashRouter interprets the hash
 *    as a route. If any navigation happens before Supabase parses the token,
 *    the token is lost. We guard against this by blocking ALL navigation
 *    (returning the global spinner) while loading=true.
 */
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DailyLog from './pages/DailyLog'
import Fitness from './pages/Fitness'
import Habits from './pages/Habits'
import Todo from './pages/Todo'
import Analytics from './pages/Analytics'
import Profile from './pages/Profile'
import LoveTracker from './pages/LoveTracker'
import PageLayout from './components/layout/PageLayout'

// ── Global loading screen ─────────────────────────────────────────────────────
// Shown while Supabase resolves the initial session / OAuth token.
// MUST render before any <Navigate> to prevent the redirect loop.
function GlobalLoader() {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Spinning ring */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-t-cyan-400
                          border-r-transparent border-b-transparent border-l-transparent
                          animate-spin" />
        </div>
        <p className="text-white/40 text-sm font-medium tracking-wide">
          Loading your life...
        </p>
      </div>
    </div>
  )
}

// ── Protected route wrapper ───────────────────────────────────────────────────
// Guards all authenticated pages. Renders nothing (global loader) while
// loading=true so we never redirect prematurely.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // ✅ While loading: show spinner. NEVER navigate to /login here.
  if (loading) return <GlobalLoader />

  // ✅ Only redirect when we're CERTAIN there is no user.
  if (!user) return <Navigate to="/login" replace />

  // ✅ User confirmed — mount the app data layer and render.
  return <AppProvider>{children}</AppProvider>
}

// ── Route definitions ─────────────────────────────────────────────────────────
function AppRoutes() {
  const { user, loading } = useAuth()

  // ✅ While Supabase is resolving the session (incl. OAuth token in URL),
  //    show the global loader rather than letting any route render.
  //    This is the HashRouter guard — prevents HashRouter from processing
  //    "#access_token=..." as a route before Supabase can parse it.
  if (loading) return <GlobalLoader />

  return (
    <Routes>
      {/* Login route — only render Login once loading is done */}
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      {/* All authenticated routes go through ProtectedRoute */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <PageLayout>
              <Routes>
                <Route path="/"        element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/log"     element={<DailyLog />} />
                <Route path="/fitness" element={<Fitness />} />
                <Route path="/habits"  element={<Habits />} />
                <Route path="/todo"    element={<Todo />} />
                <Route path="/stats"   element={<Analytics />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/love"    element={<LoveTracker />} />
              </Routes>
            </PageLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  )
}
