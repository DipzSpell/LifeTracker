import { format } from 'date-fns'
import { Flame } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { useThemeColors } from '../../hooks/useThemeColors'
import AnimatedNumber from '../ui/AnimatedNumber'
import NotificationBell from './NotificationBell'
import Logo from '../Logo'

// ── TopBar — sticky mobile header shown on every page except Dashboard
//    (Dashboard has its own consolidated header; see Dashboard.jsx) ──────────
export default function TopBar() {
  const { user } = useAuth()
  const { totalPoints, todayPoints, profile } = useApp()
  const T = useThemeColors()
  const today = format(new Date(), 'EEE, MMM d')
  const greetingName = profile?.displayName || user?.displayName || 'Champion'

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 transition-colors duration-300">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        {/* User + Date + Logo */}
        <div className="flex items-center gap-2.5">
          <Logo
            size={32}
            className="rounded-lg border border-white/10"
            style={{ boxShadow: '0 0 12px var(--accent-glow)' }}
          />
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 font-medium leading-none mb-1">{today}</span>
            <span className="text-sm font-semibold text-white leading-none">
              Hey, {greetingName} 👋
            </span>
          </div>
        </div>

        {/* Points + Bell */}
        <div className="flex items-center gap-3">
          {/* Live Points — lifetime total, same source as Dashboard's header badge */}
          <div
            id="topbar-points"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ background: `${T.success}1A`, border: `1px solid ${T.success}40` }}
          >
            <Flame size={14} className="streak-fire" style={{ color: T.success }} />
            <span style={{ color: T.success }}>
              <AnimatedNumber
                value={totalPoints}
                duration={800}
                className="text-sm font-bold tabular-nums"
              />
            </span>
            <span className="text-[10px] font-medium" style={{ color: `${T.success}99` }}>pts</span>
          </div>

          {/* Today's points mini badge */}
          {todayPoints > 0 && (
            <div className="hidden sm:flex items-center gap-1 rounded-full px-2 py-1" style={{ background: `${T.accent}1F`, border: `1px solid ${T.accent}4D` }}>
              <span className="text-[10px] font-semibold" style={{ color: T.accent }}>+{todayPoints} today</span>
            </div>
          )}

          <NotificationBell id="topbar-notifications" />
        </div>
      </div>
    </header>
  )
}
