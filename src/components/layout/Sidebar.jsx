/**
 * Sidebar.jsx — Desktop left sidebar (lg+ breakpoint only)
 *
 * Bevel-style dark premium theme: deep navy background, active item gets
 * a soft colored pill background.
 * Hidden on mobile (the BottomNav handles mobile navigation).
 */
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, BookOpen, BarChart2, CheckSquare, User, Dumbbell, Flame, BookMarked, LineChart, Watch } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { BEVEL } from '../bevel/BevelUI'

export default function Sidebar() {
  const { settings, totalPoints } = useApp()
  const { user } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()

  const fitnessEnabled = settings?.fitnessTrackerEnabled !== false

  const items = [
    { path: '/dashboard', Icon: Home,        label: 'Dashboard',   color: BEVEL.purple },
    { path: '/log',       Icon: BookOpen,    label: 'Daily Log',   color: BEVEL.blue },
    { path: '/journal',   Icon: BookMarked,  label: 'Journal',     color: BEVEL.purple },
    { path: '/trading-journal', Icon: LineChart, label: 'Trades',  color: BEVEL.orange },
    ...(fitnessEnabled ? [{ path: '/fitness', Icon: Dumbbell, label: 'Fitness', color: BEVEL.red }] : []),
    { path: '/habits',    Icon: CheckSquare, label: 'Habits',      color: BEVEL.green },
    { path: '/todo',      Icon: CheckSquare, label: 'Tasks',       color: BEVEL.blue },
    { path: '/health-sync', Icon: Watch,     label: 'Health Sync', color: BEVEL.green },
    { path: '/stats',     Icon: BarChart2,   label: 'Stats',       color: BEVEL.orange },
    { path: '/profile',   Icon: User,        label: 'Profile',     color: BEVEL.text },
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
      className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-[220px] z-30"
      style={{ background: BEVEL.bgEnd, borderRight: '1px solid var(--bevel-border)' }}
    >
      {/* ── Logo + Wordmark ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--bevel-border)' }}>
        <img
          src="/logo.png"
          alt="LifeTracker logo"
          className="w-8 h-8 rounded-xl object-cover"
          style={{ border: '1px solid var(--bevel-border)', boxShadow: '0 0 12px rgba(175,82,222,0.15)' }}
        />
        <span style={{ fontSize: 14, fontWeight: 800, color: BEVEL.text, letterSpacing: '-0.01em' }}>
          LifeTracker
        </span>
      </div>

      {/* ── User Account Chip ────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 mx-3 mt-4 mb-2 cursor-pointer transition-colors"
        style={{ padding: '0.6rem 0.75rem', borderRadius: 14, background: 'rgba(255,255,255,0.05)' }}
        onClick={() => navigate('/profile')}
        role="button"
        aria-label="Go to profile"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            style={{ border: '1px solid var(--bevel-border)' }}
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #A855F7, #3B82F6)', color: '#fff' }}
          >
            {avatarLetter}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p style={{ fontSize: 12, fontWeight: 700, color: BEVEL.text, margin: 0, lineHeight: 1.3 }} className="truncate">
            {displayName}
          </p>
          {user?.email && (
            <p style={{ fontSize: 10, color: BEVEL.muted, margin: 0, lineHeight: 1.3 }} className="truncate">
              {user.email}
            </p>
          )}
        </div>
      </div>

      {/* ── Nav Items ─────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto no-scrollbar">
        <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: BEVEL.muted, padding: '0.4rem 0.75rem 0.5rem' }}>
          Navigation
        </p>
        {items.map(({ path, Icon, label, color }) => {
          const active = isActive(path)
          return (
            <button
              key={path}
              id={`sidebar-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              className="w-full flex items-center gap-3 transition-all duration-150 active:scale-[0.98]"
              style={{
                padding: '0.6rem 0.75rem',
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 600,
                background: active ? `${color}16` : 'transparent',
                color: active ? color : BEVEL.muted,
              }}
            >
              <Icon size={16} style={{ color: active ? color : BEVEL.muted }} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      {/* ── Points Badge ──────────────────────────────────────── */}
      <div className="px-4 pb-5 pt-3" style={{ borderTop: '1px solid var(--bevel-border)' }}>
        <div
          className="flex items-center gap-2"
          style={{ padding: '0.6rem 0.75rem', borderRadius: 14, background: `${BEVEL.orange}14` }}
        >
          <Flame size={14} style={{ color: BEVEL.orange }} className="flex-shrink-0" />
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: BEVEL.orange, margin: 0, lineHeight: 1.2 }} className="tabular-nums">
              {totalPoints.toLocaleString()}
            </p>
            <p style={{ fontSize: 10, color: `${BEVEL.orange}99`, margin: 0, lineHeight: 1.2 }}>total pts</p>
          </div>
        </div>
      </div>
    </aside>
  )
}