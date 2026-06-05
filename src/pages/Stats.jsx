import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend, ComposedChart, CartesianGrid
} from 'recharts'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getLast30Days, getLast7Days } from '../lib/storage'
import { BarChart2, TrendingUp, Activity, Award, Download, Sparkles } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card/85 backdrop-blur-md border border-white/10 rounded-xl p-3 text-xs shadow-xl min-w-[120px]">
      <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="text-white/60 font-medium">{p.name}:</span>
            <span className="font-bold" style={{ color: p.color || p.stroke }}>
              {p.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HabitHeatmap({ habitsData, logHabit }) {
  const last30 = getLast30Days()
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(last30[last30.length - 1])

  const habitList = Object.values(habitsData)
  const goodHabits = habitList.filter(h => h.type === 'good')

  const oldestDate = new Date(last30[0])
  const oldestDayOfWeek = oldestDate.getDay()
  const offset = (oldestDayOfWeek + 6) % 7

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date()
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

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
      const habit = habitsData[selectedFilter]
      if (!habit) return 'bg-white/5'
      const status = habit.entries?.[date]?.status
      if (habit.type === 'good') {
        if (status === 'done') return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
        if (status === 'skipped') return 'bg-yellow-500/80 border border-yellow-500/30'
        if (status === 'failed') return 'bg-red-500/80 border border-red-500/30'
        return 'bg-white/5'
      } else {
        if (status === 'clean') return 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
        if (status === 'done') return 'bg-red-500/80 border border-red-500/30'
        return 'bg-white/5'
      }
    }
  }

  const selectedHabit = selectedFilter !== 'all' ? habitsData[selectedFilter] : null
  const selectedDateObj = parseLocalDate(selectedDate)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs text-white/40 font-medium">Filter View:</label>
        <select
          id="heatmap-filter"
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white/80 focus:border-cyber-400 focus:bg-card outline-none transition-all cursor-pointer font-semibold"
        >
          <option value="all">All Good Habits</option>
          {habitList.map((h) => (
            <option key={h.id} value={h.id}>
              {h.icon} {h.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white/5 border border-white/5 rounded-2xl p-3">
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, idx) => (
            <span key={idx} className="text-[10px] font-bold text-white/20 uppercase">
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`spacer-${i}`} className="w-full aspect-square opacity-0 pointer-events-none" />
          ))}

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

      <div className="flex items-center justify-between text-[10px] text-white/40 px-1 font-medium">
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

      <div className="glass-card p-4 border-white/5 mt-2 page-enter animate-none" key={selectedDate}>
        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
          <div>
            <h4 className="text-xs font-bold text-cyber-400">Selected Day Details</h4>
            <p className="text-xs text-white/60 font-semibold mt-0.5">
              {format(selectedDateObj, 'EEEE, MMM d, yyyy')}
            </p>
          </div>
          {selectedFilter === 'all' && goodHabits.length > 0 && (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              {goodHabits.filter(h => h.entries?.[selectedDate]?.status === 'done').length} / {goodHabits.length} Done
            </span>
          )}
        </div>

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
                    <p className="text-[10px] capitalize text-white/40 font-semibold">{selectedHabit.category}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    status === 'done' ? (isBad ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20') :
                    status === 'clean' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                    status === 'skipped' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                    status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    'bg-white/5 text-white/30 border border-white/5'
                  }`}>
                    {status ? (status === 'clean' ? 'Resisted' : status === 'done' ? (isBad ? 'Did it' : 'Done') : status) : 'Not Logged'}
                  </span>
                </div>

                <div className="flex gap-1.5 mt-1">
                  {isBad ? (
                    <>
                      <button
                        id="heatmap-action-clean"
                        onClick={() => logHabit(selectedHabit.id, selectedDate, status === 'clean' ? null : 'clean')}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all active:scale-[0.98] ${
                          status === 'clean'
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-md'
                            : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        ✅ Resisted
                      </button>
                      <button
                        id="heatmap-action-done"
                        onClick={() => logHabit(selectedHabit.id, selectedDate, status === 'done' ? null : 'done')}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all active:scale-[0.98] ${
                          status === 'done'
                            ? 'border-red-500/50 bg-red-500/15 text-red-300 shadow-md'
                            : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        ⚠️ Did it
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        id="heatmap-action-done"
                        onClick={() => logHabit(selectedHabit.id, selectedDate, status === 'done' ? null : 'done')}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all active:scale-[0.98] ${
                          status === 'done'
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-md'
                            : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        ✅ Done
                      </button>
                      <button
                        id="heatmap-action-skip"
                        onClick={() => logHabit(selectedHabit.id, selectedDate, status === 'skipped' ? null : 'skipped')}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all active:scale-[0.98] ${
                          status === 'skipped'
                            ? 'border-yellow-500/50 bg-yellow-500/15 text-yellow-300 shadow-md'
                            : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        ⏭ Skip
                      </button>
                      <button
                        id="heatmap-action-fail"
                        onClick={() => logHabit(selectedHabit.id, selectedDate, status === 'failed' ? null : 'failed')}
                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all active:scale-[0.98] ${
                          status === 'failed'
                            ? 'border-red-500/50 bg-red-500/15 text-red-300 shadow-md'
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
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {habitList.length === 0 ? (
              <p className="text-center text-xs text-white/30 py-4 font-semibold">No habits configured yet.</p>
            ) : (
              habitList.map((h) => {
                const status = h.entries?.[selectedDate]?.status
                const isBad = h.type === 'bad'
                return (
                  <div key={h.id} className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base flex-shrink-0">{h.icon}</span>
                      <span className="text-xs font-semibold text-white/80 truncate">{h.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {isBad ? (
                        <>
                          <button
                            id={`heatmap-list-${h.id}-clean`}
                            onClick={() => logHabit(h.id, selectedDate, status === 'clean' ? null : 'clean')}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border ${
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
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border ${
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
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border ${
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
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border ${
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
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all border ${
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
  <div className="glass-card p-4 border border-white/5 rounded-2xl shadow-lg">
    <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
      <Icon size={15} className={color} />{title}
    </h3>
    {children}
  </div>
)

export default function Stats() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { dispatch, recalcPoints } = useApp()

  const [loading, setLoading] = useState(true)
  const [dailyLogs, setDailyLogs] = useState({})
  const [fitnessLogs, setFitnessLogs] = useState({})
  const [pointsHistory, setPointsHistory] = useState({})
  const [habitsData, setHabitsData] = useState({})
  const [range, setRange] = useState('week') // 'week' | 'month'

  useEffect(() => {
    async function fetchDbLogs() {
      if (!user?.uid) return
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('user_states')
          .select('state')
          .eq('user_id', user.uid)
          .maybeSingle()

        if (error) throw error
        if (data?.state) {
          setDailyLogs(data.state.dailyLogs || {})
          setFitnessLogs(data.state.fitnessLogs || {})
          setPointsHistory(data.state.pointsHistory || {})
          setHabitsData(data.state.habits || {})
        }
      } catch (err) {
        console.error('Failed to retrieve logs from Supabase:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDbLogs()
  }, [user?.uid])

  const logHabit = (habitId, date, status) => {
    setHabitsData(prev => {
      const h = prev[habitId]
      if (!h) return prev
      return {
        ...prev,
        [habitId]: {
          ...h,
          entries: {
            ...h.entries,
            [date]: { status, loggedAt: new Date().toISOString() }
          }
        }
      }
    })
    
    dispatch({ type: 'LOG_HABIT', payload: { habitId, date, status } })
    setTimeout(recalcPoints, 100)
  }

  const days = range === 'week' ? getLast7Days() : getLast30Days()

  const hasLogs = Object.values(dailyLogs).some(log => log.loggedAt)

  const calculateSleepDurationHours = (sleepTime, wakeTime) => {
    if (!sleepTime || !wakeTime) return 0
    try {
      const [sleepH, sleepM] = sleepTime.split(':').map(Number)
      const [wakeH, wakeM] = wakeTime.split(':').map(Number)
      if (isNaN(sleepH) || isNaN(sleepM) || isNaN(wakeH) || isNaN(wakeM)) return 0
      let sleepMinutes = sleepH * 60 + sleepM
      let wakeMinutes = wakeH * 60 + wakeM
      let diff = wakeMinutes - sleepMinutes
      if (diff < 0) diff += 24 * 60
      return Number((diff / 60).toFixed(1))
    } catch {
      return 0
    }
  }

  // Energy & Sleep Calculation
  const energyData = days.map(d => {
    const log = dailyLogs[d] || {}
    const fit = fitnessLogs[d] || {}
    return {
      day: range === 'week' ? format(new Date(d), 'EEE') : format(new Date(d), 'd'),
      sleepHours: calculateSleepDurationHours(log.sleepTime, log.wakeTime),
      steps: fit.steps || log.steps || 0,
    }
  })

  // Vibe & Hydration Matrix Calculation
  const vibeData = days.map(d => {
    const log = dailyLogs[d] || {}
    const fit = fitnessLogs[d] || {}
    return {
      day: range === 'week' ? format(new Date(d), 'EEE') : format(new Date(d), 'd'),
      mood: log.mood || 0,
      water: fit.waterGlasses || log.waterGlasses || 0,
    }
  })

  // Gym attendance
  const gymData = days.map(d => ({
    day: range === 'week' ? format(new Date(d), 'EEE') : format(new Date(d), 'MMM d'),
    gym: dailyLogs[d]?.gymStatus === 'done' ? 1 : 0,
    skipped: dailyLogs[d]?.gymStatus === 'skipped' ? 1 : 0,
  }))

  // Points
  const pointsData = days.map(d => ({
    day: range === 'week' ? format(new Date(d), 'EEE') : format(new Date(d), 'd'),
    pts: pointsHistory[d] || 0,
  }))

  // Good vs Bad habit ratio (today)
  const goodHabits = Object.values(habitsData).filter(h => h.type === 'good')
  const badHabits = Object.values(habitsData).filter(h => h.type === 'bad')
  const today = days[days.length - 1]
  const goodDone = goodHabits.filter(h => h.entries?.[today]?.status === 'done').length
  const goodMissed = goodHabits.length - goodDone
  const badDone = badHabits.filter(h => h.entries?.[today]?.status === 'done').length
  const badResisted = badHabits.filter(h => h.entries?.[today]?.status === 'clean').length
  const habitPieData = [
    { name: 'Good Done', value: goodDone, color: 'var(--accent)' },
    { name: 'Good Missed', value: goodMissed, color: 'rgba(255,255,255,0.05)' },
    { name: 'Bad Resisted', value: badResisted, color: 'var(--primary)' },
    { name: 'Bad Done', value: badDone, color: 'rgba(239, 68, 68, 0.4)' },
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

  const axisStyle = { fill: 'var(--text)', opacity: 0.4, fontSize: 10 }
  const gridStyle = { stroke: 'var(--text)', opacity: 0.05 }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 page-enter">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
        <p className="text-xs text-white/40 font-semibold tracking-wide">Syncing data from database...</p>
      </div>
    )
  }

  if (!hasLogs) {
    return (
      <div className="space-y-4 page-enter">
        <div>
          <h1 className="text-xl font-display font-bold text-white">Analytics</h1>
          <p className="text-xs text-white/40">Your progress at a glance</p>
        </div>

        <div className="glass-card p-8 flex flex-col items-center justify-center text-center gap-5 border border-white/5 rounded-2xl min-h-[45vh] shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl shadow-inner border border-white/5 animate-pulse">
            📊
          </div>
          <div className="max-w-xs space-y-2">
            <h3 className="text-sm font-bold text-white">No Data Available</h3>
            <p className="text-xs text-white/50 leading-relaxed font-medium">
              No log data recorded yet. Complete your first 'Quick Log' on the dashboard to unlock data metrics! ⚡
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold px-5 py-3 rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-emerald-500/10 mt-2"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 page-enter">
      {/* Header */}
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
          <div className="glass-card p-4 border border-white/5 rounded-2xl shadow-lg">
            <p className="text-xs text-white/40 font-medium mb-2">📊 This Week vs Last Week</p>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-xl font-bold text-cyber-400">{thisWeekPts}</p>
                <p className="text-xs text-white/40 font-medium">This week</p>
              </div>
              <div className={`text-center px-3 py-1.5 rounded-xl ${diff >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                <p className="text-lg font-bold">{diff >= 0 ? '+' : ''}{diff}</p>
                <p className="text-[10px] font-bold">vs last week</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white/50">{lastWeekPts}</p>
                <p className="text-xs text-white/40 font-medium">Last week</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Chart A: Energy & Productivity Core */}
      <ChartCard icon={Activity} color="text-cyber-400" title="Energy & Productivity Core">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={energyData} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStyle.stroke} opacity={gridStyle.opacity} />
              <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" domain={[0, 16]} tick={axisStyle} axisLine={false} tickLine={false} width={30} />
              <YAxis yAxisId="right" orientation="right" tick={axisStyle} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar yAxisId="left" dataKey="sleepHours" name="Sleep (hrs)" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Area yAxisId="right" type="monotone" dataKey="steps" name="Steps" stroke="var(--primary)" fill="url(#energyGrad)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Chart B: Vibe & Hydration Matrix */}
      <ChartCard icon={Sparkles} color="text-purple-400" title="Vibe & Hydration Matrix">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={vibeData} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="vibeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStyle.stroke} opacity={gridStyle.opacity} />
              <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" domain={[1, 10]} tick={axisStyle} axisLine={false} tickLine={false} width={30} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 12]} tick={axisStyle} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar yAxisId="right" dataKey="water" name="Water (glasses)" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Area yAxisId="left" type="monotone" dataKey="mood" name="Mood" stroke="var(--primary)" fill="url(#vibeGrad)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Gym Attendance */}
      <ChartCard icon={BarChart2} color="text-orange-400" title="Gym Attendance">
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gymData} barCategoryGap="30%" margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStyle.stroke} opacity={gridStyle.opacity} />
              <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={30} domain={[0, 1]} ticks={[0, 1]} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="gym" name="Done" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey="skipped" name="Skipped" fill="rgba(239, 68, 68, 0.6)" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Points Earned */}
      <ChartCard icon={TrendingUp} color="text-yellow-400" title="Points Earned">
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pointsData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="ptsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStyle.stroke} opacity={gridStyle.opacity} />
              <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Area type="monotone" dataKey="pts" name="Points" stroke="var(--primary)" fill="url(#ptsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Habit Heatmap */}
      <ChartCard icon={Award} color="text-emerald-400" title="30-Day Habit Heatmap">
        <HabitHeatmap habitsData={habitsData} logHabit={logHabit} />
      </ChartCard>

      {/* Habit Ratio */}
      {habitPieData.length > 0 && (
        <ChartCard icon={Award} color="text-cyber-400" title="Today's Habit Ratio">
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={habitPieData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={60} innerRadius={40}>
                  {habitPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span className="text-white/60 text-[10px] font-semibold">{v}</span>} />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}
    </div>
  )
}
