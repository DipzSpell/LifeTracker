import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Flame, CheckCircle2, TrendingUp, Calendar, Plus, Moon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { todayKey, getLast7Days } from '../lib/storage'
import QuickLogModal from '../components/QuickLogModal'
import Toast, { useToast } from '../components/ui/Toast'
import { playVictorySound } from '../lib/sounds'
import AIMorningBrief, { generateDailyInsight } from '../components/AIMorningBrief'

import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: i => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' } }),
}

function calculateSleepDuration(sleepTime, wakeTime) {
  if (!sleepTime || !wakeTime) return ''
  try {
    const [sleepH, sleepM] = sleepTime.split(':').map(Number)
    const [wakeH, wakeM] = wakeTime.split(':').map(Number)
    
    if (isNaN(sleepH) || isNaN(sleepM) || isNaN(wakeH) || isNaN(wakeM)) return ''
    
    let sleepMinutes = sleepH * 60 + sleepM
    let wakeMinutes = wakeH * 60 + wakeM
    
    let diff = wakeMinutes - sleepMinutes
    if (diff < 0) {
      diff += 24 * 60 // cross-midnight math
    }
    
    const hours = Math.floor(diff / 60)
    const mins = diff % 60
    
    return `${hours}h ${mins}m`
  } catch {
    return ''
  }
}



