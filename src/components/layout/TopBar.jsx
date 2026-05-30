import { format } from 'date-fns'
import { Flame, Bell } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'

export default function TopBar() {
  const { user } = useAuth()
  const { totalPoints, todayPoints } = useApp()
  const today = format(new Date(), 'EEE, MMM d')

  return (
    <header className="sticky top-0 z-30 bg-navy-950/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        {/* User + Date + Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="LifeTracker Logo"
            className="w-8 h-8 rounded-lg object-cover border border-white/10 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
          />
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 font-medium leading-none mb-1">{today}</span>
            <span className="text-sm font-semibold text-white leading-none">
              Hey, {user?.displayName || 'Champion'} 👋
            </span>
          </div>
        </div>

        {/* Points + Bell */}
        <div className="flex items-center gap-3">
          {/* Live Points */}
          <div
            id="topbar-points"
            className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500/20 to-yellow-500/20
                       border border-orange-500/30 rounded-full px-3 py-1.5"
          >
            <Flame size={14} className="text-orange-400 streak-fire" />
            <span className="text-sm font-bold text-orange-300">{totalPoints.toLocaleString()}</span>
            <span className="text-[10px] text-orange-400/60 font-medium">pts</span>
          </div>

          {/* Today's points mini badge */}
          {todayPoints > 0 && (
            <div className="hidden sm:flex items-center gap-1 bg-cyber-500/15 border border-cyber-500/30 rounded-full px-2 py-1">
              <span className="text-[10px] text-cyber-400 font-semibold">+{todayPoints} today</span>
            </div>
          )}

          {/* Bell */}
          <button
            id="topbar-notifications"
            className="w-8 h-8 rounded-full glass-card flex items-center justify-center
                       hover:border-white/20 transition-all duration-200 active:scale-90"
          >
            <Bell size={15} className="text-white/50" />
          </button>
        </div>
      </div>
    </header>
  )
}
