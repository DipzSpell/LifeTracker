/**
 * BottomNav.jsx — Mobile bottom navigation bar (< lg breakpoint only)
 *
 * Always visible, fixed to the bottom of the viewport — no auto-hide.
 * 5 primary destinations + a "More" button that opens MoreSheet for the
 * rest of the app's pages (Daily Log, Fitness, Habits, Tasks, Profile).
 */
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, BookMarked, LineChart, Watch, BarChart2, Menu } from 'lucide-react'
import MoreSheet from './MoreSheet'

const PRIMARY_ITEMS = [
  { path: '/dashboard',       icon: Home,       label: 'Dashboard' },
  { path: '/journal',         icon: BookMarked, label: 'Journal'   },
  { path: '/trading-journal', icon: LineChart,  label: 'Trades'    },
  { path: '/health-sync',     icon: Watch,       label: 'Health'    },
  { path: '/stats',           icon: BarChart2,  label: 'Stats'     },
]

const SECONDARY_PATHS = ['/log', '/fitness', '/habits', '/todo', '/profile']

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (path) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard' || location.pathname === '/'
      : location.pathname === path

  const moreActive = SECONDARY_PATHS.includes(location.pathname)

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10
                   bg-background/95 backdrop-blur-xl pb-safe transition-colors duration-300"
      >
        <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto px-1">
          {PRIMARY_ITEMS.map(({ path, icon: Icon, label }) => {
            const active = isActive(path)
            return (
              <button
                key={path}
                id={`nav-${label.toLowerCase()}`}
                onClick={() => navigate(path)}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className="relative flex flex-col items-center justify-center gap-1 flex-1 min-w-0
                           min-h-[44px] active:scale-90 transition-transform duration-150 touch-manipulation"
              >
                <Icon size={21} className={active ? 'text-cyber-400' : 'text-white/40'} />
                <span className={`text-[10px] font-medium leading-none truncate max-w-full px-0.5 ${active ? 'text-cyber-400' : 'text-white/35'}`}>
                  {label}
                </span>
                {active && (
                  <motion.div
                    layoutId="bottomnav-active-dot"
                    className="absolute top-0.5 w-1 h-1 rounded-full bg-cyber-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}

          {/* More — opens the secondary-pages bottom sheet */}
          <button
            id="nav-more"
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            aria-current={moreActive ? 'page' : undefined}
            className="relative flex flex-col items-center justify-center gap-1 flex-1 min-w-0
                       min-h-[44px] active:scale-90 transition-transform duration-150 touch-manipulation"
          >
            <Menu size={21} className={moreActive ? 'text-cyber-400' : 'text-white/40'} />
            <span className={`text-[10px] font-medium leading-none ${moreActive ? 'text-cyber-400' : 'text-white/35'}`}>
              More
            </span>
            {moreActive && (
              <motion.div
                layoutId="bottomnav-active-dot"
                className="absolute top-0.5 w-1 h-1 rounded-full bg-cyber-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        </div>
      </nav>

      <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}