export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    todos, habits, dailyLogs, fitnessLogs, pointsHistory,
    totalPoints, todayPoints, getHabitStreak, getUpcomingTodos, settings,
    profile, completeProfileOnboarding,
  } = useApp()
  const [quickLogOpen, setQuickLogOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  const [insight, setInsight] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Memoize good habits list
  const goodHabits = useMemo(() => {
    return Object.values(habits).filter(h => h.type === 'good')
  }, [habits])

  const loadInsight = useCallback(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const yesterdayK = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const yLog = dailyLogs[yesterdayK] || {}
    const yFitness = fitnessLogs[yesterdayK] || {}
    const pHigh = todos.filter(t => t.status === 'pending' && t.priority === 'high')
    const pMedium = todos.filter(t => t.status === 'pending' && t.priority === 'medium')

    const generated = generateDailyInsight(yLog, yFitness, goodHabits, yesterdayK, pHigh, pMedium)
    setInsight(generated)
  }, [dailyLogs, fitnessLogs, goodHabits, todos])

  useEffect(() => {
    if (dailyLogs && fitnessLogs && habits && todos) {
      loadInsight()
    }
  }, [dailyLogs, fitnessLogs, habits, todos, loadInsight])

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true)
    setTimeout(() => {
      loadInsight()
      setIsRefreshing(false)
    }, 800)
  }, [loadInsight])

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast()

  // Form state for profile completion
  const [displayName, setDisplayName] = useState('')
  const [dob, setDob] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const userProfile = profile || {}
  const showBanner = !userProfile.onboarding_completed && (!userProfile.dob || !userProfile.height || !userProfile.weight)

  useEffect(() => {
    if (profileModalOpen) {
      setDisplayName(user?.displayName || '')
      setDob(profile?.dob || '')
      setHeight(profile?.height || '')
      setWeight(profile?.weight || '')
    }
  }, [profileModalOpen, user?.displayName, profile])

  const getProgressPercentage = () => {
    let filled = 0
    if (displayName && displayName.trim() !== '') filled++
    if (dob && dob !== '') filled++
    if (height && height !== '' && parseFloat(height) > 0) filled++
    if (weight && weight !== '' && parseFloat(weight) > 0) filled++
    return (filled / 4) * 100
  }
  const progressPercentage = getProgressPercentage()

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    if (!displayName || !dob || !height || !weight || progressPercentage < 100) return

    setSubmitting(true)
    try {
      playVictorySound()
      await completeProfileOnboarding(displayName, dob, parseFloat(height), parseFloat(weight))
      addToast('Profile Completed! +15 Points added to your account! 🔥', 'success')
      setProfileModalOpen(false)
    } catch (err) {
      console.error('Failed to update profile:', err)
      addToast(err.message || 'Failed to update profile', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const today = todayKey()
  const todayLog = dailyLogs[today] || {}
  const todayFitness = fitnessLogs[today] || {}

  // Today's habits
  const doneToday = goodHabits.filter(h => h.entries?.[today]?.status === 'done').length
  const habitPct = goodHabits.length ? Math.round((doneToday / goodHabits.length) * 100) : 0

  // Top streaks
  const topStreaks = Object.values(habits)
    .map(h => ({ ...h, streak: getHabitStreak(h.id) }))
    .filter(h => h.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 4)

  // Upcoming tasks
  const upcomingTasks = getUpcomingTodos(2)

  // Weekly points chart data
  const weekDays = getLast7Days()
  const weekChartData = weekDays.map(d => ({
    day: format(new Date(d), 'EEE'),
    pts: pointsHistory[d] || 0,
  }))

  return (
    <div className="space-y-4 page-enter">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Dynamic Profile Check & Dashboard Notification Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="overflow-hidden"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/90 via-indigo-600/95 to-indigo-700/90 p-4 shadow-lg border border-amber-500/30 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0 animate-bounce">🎁</span>
                <div>
                  <h4 className="text-sm font-bold text-amber-200">Welcome Back!</h4>
                  <p className="text-xs text-white/95 font-medium">
                    Complete your profile setup to unlock full stats and earn +15 points!
                  </p>
                </div>
              </div>
              <button
                id="complete-setup-btn"
                onClick={() => setProfileModalOpen(true)}
                className="flex-shrink-0 bg-amber-400 hover:bg-amber-300 text-navy-950 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 text-center"
              >
                Complete Setup
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Welcome Greeting ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="px-1"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
          {format(new Date(), 'EEEE, MMMM d · yyyy')}
        </p>
        <h1 className="text-lg font-display font-bold text-white mt-0.5 leading-tight">
          Good{new Date().getHours() < 12 ? ' Morning' : new Date().getHours() < 17 ? ' Afternoon' : ' Evening'},{' '}
          <span className="text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(90deg, var(--primary), var(--accent))' }}>
            {profile?.displayName?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'there'}
          </span>{' '}✦
        </h1>
      </motion.div>

      {/* ── AI Morning Brief & Vibe Check ─────────────────────── */}
      <AIMorningBrief
        insight={insight}
        onRefresh={triggerRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Hero — Today Summary */}
      <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
        <div className="gradient-border p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Today's Overview</p>
              <h2 className="text-xl font-display font-bold text-white mt-0.5">
                {format(new Date(), 'EEEE, MMMM d')}
              </h2>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-full px-3 py-1">
                <Flame size={14} className="text-orange-400 streak-fire" />
                <span className="text-base font-bold text-orange-300">{totalPoints.toLocaleString()}</span>
              </div>
              {todayPoints > 0 && (
                <span className="text-[10px] text-cyber-400 mt-1">+{todayPoints} today</span>
              )}
            </div>
          </div>

          {/* Quick stats row */}
          {(() => {
            const fitnessEnabled = settings?.fitnessTrackerEnabled !== false
            const statsItems = [
              {
                label: 'Habits',
                value: `${doneToday}/${goodHabits.length}`,
                sub: `${habitPct}% done`,
                color: habitPct >= 80 ? 'text-emerald-400' : habitPct >= 50 ? 'text-yellow-400' : 'text-red-400',
                icon: '✨',
              },
              fitnessEnabled && {
                label: 'Steps',
                value: (todayFitness.steps || todayLog.steps || 0).toLocaleString(),
                sub: `Goal: ${(settings.stepGoal || 8000).toLocaleString()}`,
                color: 'text-cyber-400',
                icon: '👟',
              },
              {
                label: 'Mood',
                value: todayLog.mood ? ['', '😭','😢','😟','😐','🙂','😊','😄','😁','🤩','🥳'][todayLog.mood] : '—',
                sub: todayLog.mood ? `${todayLog.mood}/10` : 'Not logged',
                color: 'text-purple-400',
                icon: '💭',
              },
            ].filter(Boolean)

            return (
              <div className={`grid ${statsItems.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
                {statsItems.map((stat, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-lg">{stat.icon}</p>
                    <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{stat.sub}</p>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      </motion.div>

      {/* Quick Log Button */}
      {!todayLog.loggedAt && (
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
          <button
            id="dashboard-quick-log"
            onClick={() => setQuickLogOpen(true)}
            className="w-full glass-card p-4 flex items-center gap-3 border-dashed border-cyber-500/30
                       hover:border-cyber-400/50 hover:bg-white/8 transition-all duration-200 active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-cyber-500/20 flex items-center justify-center">
              <Plus size={20} className="text-cyber-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Quick Log Today</p>
              <p className="text-xs text-white/40">Tap to log your day in 30 seconds</p>
            </div>
            <div className="ml-auto">
              <span className="badge-cyan">Today</span>
            </div>
          </button>
        </motion.div>
      )}

      {/* Habits Progress Card */}
      <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible"
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => navigate('/habits')}
                  className="cursor-pointer">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Today's Habits
            </h3>
            <span className={`text-sm font-bold ${habitPct >= 80 ? 'text-emerald-400' : 'text-white/60'}`}>
              {habitPct}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="progress-bar mb-3">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${habitPct}%` }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            />
          </div>

          {/* Habit pills */}
          <div className="flex flex-wrap gap-2">
            {goodHabits.slice(0, 6).map(h => {
              const done = h.entries?.[today]?.status === 'done'
              return (
                <div
                  key={h.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                    done
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/5 text-white/40 border border-white/10'
                  }`}
                >
                  <span>{h.icon}</span>
                  <span>{h.name}</span>
                  {done && <CheckCircle2 size={10} />}
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* Streaks Card */}
      {topStreaks.length > 0 && (
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible"
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate('/habits')}
                    className="cursor-pointer">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Flame size={16} className="text-orange-400 streak-fire" />
              Active Streaks
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {topStreaks.map(h => (
                <div key={h.id} className="flex items-center gap-2 bg-white/5 rounded-xl p-2.5">
                  <span className="text-lg">{h.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{h.name}</p>
                    <p className="text-xs text-orange-400 font-bold">{h.streak}🔥 day streak</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible"
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate('/todo')}
                    className="cursor-pointer">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar size={16} className="text-cyber-400" />
                Upcoming Tasks
              </h3>
              <span className="text-xs text-white/40">{upcomingTasks.length} tasks</span>
            </div>
            <div className="space-y-2">
              {upcomingTasks.slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === 'high' ? 'bg-red-400' :
                    task.priority === 'medium' ? 'bg-yellow-400' : 'bg-emerald-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{task.title}</p>
                    <p className="text-xs text-white/40">
                      {task.dueDate ? format(new Date(task.dueDate), 'MMM d, h:mm a') : 'No due date'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Weekly Points Mini Chart */}
      <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible"
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => navigate('/stats')}
                  className="cursor-pointer">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-cyber-400" />
              This Week's Points
            </h3>
            <span className="text-xs text-cyber-400 font-semibold">
              {weekChartData.reduce((s, d) => s + d.pts, 0)} pts
            </span>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={weekChartData}>
              <defs>
                <linearGradient id="ptsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(var(--color-cyber-500))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="rgb(var(--color-cyber-500))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: 'rgb(var(--color-white) / 0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'rgb(var(--color-navy-900))', border: '1px solid rgb(var(--color-white) / 0.1)', borderRadius: 8 }}
                labelStyle={{ color: 'rgb(var(--color-white) / 0.6)', fontSize: 11 }}
                itemStyle={{ color: 'rgb(var(--color-cyber-500))', fontSize: 11 }}
              />
              <Area type="monotone" dataKey="pts" stroke="rgb(var(--color-cyber-500))" fill="url(#ptsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Sleep last night */}
      <AnimatePresence>
        {settings?.sleepTrackerEnabled !== false && (todayLog.wakeTime || todayLog.sleepTime) && (
          <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible" exit={{ opacity: 0, height: 0 }}
                      whileHover={{ y: -4, scale: 1.01 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => navigate('/log')}
                      className="cursor-pointer overflow-hidden">
            <div className="glass-card p-4 flex items-center gap-4">
              <span className="text-3xl">😴</span>
              <div className="flex-1">
                <p className="text-xs text-white/40 font-medium mb-0.5">Last Night's Sleep</p>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <p className="text-sm font-semibold text-white">
                    {todayLog.sleepTime || '—'} → {todayLog.wakeTime || '—'}
                  </p>
                  {todayLog.sleepTime && todayLog.wakeTime && (
                    <span className="text-xs text-cyber-400 font-medium flex items-center gap-1 bg-cyber-500/10 border border-cyber-500/20 px-2.5 py-0.5 rounded-full">
                      <Moon size={10} className="text-cyber-400" />
                      {calculateSleepDuration(todayLog.sleepTime, todayLog.wakeTime)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Profile Completion Modal - perfectly centered horizontally and vertically */}
      <AnimatePresence>
        {profileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full max-w-md bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[85vh]"
            >
              {/* Animated Progress Line at the very top */}
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="bg-gradient-to-r from-teal-400 to-blue-500 h-full rounded-full"
                />
              </div>

              {/* Modal Header */}
              <div className="px-6 pt-5 pb-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>🎁 Complete Your Profile</span>
                  </h2>
                  <p className="text-[10px] text-white/40 mt-0.5">Unlock full stats & earn +15 points!</p>
                </div>
                <button
                  onClick={() => setProfileModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all duration-200 active:scale-90"
                >
                  <span className="text-white/60 text-sm">✕</span>
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleProfileSubmit} className="flex-1 flex flex-col overflow-hidden">
                {/* Scrollable inputs wrapper */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/50 mb-1">
                    <span>Profile Completion</span>
                    <span className="text-teal-400 font-bold">{progressPercentage}%</span>
                  </div>

                  <div>
                    <label htmlFor="display-name-input" className="text-xs text-white/40 block mb-1 font-medium">Display Name</label>
                    <input
                      id="display-name-input"
                      type="text"
                      required
                      placeholder="Your Name"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      className="input-cyber text-sm w-full font-sans bg-background/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyber-500 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="dob-input" className="text-xs text-white/40 block mb-1 font-medium">Date of Birth</label>
                    <input
                      id="dob-input"
                      type="date"
                      required
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      className="input-cyber text-sm w-full font-sans appearance-none bg-background/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyber-500 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="height-input" className="text-xs text-white/40 block mb-1 font-medium">Height (cm)</label>
                    <input
                      id="height-input"
                      type="number"
                      required
                      min="50"
                      max="300"
                      placeholder="e.g. 175"
                      value={height}
                      onChange={e => setHeight(e.target.value)}
                      className="input-cyber text-sm w-full font-sans bg-background/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyber-500 transition-all"
                    />
                  </div>

                  <div>
                    <label htmlFor="weight-input" className="text-xs text-white/40 block mb-1 font-medium">Weight (kg)</label>
                    <input
                      id="weight-input"
                      type="number"
                      step="0.1"
                      required
                      min="10"
                      max="500"
                      placeholder="e.g. 72.5"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      className="input-cyber text-sm w-full font-sans bg-background/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyber-500 transition-all"
                    />
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="flex-shrink-0 p-4 border-t border-white/10 bg-card flex items-center justify-between gap-3 sticky bottom-0">
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(false)}
                    className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 px-4 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || progressPercentage < 100}
                    className={`w-1/2 font-bold py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] ${
                      progressPercentage === 100
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md cursor-pointer'
                        : 'bg-slate-700 text-white/40 border border-white/5 cursor-not-allowed'
                    }`}
                  >
                    {submitting ? 'Saving...' : 'Complete Setup 🚀'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <QuickLogModal isOpen={quickLogOpen} onClose={() => setQuickLogOpen(false)} />
    </div>
  )
}
