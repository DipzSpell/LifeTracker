import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, BookOpen, BarChart2, CheckSquare, User, Dumbbell } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/log', icon: BookOpen, label: 'Log' },
  { path: '/fitness', icon: Dumbbell, label: 'Fitness' },
  { path: '/stats', icon: BarChart2, label: 'Stats' },
  { path: '/todo', icon: CheckSquare, label: 'Tasks' },
  { path: '/profile', icon: User, label: 'Me' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-navy-950/90 backdrop-blur-xl pb-safe">
      <div className="flex items-center justify-around px-2 pt-2 pb-1 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
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
    </nav>
  )
}
