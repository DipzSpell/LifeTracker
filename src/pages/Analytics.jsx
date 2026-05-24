import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { getLast30Days, getLast7Days } from '../lib/storage'
import { BarChart2, TrendingUp, Moon, Activity, Award, Download } from 'lucide-react'

const CHART_COLORS = ['#22d3ee', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-900 border border-white/10 rounded-xl p-2.5 text-xs shadow-lg">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  )
}

function HabitHeatmap({ habits }) {
  const last30 = getLast30Days()
  const goodHabits = Object.values(habits).filter(h => h.type === 'good')

  const getCellColor = (date) => {
    if (!goodHabits.length) return 'bg-white/5'
    const done = goodHabits.filter(h => h.entries?.[date]?.status === 'done').length
    const pct = done / goodHabits.length
    if (pct === 0) return 'bg-white/5'
    if (pct < 0.33) return 'bg-emerald-900/60'
    if (pct < 0.66) return 'bg-emerald-600/60'
    if (pct < 1) return 'bg-emerald-500/80'
    return 'bg-emerald-400'
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {last30.map(d => (
          <div key={d} title={format(new Date(d), 'MMM d')}
            className={`heatmap-cell ${getCellColor(d)}`} />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-white/30">Less</span>
        {['bg-white/5', 'bg-emerald-900/60', 'bg-emerald-600/60', 'bg-emerald-500/80', 'bg-emerald-400'].map((c, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span className="text-[10px] text-white/30">More</span>
      </div>
    </div>
  )
}

export default function Analytics() {
  const { dailyLogs, fitnessLogs, habits, pointsHistory, todos } = useApp()
  const [range, setRange] = useState('week') // 'week' | 'month'

  const days = range === 'week' ? getLast7Days() : getLast30Days()

  // Gym attendance
  const gymData = days.map(d => ({
    day: range === 'week' ? format(new Date(d), 'EEE') : format(new Date(d), 'MMM d'),
    gym: dailyLogs[d]?.gymStatus === 'done' ? 1 : 0,
    skipped: dailyLogs[d]?.gymStatus === 'skipped' ? 1 : 0,
  }))

  // Steps
  const stepsData = days.map(d => ({
    day: range === 'week' ? format(new Date(d), 'EEE') : format(new Date(d), 'd'),
    steps: (fitnessLogs[d]?.steps || dailyLogs[d]?.steps || 0),
    goal: 8000,
  }))

  // Sleep
  const sleepData = days.map(d => {
    const log = dailyLogs[d] || {}
    const parseTime = (t) => {
      if (!t) return null
      const [h, m] = t.split(':').map(Number)
      return h + m / 60
    }
    return {
      day: range === 'week' ? format(new Date(d), 'EEE') : format(new Date(d), 'd'),
      wake: parseTime(log.wakeTime),
      sleep: parseTime(log.sleepTime),
    }
  }).filter(d => d.wake || d.sleep)

  // Points
  const pointsData = days.map(d => ({
    day: range === 'week' ? format(new Date(d), 'EEE') : format(new Date(d), 'd'),
    pts: pointsHistory[d] || 0,
  }))

  // Mood
  const moodData = days.map(d => ({
    day: range === 'week' ? format(new Date(d), 'EEE') : format(new Date(d), 'd'),
    mood: dailyLogs[d]?.mood || 0,
  })).filter(d => d.mood > 0)

  // Good vs Bad habit ratio (today)
  const goodHabits = Object.values(habits).filter(h => h.type === 'good')
  const badHabits = Object.values(habits).filter(h => h.type === 'bad')
  const today = days[days.length - 1]
  const goodDone = goodHabits.filter(h => h.entries?.[today]?.status === 'done').length
  const goodMissed = goodHabits.length - goodDone
  const badDone = badHabits.filter(h => h.entries?.[today]?.status === 'done').length
  const badResisted = badHabits.filter(h => h.entries?.[today]?.status === 'clean').length
  const habitPieData = [
    { name: 'Good Done', value: goodDone, color: '#10b981' },
    { name: 'Good Missed', value: goodMissed, color: '#1e3a2e' },
    { name: 'Bad Resisted', value: badResisted, color: '#22d3ee' },
    { name: 'Bad Done', value: badDone, color: '#ef4444' },
  ].filter(d => d.value > 0)

  // Export CSV
  const exportCSV = () => {
    const rows = [['Date', 'Gym', 'Steps', 'Mood', 'Water', 'Weight', 'Points']]
    days.forEach(d => {
      rows.push([
        d,
        dailyLogs[d]?.gymStatus || '',
        fitnessLogs[d]?.steps || dailyLogs[d]?.steps || 0,
        dailyLogs[d]?.mood || '',
        dailyLogs[d]?.waterGlasses || fitnessLogs[d]?.waterGlasses || 0,
        fitnessLogs[d]?.weight || '',
        pointsHistory[d] || 0,
      ])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `life-tracker-${range}-${today}.csv`
    a.click()
  }

  const ChartCard = ({ icon: Icon, color, title, children }) => (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
        <Icon size={15} className={color} />{title}
      </h3>
      {children}
    </div>
  )

  const axisStyle = { fill: 'rgba(255,255,255,0.3)', fontSize: 10 }
  const gridStyle = { stroke: 'rgba(255,255,255,0.05)' }

  return (
    <div className="space-y-4 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Analytics</h1>
          <p className="text-xs text-white/40">Your progress at a glance</p>
        </div>
        <button id="analytics-export" onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white/60 hover:border-white/20 transition-all active:scale-95">
          <Download size={13} /> CSV
        </button>
      </div>

      {/* Range toggle */}
      <div className="flex bg-white/5 rounded-xl p-1">
        {[{ val: 'week', label: '7 Days' }, { val: 'month', label: '30 Days' }].map(r => (
          <button key={r.val} id={`analytics-range-${r.val}`}
            onClick={() => setRange(r.val)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${range === r.val ? 'bg-cyber-500/30 text-cyber-300 border border-cyber-500/30' : 'text-white/40'}`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* This Week vs Last Week comparison */}
      {range === 'week' && (() => {
        const thisWeekPts = getLast7Days().reduce((s, d) => s + (pointsHistory[d] || 0), 0)
        const lastWeekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - 7 - i); return d.toISOString().split('T')[0]
        })
        const lastWeekPts = lastWeekDays.reduce((s, d) => s + (pointsHistory[d] || 0), 0)
        const diff = thisWeekPts - lastWeekPts
        return (
          <div className="glass-card p-4">
            <p className="text-xs text-white/40 font-medium mb-2">📊 This Week vs Last Week</p>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-xl font-bold text-cyber-400">{thisWeekPts}</p>
                <p className="text-xs text-white/40">This week</p>
              </div>
              <div className={`text-center px-3 py-1.5 rounded-xl ${diff >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                <p className="text-lg font-bold">{diff >= 0 ? '+' : ''}{diff}</p>
                <p className="text-[10px]">vs last week</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white/50">{lastWeekPts}</p>
                <p className="text-xs text-white/40">Last week</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Gym Attendance */}
      <ChartCard icon={BarChart2} color="text-orange-400" title="Gym Attendance">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={gymData} barCategoryGap="30%">
            <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="gym" name="Done" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
            <Bar dataKey="skipped" name="Skipped" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Steps Chart */}
      <ChartCard icon={Activity} color="text-cyber-400" title="Daily Steps">
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={stepsData}>
            <defs>
              <linearGradient id="stepsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="steps" name="Steps" stroke="#22d3ee" fill="url(#stepsGrad)" strokeWidth={2} />
            <Line type="monotone" dataKey="goal" name="Goal" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Points Over Time */}
      <ChartCard icon={TrendingUp} color="text-yellow-400" title="Points Earned">
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={pointsData}>
            <defs>
              <linearGradient id="ptsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="pts" name="Points" stroke="#f59e0b" fill="url(#ptsAreaGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Mood Chart */}
      {moodData.length > 0 && (
        <ChartCard icon={Activity} color="text-purple-400" title="Mood Trend">
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={moodData}>
              <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis domain={[1, 10]} tick={axisStyle} axisLine={false} tickLine={false} width={20} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="mood" name="Mood" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Habit Heatmap */}
      <ChartCard icon={Award} color="text-emerald-400" title="30-Day Habit Heatmap">
        <HabitHeatmap habits={habits} />
      </ChartCard>

      {/* Habit Pie */}
      {habitPieData.length > 0 && (
        <ChartCard icon={Award} color="text-cyber-400" title="Today's Habit Ratio">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={habitPieData} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                {habitPieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{v}</span>} />
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Sleep Chart */}
      {sleepData.length > 0 && (
        <ChartCard icon={Moon} color="text-indigo-400" title="Sleep Pattern">
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={sleepData}>
              <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 24]} tick={axisStyle} axisLine={false} tickLine={false} width={25}
                tickFormatter={v => `${v}h`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="wake" name="Wake (hr)" stroke="#22d3ee" fill="rgba(34,211,238,0.1)" strokeWidth={2} />
              <Area type="monotone" dataKey="sleep" name="Sleep (hr)" stroke="#8b5cf6" fill="rgba(139,92,246,0.1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-white/30 mt-2">Values shown in 24-hour format</p>
        </ChartCard>
      )}
    </div>
  )
}
