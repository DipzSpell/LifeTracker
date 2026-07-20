import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { BADGES, checkBadges } from '../lib/points'
import Toast, { useToast } from '../components/ui/Toast'
import Logo from '../components/Logo'
import { todayKey } from '../lib/storage'
import {
  Shield, Bell, Moon, Target,
  LogOut, ChevronRight, Heart, Zap, Award,
  Download, Trash2, Star,
  TrendingUp, Activity,
  Database, Info, Sun, Sliders, Volume2,
  Dumbbell, X, Plus
} from 'lucide-react'

function BadgeCard({ badge, earned, progress }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-3.5 rounded-xl border flex flex-col gap-3 transition-all duration-300 ${
        earned
          ? 'bg-[rgb(var(--warning-rgb)/0.1)] border-[rgb(var(--warning-rgb)/0.35)] shadow-[0_0_20px_rgb(var(--warning-rgb)/0.08)]'
          : 'border-white/5 bg-white/3'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Badge Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-colors ${
          earned ? 'bg-amber-400/20' : 'bg-white/5'
        }`}>
          {badge.icon}
        </div>
        
        {/* Name and Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-white truncate">{badge.name}</p>
            {progress?.today && !earned && (
              <span className="text-[9px] font-bold text-lime-400 bg-lime-400/10 border border-lime-400/20 rounded-full px-1.5 py-0.5 whitespace-nowrap animate-pulse">
                {progress.today}
              </span>
            )}
          </div>
          <p className="text-[10px] text-white/45 leading-snug mt-0.5">{badge.desc}</p>
        </div>
        
        {/* Earned Status Star / Target text */}
        {earned ? (
          <div className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center flex-shrink-0">
            <Star size={10} className="text-amber-400" fill="currentColor" />
          </div>
        ) : (
          <span className="text-[9px] font-semibold text-white/30 whitespace-nowrap">
            {progress?.text}
          </span>
        )}
      </div>

      {/* Dynamic Progress Line */}
      <div className="w-full">
        <div className="flex items-center justify-between text-[9px] text-white/35 mb-1.5">
          <span>Completion Tracker</span>
          <span className={earned ? 'text-amber-400 font-medium' : 'text-white/60 font-medium'}>
            {earned ? 'Completed' : progress?.text}
          </span>
        </div>
        
        <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress?.percentage || 0}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full bg-gradient-to-r ${
              earned 
                ? 'from-amber-400 to-amber-300' 
                : 'from-cyan-400 to-lime-400'
            }`}
          />
        </div>
      </div>
    </motion.div>
  )
}

function SectionHeader({ icon: Icon, color, title }) {
  return (
    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
      <Icon size={15} className={color} />
      {title}
    </h3>
  )
}

