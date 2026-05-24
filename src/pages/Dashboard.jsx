import { useState } from 'react'
import { motion } from 'framer-motion'
import { format, isToday } from 'date-fns'
import { Flame, Zap, CheckCircle2, TrendingUp, Calendar, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { todayKey, getLast7Days } from '../lib/storage'
import QuickLogModal from '../components/QuickLogModal'

import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: i => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' } }),
}

export default function Dashboard() {
  const { user } = useAuth()
  const {
    habits, dailyLogs, fitnessLogs, todos, pointsHistory,
    totalPoints, todayPoints, getHabitStreak, getUpcomingTodos, settings,
  } = useApp()
  const [quickLogOpen, setQuickLogOpen] = useState(false)

  const today = todayKey()
  const todayLog = dailyLogs[today] || {}
  const todayFitness = fitnessLogs[today] || {}

  // Today's habits
  const goodHabits = Object.values(habits).filter(h => h.type === 'good')
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
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'Habits',
                value: `${doneToday}/${goodHabits.length}`,
                sub: `${habitPct}% done`,
                color: habitPct >= 80 ? 'text-emerald-400' : habitPct >= 50 ? 'text-yellow-400' : 'text-red-400',
                icon: '✨',
              },
              {
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
            ].map((stat, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-lg">{stat.icon}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
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
      <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
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
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible">
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
        <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible">
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
      <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible">
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
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0f0e2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}
                itemStyle={{ color: '#22d3ee', fontSize: 11 }}
              />
              <Area type="monotone" dataKey="pts" stroke="#22d3ee" fill="url(#ptsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Sleep last night */}
      {(todayLog.wakeTime || todayLog.sleepTime) && (
        <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible">
          <div className="glass-card p-4 flex items-center gap-4">
            <span className="text-3xl">😴</span>
            <div>
              <p className="text-xs text-white/40 font-medium">Last Night's Sleep</p>
              <p className="text-sm font-semibold text-white">
                {todayLog.sleepTime || '—'} → {todayLog.wakeTime || '—'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <QuickLogModal isOpen={quickLogOpen} onClose={() => setQuickLogOpen(false)} />
    </div>
  )
}
