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

/* ── Design-system palette (mirrors src/styles/theme.css) ──────────────────── */
const CYAN = '#22D3EE'
const LIME = '#A3E635'
const VIOLET = '#A78BFA'
const CORAL = '#F87171'
const MUTED = '#64748B'
const MONO = "'JetBrains Mono', ui-monospace, monospace"

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl p-3 text-xs min-w-[120px]"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', boxShadow: '0 16px 40px rgba(0,0,0,0.45)' }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="space-y-1.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
            <span className="font-bold" style={{ color: p.color || p.stroke, fontFamily: MONO }}>
              {p.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function HabitHeatmap({ habitsData, logHabit }) {
  const { user } = useAuth()
  const todayDate = new Date()
  const todayStr = format(todayDate, 'yyyy-MM-dd')

  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth())
  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear())
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [localHabits, setLocalHabits] = useState(habitsData)
  const [fetching, setFetching] = useState(false)

  // Sync with habitsData prop updates
  useEffect(() => {
    setLocalHabits(habitsData)
  }, [habitsData])

  // Fetch updated month data from Supabase on navigation
  useEffect(() => {
    let active = true
    async function loadLatestState() {
      if (!user?.uid) return
      try {
        setFetching(true)
        const { data, error } = await supabase
          .from('user_states')
          .select('state')
          .eq('user_id', user.uid)
          .maybeSingle()
        if (error) throw error
        if (data?.state?.habits && active) {
          setLocalHabits(data.state.habits)
        }
      } catch (err) {
        console.error('Error fetching latest habits data:', err)
      } finally {
        if (active) setFetching(false)
      }
    }
    loadLatestState()
    return () => { active = false }
  }, [currentMonth, currentYear, user?.uid])

  const habitList = Object.values(localHabits)
  const goodHabits = habitList.filter(h => h.type === 'good')

  // Calculate dynamic monthly calendar grid details
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()
  const offset = (firstDayIndex + 6) % 7

  // Generate date strings YYYY-MM-DD for this month
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1
    const monthStr = String(currentMonth + 1).padStart(2, '0')
    const dayStr = String(dayNum).padStart(2, '0')
    return `${currentYear}-${monthStr}-${dayStr}`
  })

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date()
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  // Tailwind's 400-level palette matches the design system exactly
  // (lime-400 #A3E635, cyan-400 #22D3EE, red-400 #F87171, amber-400 #FBBF24)
  const getCellColor = (date) => {
    if (selectedFilter === 'all') {
      if (!goodHabits.length) return 'bg-white/5'
      const done = goodHabits.filter(h => h.entries?.[date]?.status === 'done').length
      const pct = done / goodHabits.length
      if (pct === 0) return 'bg-white/5'
      if (pct < 0.33) return 'bg-lime-400/25 border border-lime-400/20'
      if (pct < 0.66) return 'bg-lime-400/45 border border-lime-400/30'
      if (pct < 1) return 'bg-lime-400/70 border border-lime-400/40'
      return 'bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.35)]'
    } else {
      const habit = localHabits[selectedFilter]
      if (!habit) return 'bg-white/5'
      const status = habit.entries?.[date]?.status
      if (habit.type === 'good') {
        if (status === 'done') return 'bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.35)]'
        if (status === 'skipped') return 'bg-amber-400/80 border border-amber-400/30'
        if (status === 'failed') return 'bg-red-400/80 border border-red-400/30'
        return 'bg-white/5'
      } else {
        if (status === 'clean') return 'bg-cyan-400 shadow-[0_0_10px_var(--accent-glow)]'
        if (status === 'done') return 'bg-red-400/80 border border-red-400/30'
        return 'bg-white/5'
      }
    }
  }

  const selectedHabit = selectedFilter !== 'all' ? localHabits[selectedFilter] : null
  const selectedDateObj = parseLocalDate(selectedDate)

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(y => y - 1)
    } else {
      setCurrentMonth(m => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(y => y + 1)
    } else {
      setCurrentMonth(m => m + 1)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters and Month Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs text-white/40 font-medium">Filter View:</label>
          <select
            id="heatmap-filter"
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="rounded-xl px-2.5 py-1.5 text-xs outline-none transition-all cursor-pointer font-semibold"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 10 }}
          >
            <option value="all">All Good Habits</option>
            {habitList.map((h) => (
              <option key={h.id} value={h.id}>
                {h.icon} {h.name}
              </option>
            ))}
          </select>
        </div>

        {/* Month Selector bar */}
        <div className="flex items-center justify-between px-1 bg-white/5 border border-white/5 rounded-xl py-1">
          <button
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all active:scale-90"
            aria-label="Previous Month"
          >
            ◀
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-wide">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            {fetching && (
              <div className="w-3 h-3 rounded-full border border-t-transparent border-cyan-400 animate-spin" />
            )}
          </div>
          <button
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all active:scale-90"
            aria-label="Next Month"
          >
            ▶
          </button>
        </div>
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
            <div key={`spacer-${i}`} className="w-full aspect-square opacity-[0.02] bg-white/10 rounded-lg pointer-events-none" />
          ))}

          {monthDays.map((d) => {
            const isSelected = selectedDate === d
            const cellColorClass = getCellColor(d)
            const dayNum = parseInt(d.split('-')[2])
            return (
              <button
                key={d}
                id={`heatmap-cell-${d}`}
                title={format(parseLocalDate(d), 'MMM d, yyyy')}
                onClick={() => setSelectedDate(d)}
                className={`w-full aspect-square rounded-lg transition-all duration-200 flex items-center justify-center text-[9px] font-bold ${cellColorClass} ${
                  isSelected
                    ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0B0E14] scale-105 z-10'
                    : 'hover:scale-105'
                }`}
              >
                {dayNum}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-white/40 px-1 font-medium">
        {selectedFilter === 'all' ? (
          <>
            <span>Less Completed</span>
            <div className="flex items-center gap-1">
              {['bg-white/5', 'bg-lime-400/25 border border-lime-400/20', 'bg-lime-400/45 border border-lime-400/30', 'bg-lime-400/70 border border-lime-400/40', 'bg-lime-400'].map((c, i) => (
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
              <span className="w-2.5 h-2.5 rounded-sm bg-lime-400" /> Done
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/80 border border-amber-400/30" /> Skipped
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400/80 border border-red-400/30" /> Failed
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-white/5" /> Not Logged
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" /> Resisted
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400/80 border border-red-400/30" /> Did It
            </span>
          </div>
        )}
      </div>

      <div className="glass-card p-4 border-white/5 mt-2 page-enter animate-none" key={selectedDate}>
        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
          <div>
            <h4 className="text-xs font-bold text-cyan-400">Selected Day Details</h4>
            <p className="text-xs text-white/60 font-semibold mt-0.5">
              {format(selectedDateObj, 'EEEE, MMM d, yyyy')}
            </p>
          </div>
          {selectedFilter === 'all' && goodHabits.length > 0 && (
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/20 font-bold">
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
                    isBad ? 'bg-red-400/15 text-red-400' : 'bg-cyan-400/15 text-cyan-400'
                  }`}>
                    {selectedHabit.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{selectedHabit.name}</p>
                    <p className="text-[10px] capitalize text-white/40 font-semibold">{selectedHabit.category}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    status === 'done' ? (isBad ? 'bg-red-400/10 text-red-400 border border-red-400/20' : 'bg-lime-400/10 text-lime-400 border border-lime-400/20') :
                    status === 'clean' ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' :
                    status === 'skipped' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' :
                    status === 'failed' ? 'bg-red-400/10 text-red-400 border border-red-400/20' :
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
                            ? 'border-lime-400/50 bg-lime-400/15 text-lime-300 shadow-md'
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
                            ? 'border-red-400/50 bg-red-400/15 text-red-300 shadow-md'
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
                            ? 'border-lime-400/50 bg-lime-400/15 text-lime-300 shadow-md'
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
                            ? 'border-amber-400/50 bg-amber-400/15 text-amber-300 shadow-md'
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
                            ? 'border-red-400/50 bg-red-400/15 text-red-300 shadow-md'
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
                                ? 'bg-lime-400/15 text-lime-300 border-lime-400/30'
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
                                ? 'bg-red-400/15 text-red-300 border-red-400/30'
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
                                ? 'bg-lime-400/15 text-lime-300 border-lime-400/30'
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
                                ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
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
                                ? 'bg-red-400/15 text-red-300 border-red-400/30'
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

const ChartCard = ({ icon: Icon, accent = CYAN, title, children }) => (
  <div className="glass-card p-4">
    <div className="flex items-center gap-2 mb-4">
      <div style={{ padding: 6, borderRadius: 8, background: `${accent}1A`, display: 'flex' }}>
        <Icon size={13} style={{ color: accent }} />
      </div>
      <span className="section-label">{title}</span>
    </div>
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
    { name: 'Good Done', value: goodDone, color: LIME },
    { name: 'Good Missed', value: goodMissed, color: 'rgba(255,255,255,0.05)' },
    { name: 'Bad Resisted', value: badResisted, color: CYAN },
    { name: 'Bad Done', value: badDone, color: CORAL },
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

  const axisStyle = { fill: MUTED, fontSize: 10, fontFamily: MONO }
  const gridStyle = { stroke: 'rgba(255,255,255,0.08)', opacity: 1 }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 page-enter">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <div className="absolute inset-0 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
        <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-muted)' }}>Syncing data from database...</p>
      </div>
    )
  }

  if (!hasLogs) {
    return (
      <div className="space-y-4 page-enter">
        <div>
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your progress at a glance</p>
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
            className="glass-btn glass-btn-accent mt-2"
            style={{ padding: '0.7rem 1.25rem', fontSize: 12, fontWeight: 700 }}
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
          <h1 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your progress at a glance</p>
        </div>
        <button id="analytics-export" onClick={exportCSV}
          className="glass-btn"
          style={{ padding: '0.5rem 0.85rem', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          <Download size={13} /> CSV
        </button>
      </div>

      {/* Range toggle — small glass pills, active = cyan tint */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-glass)' }}>
        {[{ val: 'week', label: '7 Days' }, { val: 'month', label: '30 Days' }].map(r => (
          <button key={r.val} id={`analytics-range-${r.val}`}
            onClick={() => setRange(r.val)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={range === r.val
              ? { background: 'rgba(34,211,238,0.15)', color: CYAN, border: '1px solid rgba(34,211,238,0.35)' }
              : { color: 'var(--text-muted)', border: '1px solid transparent', background: 'none' }}>
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
            <p className="section-label mb-2">📊 This Week vs Last Week</p>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: CYAN, fontFamily: MONO }}>{thisWeekPts}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>This week</p>
              </div>
              <div className="text-center px-3 py-1.5 rounded-xl" style={diff >= 0
                ? { background: 'rgba(163,230,53,0.12)', color: LIME }
                : { background: 'rgba(248,113,113,0.12)', color: CORAL }}>
                <p className="text-lg font-bold" style={{ fontFamily: MONO }}>{diff >= 0 ? '+' : ''}{diff}</p>
                <p className="text-[10px] font-bold">vs last week</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: VIOLET, fontFamily: MONO }}>{lastWeekPts}</p>
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Last week</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Chart A: Energy & Productivity Core */}
      <ChartCard icon={Activity} accent={CYAN} title="Energy & Productivity Core">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={energyData} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CYAN} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStyle.stroke} opacity={gridStyle.opacity} />
              <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" domain={[0, 16]} tick={axisStyle} axisLine={false} tickLine={false} width={30} />
              <YAxis yAxisId="right" orientation="right" tick={axisStyle} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar yAxisId="left" dataKey="sleepHours" name="Sleep (hrs)" fill={VIOLET} radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Area yAxisId="right" type="monotone" dataKey="steps" name="Steps" stroke={CYAN} fill="url(#energyGrad)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Chart B: Vibe & Hydration Matrix */}
      <ChartCard icon={Sparkles} accent={VIOLET} title="Vibe & Hydration Matrix">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={vibeData} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="vibeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CYAN} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStyle.stroke} opacity={gridStyle.opacity} />
              <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" domain={[1, 10]} tick={axisStyle} axisLine={false} tickLine={false} width={30} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 12]} tick={axisStyle} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar yAxisId="right" dataKey="water" name="Water (glasses)" fill={VIOLET} radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Area yAxisId="left" type="monotone" dataKey="mood" name="Mood" stroke={CYAN} fill="url(#vibeGrad)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Gym Attendance */}
      <ChartCard icon={BarChart2} accent={LIME} title="Gym Attendance">
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gymData} barCategoryGap="30%" margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStyle.stroke} opacity={gridStyle.opacity} />
              <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={30} domain={[0, 1]} ticks={[0, 1]} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="gym" name="Done" fill={LIME} radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey="skipped" name="Skipped" fill={CORAL} radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Points Earned */}
      <ChartCard icon={TrendingUp} accent={CYAN} title="Points Earned">
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pointsData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="ptsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CYAN} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStyle.stroke} opacity={gridStyle.opacity} />
              <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Area type="monotone" dataKey="pts" name="Points" stroke={CYAN} fill="url(#ptsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Habit Heatmap */}
      <ChartCard icon={Award} accent={LIME} title="30-Day Habit Heatmap">
        <HabitHeatmap habitsData={habitsData} logHabit={logHabit} />
      </ChartCard>

      {/* Habit Ratio */}
      {habitPieData.length > 0 && (
        <ChartCard icon={Award} accent={CYAN} title="Today's Habit Ratio">
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={habitPieData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={60} innerRadius={40}>
                  {habitPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{v}</span>} />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}
    </div>
  )
}
