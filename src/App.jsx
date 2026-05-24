import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-cyber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/50 text-sm">Loading your life...</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <AppProvider>{children}</AppProvider>
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <PageLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/log" element={<DailyLog />} />
                <Route path="/fitness" element={<Fitness />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/todo" element={<Todo />} />
                <Route path="/stats" element={<Analytics />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/love" element={<LoveTracker />} />
              </Routes>
            </PageLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
