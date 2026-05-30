import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { BADGES, checkBadges } from '../lib/points'
import Toast, { useToast } from '../components/ui/Toast'
import {
  Shield, Bell, Moon, Target,
  LogOut, ChevronRight, Heart, Zap, Award,
  Download, Trash2, Lock, Star,
  TrendingUp, Activity,
  Database, Info, Sun
} from 'lucide-react'

function BadgeCard({ badge, earned }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
        earned
          ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
          : 'border-white/5 bg-white/3 opacity-35'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
        earned ? 'bg-yellow-500/20' : 'bg-white/5'
      }`}>
        {badge.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate">{badge.name}</p>
        <p className="text-[10px] text-white/40 leading-snug">{badge.desc}</p>
      </div>
      {earned && (
        <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
          <Star size={10} className="text-yellow-400" fill="currentColor" />
        </div>
      )}
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
      danger ? 'border-red-500/10' : 'border-white/5'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          danger ? 'bg-red-500/15' : 'bg-white/5'
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

function Toggle({ value, onChange, color = 'bg-cyber-500' }) {
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

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout, updateProfile } = useAuth()
  const { dispatch, settings, dailyLogs, habits, todos, totalPoints, pointsHistory, fitnessLogs } = useApp()
  const { toasts, addToast, removeToast } = useToast()

  const [editName, setEditName] = useState(false)
  const [newName, setNewName] = useState(user?.displayName || '')
  const [showBadges, setShowBadges] = useState(false)
  const [activeSection, setActiveSection] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const earned = checkBadges(dailyLogs, habits, todos, totalPoints)

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

  // Export full data as JSON
  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      user: { displayName: user?.displayName, email: user?.email },
      dailyLogs,
      habits,
      todos,
      fitnessLogs,
      pointsHistory,
      settings,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `lifetracker-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    addToast('Data exported successfully! 📦', 'success')
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
    { id: 'goals', label: 'Personal Goals', icon: Target, color: 'text-cyber-400' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-yellow-400' },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield, color: 'text-emerald-400' },
    { id: 'data', label: 'Data & Export', icon: Database, color: 'text-purple-400' },
    { id: 'about', label: 'About', icon: Info, color: 'text-white/40' },
  ]

  return (
    <div className="space-y-4 page-enter pb-6">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Profile Hero ── */}
      <div className="gradient-border p-5">
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyber-400 to-emerald-500
                            flex items-center justify-center text-2xl font-bold text-white shadow-lg glow-cyan">
              {user?.displayName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500
                            border-2 border-navy-950 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>

          {/* Name + Email */}
          <div className="flex-1 min-w-0">
            {editName ? (
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="input-cyber text-sm flex-1"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      updateProfile({ displayName: newName })
                      setEditName(false)
                      addToast('Name updated! ✅', 'success')
                    }
                  }}
                />
                <button
                  onClick={() => {
                    updateProfile({ displayName: newName })
                    setEditName(false)
                    addToast('Name updated! ✅', 'success')
                  }}
                  className="btn-primary text-xs px-3 py-2"
                >
                  Save
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-display font-bold text-white leading-tight">
                  {user?.displayName || 'Champion'}
                </h2>
                <p className="text-xs text-white/40 truncate">{user?.email}</p>
                <button
                  onClick={() => setEditName(true)}
                  className="text-[10px] text-cyber-400 hover:underline mt-0.5"
                >
                  ✏️ Edit name
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          <StatBox icon="🔥" value={totalPoints.toLocaleString()} label="Total Points" color="text-orange-400" />
          <StatBox icon="📅" value={thisWeekPts} label="This Week" color="text-cyber-400" />
          <StatBox icon="🏋️" value={gymDaysTotal} label="Gym Days" color="text-emerald-400" />
          <StatBox icon="🏅" value={earned.length} label="Badges" color="text-yellow-400" />
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
            <Award size={15} className="text-yellow-400" />
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
                <BadgeCard key={b.id} badge={b} earned={earned.includes(b.id)} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Quick Links ── */}
      <div className="glass-card p-4">
        <SectionHeader icon={Zap} color="text-cyber-400" title="Quick Access" />
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Daily Log', emoji: '📓', path: '/log' },
            { label: 'Fitness', emoji: '💪', path: '/fitness' },
            { label: 'Habits', emoji: '🎯', path: '/habits' },
            { label: 'Analytics', emoji: '📊', path: '/stats' },
            { label: 'Tasks', emoji: '✅', path: '/todo' },
            { label: 'Love 🔐', emoji: '💕', path: '/love' },
          ].map(({ label, emoji, path }) => (
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
                          className="input-cyber text-sm"
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
                          className="input-cyber text-sm"
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
                          className="input-cyber text-sm"
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
                          className="input-cyber text-sm"
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
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                  isSelected
                                    ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                                    : 'border-white/10 bg-white/5 text-white/40'
                                }`}
                              >
                                {day}
                              </button>
                            )
                          })}
                        </div>
                      </div>
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

                  {/* ── PRIVACY ── */}
                  {id === 'privacy' && (
                    <div className="space-y-1">
                      <SettingRow
                        icon={Shield}
                        label="Privacy Mode"
                        sublabel="Hide sensitive data on screen"
                      >
                        <Toggle
                          value={settings.privacyMode || false}
                          onChange={v => {
                            updateSetting('privacyMode', v)
                            addToast(v ? 'Privacy mode on 🛡️' : 'Privacy mode off', 'info')
                          }}
                          color="bg-emerald-500"
                        />
                      </SettingRow>
                      <SettingRow
                        icon={Heart}
                        label="Love Tracker"
                        sublabel="PIN-protected private space"
                      >
                        <button
                          onClick={() => navigate('/love')}
                          className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 transition-colors"
                        >
                          Open <ChevronRight size={12} />
                        </button>
                      </SettingRow>
                      <SettingRow
                        icon={Lock}
                        label="Change Love Tracker PIN"
                        sublabel="Default PIN is 0000"
                      >
                        <button className="text-xs text-white/40 hover:text-white/70 transition-colors">
                          Coming soon
                        </button>
                      </SettingRow>
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
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20
                                   hover:bg-purple-500/20 transition-all active:scale-95"
                      >
                        <Download size={15} className="text-purple-400" />
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">Export Full Backup</p>
                          <p className="text-[10px] text-white/40">JSON format — all data</p>
                        </div>
                      </button>
                      <button
                        onClick={exportCSV}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-cyber-500/10 border border-cyber-500/20
                                   hover:bg-cyber-500/20 transition-all active:scale-95"
                      >
                        <TrendingUp size={15} className="text-cyber-400" />
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

                      {/* Clear data */}
                      {showClearConfirm ? (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                          <p className="text-xs text-red-300 mb-3 font-medium">
                            ⚠️ This will permanently delete ALL your data. This cannot be undone!
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowClearConfirm(false)}
                              className="flex-1 py-2 rounded-xl bg-white/10 text-white/70 text-xs font-semibold"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                localStorage.clear()
                                window.location.reload()
                              }}
                              className="flex-1 py-2 rounded-xl bg-red-500/30 text-red-300 text-xs font-semibold border border-red-500/40"
                            >
                              Yes, Delete All
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowClearConfirm(true)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20
                                     hover:bg-red-500/15 transition-all active:scale-95"
                        >
                          <Trash2 size={15} className="text-red-400" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-red-300">Clear All Data</p>
                            <p className="text-[10px] text-white/40">Permanently delete everything</p>
                          </div>
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── ABOUT ── */}
                  {id === 'about' && (
                    <div className="space-y-3">
                      <div className="text-center py-2">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyber-400 to-emerald-500
                                        mx-auto mb-3 flex items-center justify-center shadow-lg glow-cyan">
                          <Zap size={22} className="text-white" fill="currentColor" />
                        </div>
                        <p className="text-sm font-bold text-white">LifeTracker</p>
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
                      <div className="bg-cyber-500/10 border border-cyber-500/20 rounded-xl p-3">
                        <p className="text-xs text-cyber-400 font-medium mb-1">📱 Install as App</p>
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

      {/* ── Logout ── */}
      <div className="glass-card p-4 border border-red-500/15">
        <p className="text-xs text-white/30 text-center mb-3">
          Signed in as <span className="text-white/60 font-medium">{user?.email}</span>
        </p>
        <button
          id="profile-logout"
          onClick={async () => {
            try {
              await logout()
              addToast('Signed out successfully.', 'success')
            } catch (err) {
              addToast(err.message || 'Logout failed. Please try again.', 'error')
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                     border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-semibold
                     hover:bg-red-500/20 transition-all active:scale-95"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      <p className="text-center text-[10px] text-white/15 pb-2">
        LifeTracker v1.0 · Synced via Supabase 🔐
      </p>
    </div>
  )
}