import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, BookOpen, BarChart2, CheckSquare, User, Dumbbell } from 'lucide-react'
import { useApp } from '../../context/AppContext'

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/log', icon: BookOpen, label: 'Log' },
  { path: '/fitness', icon: Dumbbell, label: 'Fitness' },
  { path: '/stats', icon: BarChart2, label: 'Stats' },
  { path: '/todo', icon: CheckSquare, label: 'Tasks' },
  { path: '/profile', icon: User, label: 'Me' },
]

export default function BottomNav() {
  const { settings } = useApp()
  const fitnessTrackerEnabled = settings?.fitnessTrackerEnabled !== false
  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.path === '/fitness' && !fitnessTrackerEnabled) return false
    return true
  })

  const location = useLocation()
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(true)
  const timerRef = useRef(null)

  const resetTimer = () => {
    setIsVisible(true)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 10000) // 10 seconds of inactivity
  }

  useEffect(() => {
    // Initialize auto-hide timer
    resetTimer()

    const handleActivity = () => {
      resetTimer()
    }

    const handleMouseMove = (e) => {
      // If cursor is close to the bottom (within 80px), keep it visible and pause timer
      if (e.clientY > window.innerHeight - 80) {
        setIsVisible(true)
        if (timerRef.current) {
          clearTimeout(timerRef.current)
        }
      } else {
        resetTimer()
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleActivity)
    window.addEventListener('touchstart', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('scroll', handleActivity)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('scroll', handleActivity)
    }
  }, [])

  return (
    <>
      {/* Invisible hover trigger zone at the very bottom of the screen */}
      <div
        onMouseEnter={() => setIsVisible(true)}
        className="fixed bottom-0 left-0 right-0 h-4 z-40 bg-transparent"
        style={{ pointerEvents: isVisible ? 'none' : 'auto' }}
      />

      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: isVisible ? 0 : '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-navy-950/90 backdrop-blur-xl pb-safe"
      >
        <div className="flex items-center justify-around px-2 pt-2 pb-2 max-w-lg mx-auto">
          {visibleNavItems.map(({ path, icon: Icon, label }) => {
            const active = path === '/'
              ? (location.pathname === '/' || location.pathname === '/dashboard')
              : location.pathname === path
            return (
              <button
                key={path}
                id={`nav-${label.toLowerCase()}`}
                onClick={() => navigate(path)}
                className="relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200 active:scale-90 min-w-0"
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-cyber-500/15 rounded-xl border border-cyber-500/30"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  size={20}
                  className={`relative transition-colors duration-200 ${
                    active ? 'text-cyber-400' : 'text-white/40'
                  }`}
                />
                <span
                  className={`relative text-[10px] font-medium transition-colors duration-200 ${
                    active ? 'text-cyber-400' : 'text-white/30'
                  }`}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </motion.nav>
    </>
  )
}
