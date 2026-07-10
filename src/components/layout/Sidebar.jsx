/**
 * Sidebar.jsx — Desktop left sidebar (lg+ breakpoint only)
 *
 * Mirrors the BottomNav items in a vertical layout.
 * Renders the app logo, user account chip, nav items, and a points badge.
 * Hidden on mobile (the BottomNav handles mobile navigation).
 */
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, BookOpen, BarChart2, CheckSquare, User, Dumbbell, Flame, BookMarked, LineChart } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar() {
  const { settings, totalPoints } = useApp()
  const { user } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()

  const fitnessEnabled = settings?.fitnessTrackerEnabled !== false

  const items = [
    { path: '/dashboard', Icon: Home,        label: 'Dashboard' },
    { path: '/log',       Icon: BookOpen,    label: 'Daily Log'  },
    { path: '/journal',   Icon: BookMarked,  label: 'Journal'    },
    { path: '/trading-journal', Icon: LineChart, label: 'Trades'  },
    ...(fitnessEnabled ? [{ path: '/fitness', Icon: Dumbbell, label: 'Fitness' }] : []),
    { path: '/habits',    Icon: CheckSquare, label: 'Habits'     },
    { path: '/todo',      Icon: CheckSquare, label: 'Tasks'      },
    { path: '/stats',     Icon: BarChart2,   label: 'Stats'      },
    { path: '/profile',   Icon: User,        label: 'Profile'    },
  ]

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'You'
  const avatarLetter = displayName[0]?.toUpperCase() ?? '?'
  const avatarUrl = user?.photoURL ?? null

  const isActive = (path) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard' || location.pathname === '/'
      : location.pathname === path

  return (
    <aside
      className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-[220px] z-30
                 bg-background/95 backdrop-blur-xl border-r border-white/6
                 transition-colors duration-300"
    >
      {/* ── Logo + Wordmark ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/6">
        <img
          src="/logo.png"
          alt="LifeTracker logo"
          className="w-8 h-8 rounded-xl object-cover border border-white/10
                     shadow-[0_0_12px_rgba(34,211,238,0.15)]"
        />
        <span className="text-sm font-bold font-mono text-white tracking-tight">
          LifeTracker
        </span>
      </div>

      {/* ── User Account Chip ────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 mx-3 mt-4 mb-2 px-3 py-2.5
                   rounded-xl bg-white/5 border border-white/8 cursor-pointer
                   hover:bg-white/8 transition-colors duration-150"
        onClick={() => navigate('/profile')}
        role="button"
        aria-label="Go to profile"
      >
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-7 h-7 rounded-full object-cover border border-white/10 flex-shrink-0"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                       flex-shrink-0 border border-white/10"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
          >
            {avatarLetter}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold font-mono text-white/90 truncate leading-tight">
            {displayName}
          </p>
          {user?.email && (
            <p className="text-[10px] text-white/35 truncate leading-tight font-mono">
              {user.email}
            </p>
          )}
        </div>
      </div>

      {/* ── Nav Items ─────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto no-scrollbar">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/25 px-3 pb-2 pt-1 font-mono">
          Navigation
        </p>
        {items.map(({ path, Icon, label }) => {
          const active = isActive(path)
          return (
            <button
              key={path}
              id={`sidebar-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              className={`sidebar-item w-full ${active ? 'active' : ''}`}
              style={active ? {
                background: 'linear-gradient(135deg, rgba(34,211,238,0.12), rgba(16,185,129,0.08))',
                borderColor: 'rgba(34,211,238,0.2)',
                color: 'rgb(103, 232, 249)', /* cyber-300 */
              } : undefined}
            >
              <Icon
                size={15}
                style={active ? { color: 'rgb(34,211,238)' } : undefined}
              />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      {/* ── Points Badge ──────────────────────────────────────── */}
      <div className="px-4 pb-5 pt-3 border-t border-white/6">
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl
                     bg-gradient-to-r from-orange-500/15 to-yellow-500/10
                     border border-orange-500/20"
        >
          <Flame size={14} className="text-orange-400 streak-fire flex-shrink-0" />
          <div>
            <p className="text-sm font-bold font-mono text-orange-300 tabular-nums leading-tight">
              {totalPoints.toLocaleString()}
            </p>
            <p className="text-[10px] text-orange-400/50 font-mono leading-tight">total pts</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