function SettingRow({ icon: Icon, label, sublabel, children, danger }) {
  return (
    <div className={`flex items-center justify-between py-3 border-b last:border-0 ${
      danger ? 'border-red-400/10' : 'border-white/5'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          danger ? 'bg-red-400/15' : 'bg-white/5'
        }`}>
          <Icon size={14} className={danger ? 'text-red-400' : 'text-white/40'} />
        </div>
        <div>
          <span className={`text-sm ${danger ? 'text-red-300' : 'text-white'}`}>{label}</span>
          {sublabel && <p className="text-[10px] text-white/30">{sublabel}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange, color = 'bg-cyan-400' }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
        value ? color : 'bg-white/15'
      }`}
    >
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-md"
      />
    </button>
  )
}

function StatBox({ icon, value, label, color }) {
  return (
    <div className="text-center bg-white/5 rounded-2xl p-3">
      <p className="text-lg mb-0.5">{icon}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-white/35 leading-tight">{label}</p>
    </div>
  )
}


// ─── Canonical cardio set — mirrors the one in Fitness.jsx ───────────────────
const CARDIO_TYPES = new Set(['Cardio', 'Running', 'Swimming', 'Cycling'])

const DEFAULT_WORKOUT_TYPES = [
  'Cardio', 'Running', 'Swimming', 'Cycling',
  'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core',
  'Full Body', 'HIIT', 'Yoga', 'Push', 'Pull', 'Mix',
]

function WorkoutTypeManager({ settings, updateSetting, addToast }) {
  const [newType, setNewType] = useState('')
  const types = settings?.workoutTypes?.length ? settings.workoutTypes : DEFAULT_WORKOUT_TYPES

  const handleAdd = () => {
    const trimmed = newType.trim()
    if (!trimmed) return
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
    if (types.some(t => t.toLowerCase() === capitalized.toLowerCase())) {
      addToast(`"${capitalized}" already exists`, 'error')
      return
    }
    updateSetting('workoutTypes', [...types, capitalized])
    setNewType('')
    addToast(`"${capitalized}" added! 🏋️`, 'success')
  }

  const handleRemove = (type) => {
    updateSetting('workoutTypes', types.filter(t => t !== type))
    addToast(`"${type}" removed`, 'info')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="pt-2 border-t border-white/5 mt-2">
      {/* Section label */}
      <div className="flex items-center gap-2 mb-3">
        <Dumbbell size={13} className="text-lime-400" />
        <span className="text-xs font-semibold text-white">Manage Workout Types</span>
        <span className="text-[9px] bg-white/8 text-white/40 rounded-full px-1.5 py-0.5 font-medium">
          {types.length} types
        </span>
      </div>

      {/* Add new type row */}
      <div className="flex gap-2 mb-3 items-center">
        <input
          id="settings-new-workout-type"
          type="text"
          value={newType}
          onChange={e => setNewType(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Calisthenics, Zumba…"
          maxLength={24}
          className="glass-input text-xs flex-1 py-2.5 min-h-[48px]"
        />
        <motion.button
          id="settings-add-workout-type"
          whileTap={{ scale: 0.93 }}
          onClick={handleAdd}
          disabled={!newType.trim()}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[48px] min-w-[48px] rounded-xl text-xs font-semibold
                     bg-lime-400/20 border border-lime-400/30 text-lime-300
                     hover:bg-lime-400/30 hover:border-lime-400/50
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-150"
        >
          <Plus size={13} />
          Add
        </motion.button>
      </div>

      {/* Cardio types */}
      <div className="mb-3">
        <p className="text-[10px] uppercase tracking-wider text-cyan-400/60 font-semibold mb-1.5">
          🏃 Cardio
        </p>
        <div className="flex flex-wrap gap-1.5">
          <AnimatePresence>
            {types.filter(t => CARDIO_TYPES.has(t)).map(type => (
              <motion.div
                key={type}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium
                           border border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
              >
                {type}
                <button
                  id={`settings-remove-workout-${type.toLowerCase()}`}
                  onClick={() => handleRemove(type)}
                  className="text-cyan-400/50 hover:text-red-400 transition-colors ml-1 p-2 -m-2 flex items-center justify-center min-w-[28px] min-h-[28px]"
                  aria-label={`Remove ${type}`}
                >
                  <X size={12} />
                </button>
              </motion.div>
            ))}
            {/* User-added cardio types not in the canonical set won't show here;
                they land in the Strength bucket below */}
          </AnimatePresence>
          {types.filter(t => CARDIO_TYPES.has(t)).length === 0 && (
            <p className="text-[10px] text-white/25 italic">No cardio types</p>
          )}
        </div>
      </div>

      {/* Strength / Gym types */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-lime-400/60 font-semibold mb-1.5">
          🏋️ Strength / Gym
        </p>
        <div className="flex flex-wrap gap-1.5">
          <AnimatePresence>
            {types.filter(t => !CARDIO_TYPES.has(t)).map(type => (
              <motion.div
                key={type}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium
                           border border-lime-400/30 bg-lime-400/10 text-lime-300"
              >
                {type}
                <button
                  id={`settings-remove-workout-${type.toLowerCase()}`}
                  onClick={() => handleRemove(type)}
                  className="text-lime-400/50 hover:text-red-400 transition-colors ml-1 p-2 -m-2 flex items-center justify-center min-w-[28px] min-h-[28px]"
                  aria-label={`Remove ${type}`}
                >
                  <X size={12} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {types.filter(t => !CARDIO_TYPES.has(t)).length === 0 && (
            <p className="text-[10px] text-white/25 italic">No strength types</p>
          )}
        </div>
      </div>

      <p className="text-[10px] text-white/25 mt-2 leading-relaxed">
        New types added here appear instantly on the Fitness log screen. Custom types land in the Strength bucket.
      </p>
    </div>
  )
}

export default function Profile() {

  const navigate = useNavigate()
  const { user, logout, updateProfile } = useAuth()
  const { dispatch, settings, dailyLogs, habits, todos, totalPoints, pointsHistory, fitnessLogs, resetAppState, getHabitStreak, loveTracker, notifications } = useApp()
  const { toasts, addToast, removeToast } = useToast()
  const theme = settings?.theme || 'dark'

  const [editProfile, setEditProfile] = useState(false)
  const [newName, setNewName] = useState(user?.displayName || '')
  const [newAvatar, setNewAvatar] = useState(user?.avatar || '')
  const [showBadges, setShowBadges] = useState(false)
  const [activeSection, setActiveSection] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const earned = checkBadges(dailyLogs, habits, todos, totalPoints)

  const getBadgeProgress = (badgeId) => {
    const isEarned = earned.includes(badgeId)
    const today = todayKey()
    const todayLog = dailyLogs[today] || {}
    const todayFitness = fitnessLogs[today] || {}
    const todaySteps = parseInt(todayFitness.steps || todayLog.steps) || 0
    const todayWater = parseInt(todayFitness.waterGlasses || todayLog.waterGlasses) || 0
    const todayMeditate = !!todayLog.meditated
    const todayGym = todayLog.gymStatus === 'done'
    const todaySleepOnTime = !!todayLog.sleptOnTime

    const sortedDays = Object.keys(dailyLogs).sort()

    switch (badgeId) {
      case 'WARRIOR_7': {
        let currentStreak = 0
        for (let i = sortedDays.length - 1; i >= 0; i--) {
          const d = sortedDays[i]
          if (dailyLogs[d]?.gymStatus === 'done') {
            currentStreak++
          } else if (dailyLogs[d]?.gymStatus !== 'rest') {
            break
          }
        }
        const current = isEarned ? 7 : currentStreak
        const pct = isEarned ? 100 : Math.min(100, Math.round((currentStreak / 7) * 100))
        return {
          current,
          target: 7,
          percentage: pct,
          text: `${current} / 7 days`,
          today: todayGym ? '🏋️ Gym done! +1' : null
        }
      }
      case 'CLEAN_WEEK': {
        const goodHabits = Object.values(habits).filter(h => h.type === 'good')
        let cleanDays = 0
        for (let i = sortedDays.length - 1; i >= 0; i--) {
          const d = sortedDays[i]
          const allDone = goodHabits.length > 0 && goodHabits.every(h => h.entries?.[d]?.status === 'done')
          if (allDone) {
            cleanDays++
          } else {
            break
          }
        }
        const current = isEarned ? 7 : cleanDays
        const pct = isEarned ? 100 : Math.min(100, Math.round((cleanDays / 7) * 100))
        const todayAllDone = goodHabits.length > 0 && goodHabits.every(h => h.entries?.[today]?.status === 'done')
        return {
          current,
          target: 7,
          percentage: pct,
          text: `${current} / 7 days`,
          today: todayAllDone ? '✨ All good habits done!' : null
        }
      }
      case 'EARLY_BIRD': {
        const wokeEarlyToday = !!todayLog.wokeEarly
        const current = isEarned ? 1 : 0
        return {
          current,
          target: 1,
          percentage: current * 100,
          text: `${current} / 1 times`,
          today: wokeEarlyToday ? '🌅 Woke early today!' : null
        }
      }
      case 'STEP_MASTER': {
        const current = isEarned ? 10000 : Math.min(10000, todaySteps)
        const pct = isEarned ? 100 : Math.min(100, Math.round((current / 10000) * 100))
        return {
          current,
          target: 10000,
          percentage: pct,
          text: `${current.toLocaleString()} / 10,000 steps`,
          today: todaySteps > 0 ? `👟 +${todaySteps.toLocaleString()} steps today` : null
        }
      }
      case 'HYDRATION_HERO': {
        let streak = 0
        for (let i = sortedDays.length - 1; i >= 0; i--) {
          const d = sortedDays[i]
          const water = parseInt(dailyLogs[d]?.waterGlasses || fitnessLogs[d]?.waterGlasses) || 0
          if (water >= 8) {
            streak++
          } else {
            break
          }
        }
        const current = isEarned ? 7 : streak
        const pct = isEarned ? 100 : Math.min(100, Math.round((streak / 7) * 100))
        return {
          current: current,
          target: 7,
          percentage: pct,
          text: `${current} / 7 days`,
          today: todayWater > 0 ? `💧 +${todayWater} glasses today` : null
        }
      }
      case 'ZEN_MASTER': {
        let streak = 0
        for (let i = sortedDays.length - 1; i >= 0; i--) {
          const d = sortedDays[i]
          if (dailyLogs[d]?.meditated) {
            streak++
          } else {
            break
          }
        }
        const current = isEarned ? 7 : streak
        const pct = isEarned ? 100 : Math.min(100, Math.round((streak / 7) * 100))
        return {
          current: current,
          target: 7,
          percentage: pct,
          text: `${current} / 7 days`,
          today: todayMeditate ? '🧘 Meditated today!' : null
        }
      }
      case 'CENTURION': {
        const pct = Math.min(100, Math.round((totalPoints / 1000) * 100))
        const todayPoints = pointsHistory[today] || 0
        return {
          current: totalPoints,
          target: 1000,
          percentage: pct,
          text: `${totalPoints.toLocaleString()} / 1,000 pts`,
          today: todayPoints > 0 ? `🔥 +${todayPoints} pts today` : null
        }
      }
      case 'DIAMOND': {
        const habitList = Object.values(habits)
        let maxStreak = 0
        habitList.forEach(h => {
          const streak = getHabitStreak(h.id)
          if (streak > maxStreak) maxStreak = streak
        })
        const current = isEarned ? 30 : maxStreak
        const pct = isEarned ? 100 : Math.min(100, Math.round((maxStreak / 30) * 100))
        const todayDoneAny = habitList.some(h => h.entries?.[today]?.status === 'done')
        return {
          current,
          target: 30,
          percentage: pct,
          text: `${current} / 30 days`,
          today: todayDoneAny ? '💎 Streak preserved' : null
        }
      }
      case 'NIGHT_OWL_TAMED': {
        let streak = 0
        for (let i = sortedDays.length - 1; i >= 0; i--) {
          const d = sortedDays[i]
          if (dailyLogs[d]?.sleptOnTime) {
            streak++
          } else {
            break
          }
        }
        const current = isEarned ? 5 : streak
        const pct = isEarned ? 100 : Math.min(100, Math.round((streak / 5) * 100))
        return {
          current: current,
          target: 5,
          percentage: pct,
          text: `${current} / 5 days`,
          today: todaySleepOnTime ? '🌙 Slept on time today!' : null
        }
      }
      case 'TASK_KING': {
        const completedCount = todos.filter(t => t.status === 'done').length
        const pct = Math.min(100, Math.round((completedCount / 50) * 100))
        const todayDoneCount = todos.filter(t => t.completedDate === today && t.status === 'done').length
        return {
          current: completedCount,
          target: 50,
          percentage: pct,
          text: `${completedCount} / 50 tasks`,
          today: todayDoneCount > 0 ? `👑 +${todayDoneCount} done today` : null
        }
      }
      default:
        return { current: 0, target: 100, percentage: 0, text: '0%', today: null }
    }
  }

  const updateSetting = (key, val) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: val } })
  }

  // Stats
  const thisWeekPts = Object.entries(pointsHistory)
    .filter(([d]) => {
      const date = new Date(d)
      const now = new Date()
      const diff = (now - date) / (1000 * 60 * 60 * 24)
      return diff <= 7
    })
    .reduce((s, [, p]) => s + (p || 0), 0)

  const totalDaysLogged = Object.keys(dailyLogs).length
  const gymDaysTotal = Object.values(dailyLogs).filter(l => l.gymStatus === 'done').length

  // Export full data as JSON — lifenotebook_backup.json
  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      user: {
        displayName: user?.displayName,
        email: user?.email,
        provider: user?.provider,
        uid: user?.uid ? `${user.uid.slice(0, 8)}…` : null, // masked for safety
      },
      dailyLogs,
      habits,
      todos,
      fitnessLogs,
      pointsHistory,
      settings,
      loveTracker: loveTracker || {},
      earnedBadges: earned,
      notifications: notifications || [],
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `lifenotebook_backup.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
    addToast('Personal data exported — lifenotebook_backup.json 📦', 'success')
  }

  // Export CSV summary
  const exportCSV = () => {
    const rows = [['Date', 'Gym', 'Mood', 'Water', 'Steps', 'Wake', 'Sleep', 'Points']]
    Object.entries(dailyLogs).sort().forEach(([d, log]) => {
      rows.push([
        d,
        log.gymStatus || '',
        log.mood || '',
        log.waterGlasses || 0,
        log.steps || 0,
        log.wakeTime || '',
        log.sleepTime || '',
        pointsHistory[d] || 0,
      ])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `lifetracker-data-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    addToast('CSV exported! 📊', 'success')
  }

  const sections = [
    { id: 'goals', label: 'Personal Goals', icon: Target, color: 'text-cyan-400' },
    { id: 'appearance', label: 'Appearance & Theme', icon: Moon, color: 'text-violet-400' },
    { id: 'control-center', label: 'Control Center & Toggles', icon: Sliders, color: 'text-cyan-400' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-amber-400' },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield, color: 'text-lime-400' },
    { id: 'data', label: 'Data & Export', icon: Database, color: 'text-violet-400' },
    { id: 'about', label: 'About', icon: Info, color: 'text-white/40' },
  ]

  return (
    <div className="space-y-4 page-enter pb-6">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Profile Hero ── */}
      <div className="gradient-border p-5">
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.displayName}
                className="w-16 h-16 rounded-2xl object-cover border border-white/10 shadow-lg glow-cyan"
                onError={(e) => {
                  e.target.onerror = null
                  e.target.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-lime-400
                              flex items-center justify-center text-2xl font-bold text-white shadow-lg glow-cyan">
                {user?.displayName?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-lime-400
                            border-2 border-navy-950 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>

          {/* Name + Email */}
          <div className="flex-1 min-w-0">
            {editProfile ? (
              <div className="space-y-2 mt-1">
                <div>
                  <label className="text-[10px] text-white/40 block mb-0.5 font-medium">Display Name</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="glass-input text-xs w-full py-1.5 px-2"
                    placeholder="Display name"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 block mb-0.5 font-medium">Avatar URL</label>
                  <input
                    value={newAvatar}
                    onChange={e => setNewAvatar(e.target.value)}
                    className="glass-input text-xs w-full py-1.5 px-2"
                    placeholder="https://example.com/avatar.png"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={async () => {
                      try {
                        await updateProfile({ displayName: newName, avatarUrl: newAvatar })
                        setEditProfile(false)
                        addToast('Profile updated! ✅', 'success')
                      } catch (err) {
                        addToast(err.message || 'Update failed', 'error')
                      }
                    }}
                    className="glass-btn glass-btn-accent text-xs px-3 py-1.5 flex-1"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setNewName(user?.displayName || '')
                      setNewAvatar(user?.avatar || '')
                      setEditProfile(false)
                    }}
                    className="btn-secondary text-xs px-3 py-1.5 bg-white/5 text-white/60 hover:bg-white/10 flex-1 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-display font-bold text-white leading-tight">
                  {user?.displayName || 'Champion'}
                </h2>
                <p className="text-xs text-white/40 truncate">{user?.email}</p>
                <button
                  onClick={() => {
                    setNewName(user?.displayName || '')
                    setNewAvatar(user?.avatar || '')
                    setEditProfile(true)
                  }}
                  className="text-[10px] text-cyan-400 hover:underline mt-0.5"
                >
                  ✏️ Edit Profile
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          <StatBox icon="🔥" value={totalPoints.toLocaleString()} label="Total Points" color="text-lime-400" />
          <StatBox icon="📅" value={thisWeekPts} label="This Week" color="text-cyan-400" />
          <StatBox icon="🏋️" value={gymDaysTotal} label="Gym Days" color="text-lime-400" />
          <StatBox icon="🏅" value={earned.length} label="Badges" color="text-amber-400" />
        </div>

        {/* Streak info */}
        <div className="mt-3 flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
          <span className="text-xs text-white/50">Days Logged</span>
          <span className="text-sm font-bold text-white">{totalDaysLogged} days 📓</span>
        </div>
      </div>

      {/* ── Achievements ── */}
      <div className="glass-card p-4">
        <button
          id="profile-badges-toggle"
          onClick={() => setShowBadges(!showBadges)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Award size={15} className="text-amber-400" />
            Achievements
            <span className="badge-yellow text-[10px]">{earned.length}/{Object.keys(BADGES).length}</span>
          </h3>
          <ChevronRight
            size={15}
            className={`text-white/40 transition-transform duration-200 ${showBadges ? 'rotate-90' : ''}`}
          />
        </button>

        <AnimatePresence>
          {showBadges && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-2 overflow-hidden"
            >
              {Object.values(BADGES).map(b => (
                <BadgeCard key={b.id} badge={b} earned={earned.includes(b.id)} progress={getBadgeProgress(b.id)} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Quick Links ── */}
      <div className="glass-card p-4">
        <SectionHeader icon={Zap} color="text-cyan-400" title="Quick Access" />
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Daily Log', emoji: '📓', path: '/log' },
            { label: 'Fitness', emoji: '💪', path: '/fitness', enabled: settings?.fitnessTrackerEnabled !== false },
            { label: 'Habits', emoji: '🎯', path: '/habits' },
            { label: 'Analytics', emoji: '📊', path: '/stats' },
            { label: 'Tasks', emoji: '✅', path: '/todo' },
            { label: 'Love 🔐', emoji: '💕', path: '/love', enabled: settings?.loveTrackerEnabled !== false },
          ].filter(item => item.enabled !== false).map(({ label, emoji, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10
                         hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
            >
              <span className="text-xl">{emoji}</span>
              <span className="text-[10px] text-white/60 font-medium text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Settings Accordion ── */}
      {sections.map(({ id, label, icon: Icon, color }) => (
        <div key={id} className="glass-card overflow-hidden">
          <button
            onClick={() => setActiveSection(activeSection === id ? null : id)}
            className="w-full flex items-center justify-between p-4"
          >
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Icon size={15} className={color} />
              {label}
            </span>
            <ChevronRight
              size={15}
              className={`text-white/40 transition-transform duration-200 ${activeSection === id ? 'rotate-90' : ''}`}
            />
          </button>

          <AnimatePresence>
            {activeSection === id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 border-t border-white/5 pt-3">

                  {/* ── GOALS ── */}
                  {id === 'goals' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Daily Step Goal</label>
                        <input
                          id="settings-stepgoal"
                          type="number"
                          defaultValue={settings.stepGoal || 8000}
                          onBlur={e => {
                            updateSetting('stepGoal', parseInt(e.target.value))
                            addToast('Step goal updated!', 'success')
                          }}
                          className="glass-input text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Daily Water Goal (glasses)</label>
                        <input
                          id="settings-watergoal"
                          type="number"
                          defaultValue={settings.waterGoal || 8}
                          onBlur={e => {
                            updateSetting('waterGoal', parseInt(e.target.value))
                            addToast('Water goal updated!', 'success')
                          }}
                          className="glass-input text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Target Wake Time</label>
                        <input
                          id="settings-wake"
                          type="time"
                          defaultValue={settings.wakeGoal || '06:00'}
                          onBlur={e => {
                            updateSetting('wakeGoal', e.target.value)
                            addToast('Wake goal updated!', 'success')
                          }}
                          className="glass-input text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Target Sleep Time</label>
                        <input
                          id="settings-sleep"
                          type="time"
                          defaultValue={settings.sleepGoal || '23:00'}
                          onBlur={e => {
                            updateSetting('sleepGoal', e.target.value)
                            addToast('Sleep goal updated!', 'success')
                          }}
                          className="glass-input text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 block mb-2">Gym Days (select all that apply)</label>
                        <div className="flex flex-wrap gap-2">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                            const isSelected = (settings.gymDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']).includes(day)
                            return (
                              <button
                                key={day}
                                onClick={() => {
                                  const current = settings.gymDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
                                  const updated = isSelected
                                    ? current.filter(d => d !== day)
                                    : [...current, day]
                                  updateSetting('gymDays', updated)
                                }}
                                className={`px-4 py-2.5 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-xs font-semibold border transition-all ${
                                  isSelected
                                    ? 'border-lime-400/50 bg-lime-400/20 text-lime-300'
                                    : 'border-white/10 bg-white/5 text-white/40'
                                }`}
                              >
                                {day}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* ── Manage Workout Types ── */}
                      <WorkoutTypeManager
                        settings={settings}
                        updateSetting={updateSetting}
                        addToast={addToast}
                      />
                    </div>
                  )}

                  {/* ── APPEARANCE & THEME ── */}
                  {id === 'appearance' && (
                    <div className="space-y-3">
                      <p className="text-xs text-white/40 mb-3">
                        Choose your preferred layout color theme.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { val: 'dark', label: '🌌 Dark Slate' },
                          { val: 'midnight', label: '👑 Midnight Gold' },
                          { val: 'matrix', label: '📟 Matrix Green' },
                          { val: 'cyberpunk', label: '🔮 Cyberpunk Neon' },
                          { val: 'frost', label: '❄️ Frost Ice' },
                          { val: 'system', label: '💻 System Auto' },
                        ].map(t => {
                          const isSelected = theme === t.val
                          return (
                            <button
                              key={t.val}
                              onClick={() => {
                                updateSetting('theme', t.val)
                                addToast(`Theme updated successfully!`, 'success')
                              }}
                              className={`p-3 rounded-xl border-2 text-left flex flex-col justify-between h-20 transition-all active:scale-[0.98] ${
                                isSelected
                                  ? 'border-cyan-400 bg-cyan-400/10'
                                  : 'border-white/5 bg-white/3 hover:border-white/10'
                              }`}
                            >
                              <span className={`text-xs font-semibold ${isSelected ? 'text-cyan-300' : 'text-white/80'}`}>{t.label}</span>
                              <div className="flex gap-1.5 mt-2">
                                {t.val === 'dark' && (
                                  <>
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#22d3ee]" />
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#0b0e14]" />
                                  </>
                                )}
                                {t.val === 'midnight' && (
                                  <>
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#f59e0b]" />
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#0b0f19]" />
                                  </>
                                )}
                                {t.val === 'matrix' && (
                                  <>
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#22c55e]" />
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#000000]" />
                                  </>
                                )}
                                {t.val === 'cyberpunk' && (
                                  <>
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#ec4899]" />
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#1e0b36]" />
                                  </>
                                )}
                                {t.val === 'frost' && (
                                  <>
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#0284c7]" />
                                    <div className="w-3.5 h-3.5 rounded-full bg-[#f8fafc] border border-slate-300" />
                                  </>
                                )}
                                {t.val === 'system' && (
                                  <>
                                    <div className="w-3.5 h-3.5 rounded-full bg-slate-400" />
                                    <div className="w-3.5 h-3.5 rounded-full bg-slate-600" />
                                  </>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── CONTROL CENTER ── */}
                  {id === 'control-center' && (
                    <div className="space-y-1">
                      <SettingRow
                        icon={Moon}
                        label="Sleep Tracker"
                        sublabel="Track wake/sleep times and goals"
                      >
                        <Toggle
                          value={settings.sleepTrackerEnabled !== false}
                          onChange={v => {
                            updateSetting('sleepTrackerEnabled', v)
                            addToast(v ? 'Sleep Tracker enabled! 😴' : 'Sleep Tracker disabled', 'info')
                          }}
                        />
                      </SettingRow>
                      <SettingRow
                        icon={Heart}
                        label="Love Tracker"
                        sublabel="PIN-protected private journal & dates"
                      >
                        <Toggle
                          value={settings.loveTrackerEnabled !== false}
                          onChange={v => {
                            updateSetting('loveTrackerEnabled', v)
                            addToast(v ? 'Love Tracker enabled! 💕' : 'Love Tracker disabled', 'info')
                          }}
                          color="bg-violet-400"
                        />
                      </SettingRow>
                      <SettingRow
                        icon={Activity}
                        label="Fitness Tracker"
                        sublabel="Track gym days, steps, and exercises"
                      >
                        <Toggle
                          value={settings.fitnessTrackerEnabled !== false}
                          onChange={v => {
                            updateSetting('fitnessTrackerEnabled', v)
                            addToast(v ? 'Fitness Tracker enabled! 💪' : 'Fitness Tracker disabled', 'info')
                          }}
                          color="bg-lime-400"
                        />
                      </SettingRow>
                      <SettingRow
                        icon={Volume2}
                        label="UI Sound Effects"
                        sublabel="Play synthesized clicks on interactions"
                      >
                        <Toggle
                          value={settings.soundEffectsEnabled !== false}
                          onChange={v => {
                            updateSetting('soundEffectsEnabled', v)
                            addToast(v ? 'UI Sounds enabled! 🔊' : 'UI Sounds disabled', 'info')
                          }}
                        />
                      </SettingRow>
                    </div>
                  )}

                  {/* ── NOTIFICATIONS ── */}
                  {id === 'notifications' && (
                    <div className="space-y-1">
                      <SettingRow
                        icon={Bell}
                        label="Push Notifications"
                        sublabel="Task reminders & streak alerts"
                      >
                        <Toggle
                          value={settings.notificationsEnabled || false}
                          onChange={v => {
                            updateSetting('notificationsEnabled', v)
                            if (v) {
                              Notification.requestPermission().then(perm => {
                                if (perm === 'granted') addToast('Notifications enabled! 🔔', 'success')
                                else addToast('Permission denied by browser', 'error')
                              })
                            }
                          }}
                        />
                      </SettingRow>
                      <SettingRow
                        icon={Sun}
                        label="Morning Reminder"
                        sublabel="Daily log reminder at 8AM"
                      >
                        <Toggle
                          value={settings.morningReminder || false}
                          onChange={v => {
                            updateSetting('morningReminder', v)
                            addToast(v ? 'Morning reminder on! ☀️' : 'Morning reminder off', 'info')
                          }}
                        />
                      </SettingRow>
                      <SettingRow
                        icon={Moon}
                        label="Evening Reminder"
                        sublabel="Evening log reminder at 9PM"
                      >
                        <Toggle
                          value={settings.eveningReminder || false}
                          onChange={v => {
                            updateSetting('eveningReminder', v)
                            addToast(v ? 'Evening reminder on! 🌙' : 'Evening reminder off', 'info')
                          }}
                        />
                      </SettingRow>
                      <SettingRow
                        icon={Activity}
                        label="Streak Alert"
                        sublabel="Alert when streak is at risk"
                      >
                        <Toggle
                          value={settings.streakAlert || false}
                          onChange={v => {
                            updateSetting('streakAlert', v)
                            addToast(v ? 'Streak alerts on! 🔥' : 'Streak alerts off', 'info')
                          }}
                        />
                      </SettingRow>
                    </div>
                  )}

                  {/* ── PRIVACY & SECURITY ── */}
                  {id === 'privacy' && (
                    <div className="space-y-4">

                      {/* Section intro */}
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-lime-400/8 border border-lime-400/20">
                        <div className="w-8 h-8 rounded-xl bg-lime-400/20 border border-lime-400/30 flex items-center justify-center flex-shrink-0">
                          <Shield size={15} className="text-lime-400" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-lime-300 leading-tight">Data Sovereignty Mode</p>
                          <p className="text-[10px] text-white/40 mt-0.5 leading-relaxed">
                            Your data is encrypted end-to-end via Supabase. Export or wipe it at any time. Nothing is shared with third parties.
                          </p>
                        </div>
                      </div>

                      {/* ── 1. Export My Data ── */}
                      <div>
                        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">Data Export</p>
                        <button
                          id="privacy-export-json"
                          onClick={exportData}
                          className="w-full flex items-center gap-3 p-3.5 rounded-xl
                                     bg-lime-400/10
                                     border border-lime-400/25 hover:border-lime-400/50
                                     hover:bg-lime-400/15
                                     transition-all duration-200 active:scale-[0.98] group"
                        >
                          <div className="w-9 h-9 rounded-xl bg-lime-400/20 border border-lime-400/30 flex items-center justify-center flex-shrink-0 group-hover:bg-lime-400/30 transition-colors">
                            <Download size={16} className="text-lime-400" />
                          </div>
                          <div className="text-left flex-1">
                            <p className="text-sm font-semibold text-white">Export My Personal Data</p>
                            <p className="text-[10px] text-white/40">
                              Downloads <span className="text-lime-400 font-mono">lifenotebook_backup.json</span> — habits, logs, tasks, all
                            </p>
                          </div>
                          <ChevronRight size={14} className="text-white/20 group-hover:text-lime-400 transition-colors" />
                        </button>
                      </div>

                      {/* ── 3. Session Info + Secure Disconnect ── */}
                      <div>
                        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">Active Session</p>
                        <div className="rounded-xl border border-white/8 bg-slate-900/60 p-4 space-y-3">
                          {/* Session identity */}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
                              {user?.avatar ? (
                                <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover" alt="avatar" />
                              ) : (
                                <span className="text-lg">{user?.displayName?.[0]?.toUpperCase() || '?'}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{user?.displayName || 'User'}</p>
                              <p className="text-[10px] text-white/40 truncate">
                                {user?.email
                                  ? user.email.replace(/(.{2}).+(@.+)/, '$1••••$2')
                                  : 'No email on file'
                                }
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                                <span className="text-[9px] text-lime-400 font-medium uppercase tracking-wide">Session Active</span>
                                <span className="text-[9px] text-white/20">·</span>
                                <span className="text-[9px] text-white/30 capitalize">{user?.provider || 'email'} auth</span>
                              </div>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-white/5" />

                          {/* Secure Disconnect button */}
                          <button
                            id="privacy-secure-logout"
                            onClick={async () => {
                              try {
                                await logout()
                                addToast('Securely disconnected. See you soon! 🔒', 'success')
                              } catch (err) {
                                addToast(err.message || 'Logout failed. Please try again.', 'error')
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl
                                       border border-red-400/30 bg-red-400/8
                                       text-red-400 text-xs font-semibold
                                       hover:bg-red-400/15 hover:border-red-400/50
                                       transition-all duration-200 active:scale-[0.98] group"
                          >
                            <LogOut size={14} className="group-hover:translate-x-[-2px] transition-transform" />
                            Secure Disconnect
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* ── DATA ── */}
                  {id === 'data' && (
                    <div className="space-y-3">
                      <p className="text-xs text-white/40 mb-3">
                        All your data is stored locally on this device. Export it anytime for backup.
                      </p>
                      <button
                        onClick={exportData}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-violet-400/10 border border-violet-400/20
                                   hover:bg-violet-400/20 transition-all active:scale-95"
                      >
                        <Download size={15} className="text-violet-400" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">Export Full Backup</p>
                          <p className="text-[10px] text-white/40">JSON format — all data</p>
                        </div>
                      </button>
                      <button
                        onClick={exportCSV}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-cyan-400/10 border border-cyan-400/20
                                   hover:bg-cyan-400/20 transition-all active:scale-95"
                      >
                        <TrendingUp size={15} className="text-cyan-400" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">Export CSV Summary</p>
                          <p className="text-[10px] text-white/40">Daily logs in spreadsheet format</p>
                        </div>
                      </button>

                      {/* Storage Info */}
                      <div className="bg-white/5 rounded-xl p-3 mt-2">
                        <p className="text-xs font-medium text-white mb-2">📦 Data Summary</p>
                        <div className="space-y-1">
                          {[
                            { label: 'Days Logged', val: Object.keys(dailyLogs).length },
                            { label: 'Fitness Logs', val: Object.keys(fitnessLogs).length },
                            { label: 'Habits', val: Object.keys(habits).length },
                            { label: 'Tasks', val: todos.length },
                          ].map(({ label, val }) => (
                            <div key={label} className="flex justify-between">
                              <span className="text-xs text-white/40">{label}</span>
                              <span className="text-xs text-white font-medium">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setShowClearConfirm(true)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-400/10 border border-red-400/20
                                   hover:bg-red-400/15 transition-all active:scale-95"
                      >
                        <Trash2 size={15} className="text-red-400" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-red-300">Clear All Data</p>
                          <p className="text-[10px] text-white/40">Permanently delete everything</p>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* ── ABOUT ── */}
                  {id === 'about' && (
                    <div className="space-y-3">
                      <div className="text-center py-2">
                        <Logo size={48} className="rounded-2xl mx-auto mb-3 shadow-lg" />
                        <p className="text-sm font-bold text-white">LifeNotebook</p>
                        <p className="text-xs text-white/40">Version 1.0.0</p>
                        <p className="text-xs text-white/30 mt-1">Your Personal OS 🚀</p>
                      </div>
                      <div className="space-y-1">
                        {[
                          { label: 'Built with', val: 'React + Vite + Supabase' },
                          { label: 'Storage', val: 'Supabase (Cloud Synced)' },
                          { label: 'Auth', val: 'Google OAuth + Email' },
                          { label: 'PWA', val: 'Installable on Mobile' },
                        ].map(({ label, val }) => (
                          <div key={label} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                            <span className="text-xs text-white/40">{label}</span>
                            <span className="text-xs text-white/70">{val}</span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-cyan-400/10 border border-cyan-400/20 rounded-xl p-3">
                        <p className="text-xs text-cyan-400 font-medium mb-1">📱 Install as App</p>
                        <p className="text-[10px] text-white/50 leading-relaxed">
                          On iOS: tap Share → Add to Home Screen{'\n'}
                          On Android: tap Menu → Install App
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      <p className="text-center text-[10px] text-white/15 pb-2">
        LifeNotebook v1.0 · Secured via Supabase 🔐
      </p>

      {/* Danger Zone Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="w-full max-w-md bg-card border border-red-400/30 rounded-3xl p-6 shadow-[0_0_50px_rgb(var(--danger-rgb)/0.15)] overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-400 animate-pulse" />
              
              <div className="w-12 h-12 rounded-2xl bg-red-400/20 flex items-center justify-center mx-auto mb-4 border border-red-400/30 shadow-[0_0_15px_rgb(var(--danger-rgb)/0.2)]">
                <Trash2 size={24} className="text-red-400" />
              </div>
              
              <h3 className="text-lg font-display font-bold text-white text-center mb-2">
                Are you absolutely sure?
              </h3>
              
              <p className="text-xs text-white/60 text-center leading-relaxed mb-6">
                This will wipe out all your logs, habits, tasks, points, and custom statistics from this device and Supabase. **This action is irreversible.**
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-semibold border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await resetAppState()
                      setShowClearConfirm(false)
                      addToast('Application data has been reset! 🔄', 'success')
                    } catch {
                      addToast('Failed to reset application data.', 'error')
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold border border-red-400/30 transition-colors shadow-[0_0_15px_rgb(var(--danger-rgb)/0.3)]"
                >
                  Yes, Reset All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}