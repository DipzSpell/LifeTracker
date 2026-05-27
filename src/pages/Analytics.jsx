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
  const { dispatch } = useApp()
  const last30 = getLast30Days()
  
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(last30[last30.length - 1]) // Default to today

  // All habits list
  const habitList = Object.values(habits)
  const goodHabits = habitList.filter(h => h.type === 'good')

  // Calculate Monday-based weekday offset of the oldest day (last30[0])
  const oldestDate = new Date(last30[0])
  const oldestDayOfWeek = oldestDate.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Mon = 0, Tue = 1, ..., Sun = 6
  const offset = (oldestDayOfWeek + 6) % 7

  // Helper to parse date without timezone shift
  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date()
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  // Get color for a date cell based on filter
  const getCellColor = (date) => {
    if (selectedFilter === 'all') {
      if (!goodHabits.length) return 'bg-white/5'
      const done = goodHabits.filter(h => h.entries?.[date]?.status === 'done').length
      const pct = done / goodHabits.length
      if (pct === 0) return 'bg-white/5'
      if (pct < 0.33) return 'bg-emerald-950/60 border border-emerald-500/20'
      if (pct < 0.66) return 'bg-emerald-800/60 border border-emerald-500/30'
      if (pct < 1) return 'bg-emerald-600/80 border border-emerald-500/40'
      return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
    } else {
      const habit = habits[selectedFilter]
      if (!habit) return 'bg-white/5'
      const status = habit.entries?.[date]?.status
      if (habit.type === 'good') {
        if (status === 'done') return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
        if (status === 'skipped') return 'bg-yellow-500/80 border border-yellow-500/30'
        if (status === 'failed') return 'bg-red-500/80 border border-red-500/30'
        return 'bg-white/5'
      } else {
        // Bad habit
        if (status === 'clean') return 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
        if (status === 'done') return 'bg-red-500/80 border border-red-500/30'
        return 'bg-white/5'
      }
    }
  }

  // Handle logging a habit directly from heatmap
  const logHabit = (habitId, date, status) => {
    dispatch({ type: 'LOG_HABIT', payload: { habitId, date, status } })
  }

  const selectedHabit = selectedFilter !== 'all' ? habits[selectedFilter] : null
  const selectedDateObj = parseLocalDate(selectedDate)

  return (
    <div className="space-y-4">
      {/* Filter Selector */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-white/40">Filter View:</label>
        <select
          id="heatmap-filter"
          value={selectedFilter}
          onChange={(e) => {
            setSelectedFilter(e.target.value)
          }}
          className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white/80 focus:border-cyber-400 focus:bg-navy-900 outline-none transition-all cursor-pointer"
        >
          <option value="all">All Good Habits</option>
          {habitList.map((h) => (
            <option key={h.id} value={h.id}>
              {h.icon} {h.name}
            </option>
          ))}
        </select>
      </div>

      {/* Heatmap Calendar Grid */}
      <div className="bg-white/5 border border-white/5 rounded-2xl p-3">
        {/* Day of week labels */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, idx) => (
            <span key={idx} className="text-[10px] font-bold text-white/20 uppercase">
              {label}
            </span>
          ))}
        </div>

        {/* Heatmap cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Spacers */}
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`spacer-${i}`} className="w-full aspect-square opacity-0 pointer-events-none" />
          ))}

          {/* Actual days */}
          {last30.map((d) => {
            const isSelected = selectedDate === d
            const cellColorClass = getCellColor(d)
            return (
              <button
                key={d}
                id={`heatmap-cell-${d}`}
                title={format(parseLocalDate(d), 'MMM d, yyyy')}
                onClick={() => setSelectedDate(d)}
                className={`w-full aspect-square rounded-lg transition-all duration-200 ${cellColorClass} ${
                  isSelected
                    ? 'ring-2 ring-cyber-400 ring-offset-2 ring-offset-navy-950 scale-105 z-10'
                    : 'hover:scale-105'
                }`}
              />
            )
          })}
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="flex items-center justify-between text-[10px] text-white/40 px-1">
        {selectedFilter === 'all' ? (
          <>
            <span>Less Completed</span>
            <div className="flex items-center gap-1">
              {['bg-white/5', 'bg-emerald-950/60 border border-emerald-500/20', 'bg-emerald-800/60 border border-emerald-500/30', 'bg-emerald-600/80 border border-emerald-500/40', 'bg-emerald-500'].map((c, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
              ))}
            </div>
            <span>More Completed</span>
          </>
        ) : selectedHabit?.type === 'good' ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-white/5" /> Not Logged
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Done
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500/80 border border-yellow-500/30" /> Skipped
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500/80 border border-red-500/30" /> Failed
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-white/5" /> Not Logged
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500" /> Resisted
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500/80 border border-red-500/30" /> Did It
            </span>
          </div>
        )}
      </div>

      {/* Selected Day Detail Panel */}
      <div className="glass-card p-4 border-white/5 mt-2 page-enter" key={selectedDate}>
        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
          <div>
            <h4 className="text-xs font-bold text-cyber-400">Selected Day Details</h4>
            <p className="text-xs text-white/60 font-semibold mt-0.5">
              {format(selectedDateObj, 'EEEE, MMM d, yyyy')}
            </p>
          </div>
          {selectedFilter === 'all' && goodHabits.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {goodHabits.filter(h => h.entries?.[selectedDate]?.status === 'done').length} / {goodHabits.length} Done
            </span>
          )}
        </div>

        {/* Selected Habit details */}
        {selectedFilter !== 'all' && selectedHabit ? (
          (() => {
            const status = selectedHabit.entries?.[selectedDate]?.status
            const isBad = selectedHabit.type === 'bad'
            return (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                    isBad ? 'bg-red-500/15 text-red-400' : 'bg-cyber-500/15 text-cyber-400'
                  }`}>
                    {selectedHabit.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{selectedHabit.name}</p>
                    <p className="text-[10px] capitalize text-white/40">{selectedHabit.category}</p>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                    status === 'done' ? (isBad ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20') :
                    status === 'clean' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                    status === 'skipped' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                    status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    'bg-white/5 text-white/30 border border-white/5'
                  }`}>
                    {status ? (status === 'clean' ? 'Resisted' : status === 'done' ? (isBad ? 'Did it' : 'Done') : status) : 'Not Logged'}
                  </span>
                </div>

                {/* Inline toggles */}
                <div className="flex gap-1.5 mt-1">
                  {isBad ? (
                    <>
                      <button
                        id={`heatmap-action-clean`}
                        onClick={() => logHabit(selectedHabit.id, selectedDate, status === 'clean' ? null : 'clean')}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          status === 'clean'
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                            : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        ✅ Resisted
                      </button>
                      <button
                        id={`heatmap-action-done`}
                        onClick={() => logHabit(selectedHabit.id, selectedDate, status === 'done' ? null : 'done')}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          status === 'done'
                            ? 'border-red-500/50 bg-red-500/15 text-red-300'
                            : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        ⚠️ Did it
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        id={`heatmap-action-done`}
                        onClick={() => logHabit(selectedHabit.id, selectedDate, status === 'done' ? null : 'done')}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          status === 'done'
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                            : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        ✅ Done
                      </button>
                      <button
                        id={`heatmap-action-skip`}
                        onClick={() => logHabit(selectedHabit.id, selectedDate, status === 'skipped' ? null : 'skipped')}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          status === 'skipped'
                            ? 'border-yellow-500/50 bg-yellow-500/15 text-yellow-300'
                            : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        ⏭ Skip
                      </button>
                      <button
                        id={`heatmap-action-fail`}
                        onClick={() => logHabit(selectedHabit.id, selectedDate, status === 'failed' ? null : 'failed')}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          status === 'failed'
                            ? 'border-red-500/50 bg-red-500/15 text-red-300'
                            : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        ❌ Fail
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })()
        ) : (
          /* All Habits view */
          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {habitList.length === 0 ? (
              <p className="text-center text-xs text-white/30 py-2">No habits configured yet.</p>
            ) : (
              habitList.map((h) => {
                const status = h.entries?.[selectedDate]?.status
                const isBad = h.type === 'bad'
                return (
                  <div key={h.id} className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base flex-shrink-0">{h.icon}</span>
                      <span className="text-xs font-medium text-white/80 truncate">{h.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {isBad ? (
                        <>
                          <button
                            id={`heatmap-list-${h.id}-clean`}
                            onClick={() => logHabit(h.id, selectedDate, status === 'clean' ? null : 'clean')}
                            className={`px-2 py-1 rounded-lg text-[9px] font-semibold transition-all border ${
                              status === 'clean'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-transparent text-white/30 border-transparent hover:bg-white/5'
                            }`}
                          >
                            Resisted
                          </button>
                          <button
                            id={`heatmap-list-${h.id}-done`}
                            onClick={() => logHabit(h.id, selectedDate, status === 'done' ? null : 'done')}
                            className={`px-2 py-1 rounded-lg text-[9px] font-semibold transition-all border ${
                              status === 'done'
                                ? 'bg-red-500/15 text-red-300 border-red-500/30'
                                : 'bg-transparent text-white/30 border-transparent hover:bg-white/5'
                            }`}
                          >
                            Did It
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            id={`heatmap-list-${h.id}-done`}
                            onClick={() => logHabit(h.id, selectedDate, status === 'done' ? null : 'done')}
                            className={`px-2 py-1 rounded-lg text-[9px] font-semibold transition-all border ${
                              status === 'done'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-transparent text-white/30 border-transparent hover:bg-white/5'
                            }`}
                          >
                            Done
                          </button>
                          <button
                            id={`heatmap-list-${h.id}-skip`}
                            onClick={() => logHabit(h.id, selectedDate, status === 'skipped' ? null : 'skipped')}
                            className={`px-2 py-1 rounded-lg text-[9px] font-semibold transition-all border ${
                              status === 'skipped'
                                ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                                : 'bg-transparent text-white/30 border-transparent hover:bg-white/5'
                            }`}
                          >
                            Skip
                          </button>
                          <button
                            id={`heatmap-list-${h.id}-fail`}
                            onClick={() => logHabit(h.id, selectedDate, status === 'failed' ? null : 'failed')}
                            className={`px-2 py-1 rounded-lg text-[9px] font-semibold transition-all border ${
                              status === 'failed'
                                ? 'bg-red-500/15 text-red-300 border-red-500/30'
                                : 'bg-transparent text-white/30 border-transparent hover:bg-white/5'
                            }`}
                          >
                            Fail
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const ChartCard = ({ icon: Icon, color, title, children }) => (
  <div className="glass-card p-4">
    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
      <Icon size={15} className={color} />{title}
    </h3>
    {children}
  </div>
)

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
