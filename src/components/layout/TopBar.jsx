import { useState, useRef, useEffect } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { Flame, Bell, CheckCircle2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { useThemeColors } from '../../hooks/useThemeColors'
import AnimatedNumber from '../ui/AnimatedNumber'
import Logo from '../Logo'

// ── Icon map keyed by notification type ──────────────────────────────────────
const TYPE_CONFIG = {
  points: { icon: '⚡', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  streak: { icon: '🔥', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  system: { icon: '🔔', color: 'text-blue-400',   bg: 'bg-blue-500/10   border-blue-500/20'  },
}

// ── Single notification row ───────────────────────────────────────────────────
function NotifItem({ notif }) {
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
  const ago = formatDistanceToNow(new Date(notif.time), { addSuffix: true })

  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0 ${!notif.read ? 'bg-white/[0.03]' : ''}`}>
      {/* Type icon badge */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 border ${cfg.bg}`}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold leading-tight ${notif.read ? 'text-white/60' : 'text-white'}`}>
          {notif.title}
        </p>
        {notif.description && (
          <p className="text-[10px] text-white/40 mt-0.5 leading-relaxed">{notif.description}</p>
        )}
        <p className="text-[10px] text-white/25 mt-1">{ago}</p>
      </div>

      {/* Unread indicator */}
      {!notif.read && (
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0 mt-1 shadow-[0_0_6px_var(--primary)]" />
      )}
    </div>
  )
}

// ── Notification dropdown panel ───────────────────────────────────────────────
function NotifDropdown({ onClose }) {
  const { notifications, markAllNotificationsRead } = useApp()

  const handleMarkAll = () => {
    markAllNotificationsRead()
  }

  return (
    <motion.div
      key="notif-panel"
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden transform-gpu"
      style={{
        background: 'var(--card)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-[var(--primary)]" />
          <span className="text-sm font-bold text-white">Notifications</span>
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="text-[10px] font-bold bg-[var(--primary)]/20 text-[var(--primary)] px-1.5 py-0.5 rounded-full">
              {notifications.filter(n => !n.read).length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1 text-[10px] text-white/40 hover:text-[var(--primary)] transition-colors"
            >
              <CheckCircle2 size={10} />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors p-0.5"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="max-h-72 overflow-y-auto overscroll-contain">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
            <span className="text-2xl">✅</span>
            <p className="text-xs text-white/40 font-medium">You&apos;re all caught up!</p>
            <p className="text-[10px] text-white/25">Notifications from tasks, habits & streaks will appear here.</p>
          </div>
        ) : (
          notifications.map(n => <NotifItem key={n.id} notif={n} />)
        )}
      </div>
    </motion.div>
  )
}

// ── TopBar ────────────────────────────────────────────────────────────────────
export default function TopBar() {
  const { user } = useAuth()
  const { totalPoints, todayPoints, profile, notifications } = useApp()
  const T = useThemeColors()
  const today = format(new Date(), 'EEE, MMM d')
  const greetingName = profile?.displayName || user?.displayName || 'Champion'

  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef(null)

  const unreadCount = notifications.filter(n => !n.read).length

  // Close dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false)
      }
    }
    // small delay so the open-click itself doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', handler)
    }
  }, [bellOpen])

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
          {/* Live Points */}
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

          {/* Bell — notification trigger */}
          <div ref={bellRef} className="relative">
            <button
              id="topbar-notifications"
              onClick={() => setBellOpen(o => !o)}
              className="relative w-8 h-8 rounded-full glass-card flex items-center justify-center
                         hover:border-white/20 transition-all duration-200 active:scale-90"
            >
              <Bell size={15} className={unreadCount > 0 ? 'text-[var(--primary)]' : 'text-white/50'} />

              {/* Unread count badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full
                                 bg-[var(--primary)] text-[9px] font-bold text-black
                                 flex items-center justify-center shadow-[0_0_8px_var(--primary)]
                                 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {bellOpen && <NotifDropdown onClose={() => setBellOpen(false)} />}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
