import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { BADGES, checkBadges } from '../lib/points'
import Toast, { useToast } from '../components/ui/Toast'
import {
  User, Settings, Shield, Bell, Moon, Target, Trophy,
  LogOut, ChevronRight, Heart, Zap, Award, Lock, Unlock
} from 'lucide-react'

function BadgeCard({ badge, earned }) {
  return (
    <div className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
      earned
        ? `bg-gradient-to-r ${badge.color} bg-opacity-10 border-white/20`
        : 'border-white/5 bg-white/3 opacity-40'
    }`}>
      <span className="text-2xl">{badge.icon}</span>
      <div>
        <p className="text-xs font-bold text-white">{badge.name}</p>
        <p className="text-[10px] text-white/50">{badge.desc}</p>
      </div>
      {earned && <Zap size={12} className="text-yellow-400 ml-auto flex-shrink-0" />}
    </div>
  )
}

export default function Profile() {
  const { user, logout, updateProfile } = useAuth()
  const { dispatch, settings, dailyLogs, habits, todos, totalPoints, pointsHistory } = useApp()
  const { toasts, addToast, removeToast } = useToast()
  const [editName, setEditName] = useState(false)
  const [newName, setNewName] = useState(user?.displayName || '')
  const [showBadges, setShowBadges] = useState(false)

  const earned = checkBadges(dailyLogs, habits, todos, totalPoints)

  const updateSetting = (key, val) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: val } })
  }

  const SettingRow = ({ icon: Icon, label, children }) => (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <Icon size={15} className="text-white/40" />
        <span className="text-sm text-white">{label}</span>
      </div>
      {children}
    </div>
  )

  const Toggle = ({ value, onChange }) => (
    <button onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${value ? 'bg-cyber-500' : 'bg-white/20'}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${value ? 'left-6' : 'left-1'}`} />
    </button>
  )

  // Points breakdown
  const thisWeekPts = Object.values(pointsHistory).slice(-7).reduce((s, p) => s + (p || 0), 0)

  return (
    <div className="space-y-4 page-enter">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Profile Hero */}
      <div className="gradient-border p-5 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyber-400 to-emerald-500 mx-auto mb-3
                        flex items-center justify-center text-2xl font-bold text-white shadow-lg glow-cyan">
          {user?.displayName?.[0]?.toUpperCase() || '?'}
        </div>
        {editName ? (
          <div className="flex gap-2 justify-center">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              className="input-cyber text-sm text-center max-w-40" autoFocus />
            <button onClick={() => { updateProfile({ displayName: newName }); setEditName(false); addToast('Name updated!', 'success') }}
              className="btn-primary text-xs px-4 py-2">Save</button>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-display font-bold text-white">{user?.displayName}</h2>
            <p className="text-xs text-white/40">{user?.email}</p>
            <button onClick={() => setEditName(true)} className="text-xs text-cyber-400 hover:underline mt-1">Edit name</button>
          </div>
        )}

        {/* Stats row */}
        <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-white/10">
          <div className="text-center">
            <p className="text-xl font-bold gradient-text">{totalPoints.toLocaleString()}</p>
            <p className="text-[10px] text-white/40">Total Points</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-yellow-400">{thisWeekPts}</p>
            <p className="text-[10px] text-white/40">This Week</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-purple-400">{earned.length}</p>
            <p className="text-[10px] text-white/40">Badges</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="glass-card p-4">
        <button id="profile-badges-toggle"
          onClick={() => setShowBadges(!showBadges)}
          className="w-full flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Award size={15} className="text-yellow-400" />
            Achievements ({earned.length}/{Object.keys(BADGES).length})
          </h3>
          <ChevronRight size={15} className={`text-white/40 transition-transform ${showBadges ? 'rotate-90' : ''}`} />
        </button>
        {showBadges && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-2">
            {Object.values(BADGES).map(b => (
              <BadgeCard key={b.id} badge={b} earned={earned.includes(b.id)} />
            ))}
          </motion.div>
        )}
      </div>

      {/* Goals Settings */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Target size={15} className="text-cyber-400" />Personal Goals
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 block mb-1">Daily Step Goal</label>
            <input id="settings-stepgoal" type="number" defaultValue={settings.stepGoal || 8000}
              onBlur={e => updateSetting('stepGoal', parseInt(e.target.value))}
              className="input-cyber text-sm" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Water Goal (glasses)</label>
            <input id="settings-watergoal" type="number" defaultValue={settings.waterGoal || 8}
              onBlur={e => updateSetting('waterGoal', parseInt(e.target.value))}
              className="input-cyber text-sm" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Target Wake Time</label>
            <input id="settings-wake" type="time" defaultValue={settings.wakeGoal || '06:00'}
              onBlur={e => updateSetting('wakeGoal', e.target.value)}
              className="input-cyber text-sm" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Target Sleep Time</label>
            <input id="settings-sleep" type="time" defaultValue={settings.sleepGoal || '23:00'}
              onBlur={e => updateSetting('sleepGoal', e.target.value)}
              className="input-cyber text-sm" />
          </div>
        </div>
      </div>

      {/* App Settings */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
          <Settings size={15} className="text-white/60" />App Settings
        </h3>
        <SettingRow icon={Bell} label="Notifications">
          <Toggle value={settings.notificationsEnabled}
            onChange={v => { updateSetting('notificationsEnabled', v); if (v) Notification.requestPermission() }} />
        </SettingRow>
        <SettingRow icon={Shield} label="Privacy Mode">
          <Toggle value={settings.privacyMode || false}
            onChange={v => updateSetting('privacyMode', v)} />
        </SettingRow>
        <SettingRow icon={Heart} label="Love Tracker (PIN Protected)">
          <a href="/love" className="text-xs text-cyber-400 flex items-center gap-1">
            Open <ChevronRight size={12} />
          </a>
        </SettingRow>
      </div>

      {/* Danger Zone */}
      <div className="glass-card p-4 border-red-500/20">
        <h3 className="text-sm font-semibold text-red-400 mb-3">⚠️ Danger Zone</h3>
        <button id="profile-logout"
          onClick={() => { if (confirm('Are you sure you want to log out?')) logout() }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-all active:scale-95">
          <LogOut size={16} /> Log Out
        </button>
      </div>

      <p className="text-center text-[10px] text-white/20 pb-4">LifeTracker v1.0 · Your data stays on your device 🔐</p>
    </div>
  )
}
