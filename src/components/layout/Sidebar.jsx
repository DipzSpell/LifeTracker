/**
 * Sidebar.jsx — Desktop left sidebar (lg+ breakpoint only)
 *
 * Design-system styling: --bg-elevated surface, active item = cyan tint
 * pill + cyan icon, hover = glass bg, glass-card user chip, lime
 * flame + mono number points badge.
 * Hidden on mobile (the BottomNav handles mobile navigation).
 */
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, BookOpen, BarChart2, CheckSquare, User, Dumbbell, Flame, BookMarked, LineChart, Watch } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'

const CYAN = '#22D3EE'
const LIME = '#A3E635'
const MONO = "'JetBrains Mono', ui-monospace, monospace"

export default function Sidebar() {
  const { settings, totalPoints } = useApp()
  const { user } = useAuth()
  const location  = useLocation()
  const navigate  = useNavigate()

  const fitnessEnabled = settings?.fitnessTrackerEnabled !== false

  const items = [
    { path: '/dashboard', Icon: Home,        label: 'Dashboard' },
    { path: '/log',       Icon: BookOpen,    label: 'Daily Log' },
    { path: '/journal',   Icon: BookMarked,  label: 'Journal' },
    { path: '/trading-journal', Icon: LineChart, label: 'Trades' },
    ...(fitnessEnabled ? [{ path: '/fitness', Icon: Dumbbell, label: 'Fitness' }] : []),
    { path: '/habits',    Icon: CheckSquare, label: 'Habits' },
    { path: '/todo',      Icon: CheckSquare, label: 'Tasks' },
    { path: '/health-sync', Icon: Watch,     label: 'Health Sync' },
    { path: '/stats',     Icon: BarChart2,   label: 'Stats' },
    { path: '/profile',   Icon: User,        label: 'Profile' },
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
      style={{ background: 'var(--bg-elevated)', borderRight: '1px solid var(--border-subtle)' }}
    >
      {/* ── Logo + Wordmark ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <img
          src="/logo.png"
          alt="LifeTracker logo"
          className="w-8 h-8 rounded-xl object-cover"
          style={{ border: '1px solid var(--border-subtle)', boxShadow: '0 0 12px var(--accent-glow)' }}
        />
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          LifeTracker
        </span>
      </div>

      {/* ── User Account Chip ────────────────────────────────── */}
      <div
        className="glass-card flex items-center gap-2.5 mx-3 mt-4 mb-2 cursor-pointer transition-colors"
        style={{ padding: '0.6rem 0.75rem', borderRadius: 14 }}
        onClick={() => navigate('/profile')}
        role="button"
        aria-label="Go to profile"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
            style={{ border: '1px solid var(--border-subtle)' }}
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(34,211,238,0.15)', border: `1px solid ${CYAN}55`, color: CYAN }}
          >
            {avatarLetter}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }} className="truncate">
            {displayName}
          </p>
          {user?.email && (
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0, lineHeight: 1.3 }} className="truncate">
              {user.email}
            </p>
          )}
        </div>
      </div>

      {/* ── Nav Items ─────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto no-scrollbar">
        <p className="section-label" style={{ padding: '0.4rem 0.75rem 0.5rem' }}>
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
              className="w-full flex items-center gap-3 transition-all duration-150 active:scale-[0.98]"
              style={{
                padding: '0.6rem 0.75rem',
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 600,
                background: active ? 'rgba(34,211,238,0.12)' : 'transparent',
                border: active ? '1px solid rgba(34,211,238,0.25)' : '1px solid transparent',
                color: active ? CYAN : 'var(--text-muted)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-glass)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={16} style={{ color: active ? CYAN : 'var(--text-muted)' }} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>

      {/* ── Points Badge ──────────────────────────────────────── */}
      <div className="px-4 pb-5 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div
          className="flex items-center gap-2"
          style={{ padding: '0.6rem 0.75rem', borderRadius: 14, background: 'rgba(163,230,53,0.10)', border: '1px solid rgba(163,230,53,0.25)' }}
        >
          <Flame size={14} style={{ color: LIME }} className="flex-shrink-0" />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO, color: LIME, margin: 0, lineHeight: 1.2 }}>
              {totalPoints.toLocaleString()}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(163,230,53,0.6)', margin: 0, lineHeight: 1.2 }}>total pts</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
