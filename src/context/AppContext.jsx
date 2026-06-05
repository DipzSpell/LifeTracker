import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { storage, todayKey, dateKey } from '../lib/storage'
import { calculateDayPoints, sumPoints } from '../lib/points'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { playClickSound } from '../lib/sounds'
// NOTE: useNotifications is defined in hooks/useNotifications.js and consumes
// this context — to avoid a circular dep we define notify helpers locally here.

const AppContext = createContext(null)

// ── Default state ──────────────────────────────────────────────────────────
const getDefaultState = () => ({
  // Daily logs: { [dateKey]: { ... } }
  dailyLogs: {},
  // Habits: { [id]: { id, name, type, icon, category, createdAt, entries: { [dateKey]: { status } } } }
  habits: {},
  // Todos: [{ id, title, desc, dueDate, priority, category, status, recurring, completedDate }]
  todos: [],
  // Fitness logs: { [dateKey]: { workoutType, distance, duration, calories, waterGlasses, weight } }
  fitnessLogs: {},
  // Points history: { [dateKey]: number }
  pointsHistory: {},
  // Earned badges: string[]
  earnedBadges: [],
  // Love tracker: { entries: [...], specialDates: [...] }
  loveTracker: { entries: [], specialDates: [] },
  // Settings
  settings: {
    wakeGoal: '06:00',
    sleepGoal: '23:00',
    waterGoal: 8,
    stepGoal: 8000,
    gymDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    pinEnabled: false,
    pin: null,
    darkMode: true,
    theme: 'dark',
    notificationsEnabled: false,
    sleepTrackerEnabled: true,
    loveTrackerEnabled: true,
    fitnessTrackerEnabled: true,
    soundEffectsEnabled: true,
    privacyBlurEnabled: false,
  },
  profile: {
    displayName: '',
    dob: null,
    height: null,
    weight: null,
    onboarding_completed: false,
    bonusPoints: 0,
  },
  // In-app notification history — each: { id, title, description, time, type, read }
  notifications: [],
  initialized: false,
})

// ── Reducer ────────────────────────────────────────────────────────────────
// ── Reducer ────────────────────────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return { ...state, ...action.payload, initialized: true }

    // Daily log
    case 'SAVE_DAILY_LOG': {
      const { date, log } = action.payload
      return {
        ...state,
        dailyLogs: { ...state.dailyLogs, [date]: { ...state.dailyLogs[date], ...log, date } },
      }
    }

    // Habits
    case 'ADD_HABIT': {
      const h = action.payload
      return { ...state, habits: { ...state.habits, [h.id]: h } }
    }
    case 'UPDATE_HABIT': {
      const { id, updates } = action.payload
      return { ...state, habits: { ...state.habits, [id]: { ...state.habits[id], ...updates } } }
    }
    case 'DELETE_HABIT': {
      const { [action.payload]: _deleted, ...rest } = state.habits
      return { ...state, habits: rest }
    }
    case 'LOG_HABIT': {
      const { habitId, date, status } = action.payload
      const habit = state.habits[habitId]
      if (!habit) return state
      return {
        ...state,
        habits: {
          ...state.habits,
          [habitId]: {
            ...habit,
            entries: { ...habit.entries, [date]: { status, loggedAt: new Date().toISOString() } },
          },
        },
      }
    }

    // Todos
    case 'ADD_TODO':
      return { ...state, todos: [action.payload, ...state.todos] }
    case 'UPDATE_TODO':
      return {
        ...state,
        todos: state.todos.map(t => t.id === action.payload.id ? { ...t, ...action.payload } : t),
      }
    case 'DELETE_TODO':
      return { ...state, todos: state.todos.filter(t => t.id !== action.payload) }

    // Fitness
    case 'SAVE_FITNESS_LOG': {
      const { date, log } = action.payload
      return {
        ...state,
        fitnessLogs: { ...state.fitnessLogs, [date]: { ...state.fitnessLogs[date], ...log } },
      }
    }

    // Points
    case 'UPDATE_POINTS': {
      const { date, pts } = action.payload
      return { ...state, pointsHistory: { ...state.pointsHistory, [date]: pts } }
    }

    // Badges
    case 'SET_BADGES':
      return { ...state, earnedBadges: action.payload }

    // Love tracker
    case 'ADD_LOVE_ENTRY':
      return {
        ...state,
        loveTracker: {
          ...state.loveTracker,
          entries: [action.payload, ...state.loveTracker.entries],
        },
      }
    case 'DELETE_LOVE_ENTRY':
      return {
        ...state,
        loveTracker: {
          ...state.loveTracker,
          entries: state.loveTracker.entries.filter(e => e.id !== action.payload),
        },
      }
    case 'ADD_SPECIAL_DATE':
      return {
        ...state,
        loveTracker: {
          ...state.loveTracker,
          specialDates: [action.payload, ...state.loveTracker.specialDates],
        },
      }
    case 'DELETE_SPECIAL_DATE':
      return {
        ...state,
        loveTracker: {
          ...state.loveTracker,
          specialDates: state.loveTracker.specialDates.filter(d => d.id !== action.payload),
        },
      }

    // Settings
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }

    case 'ADD_BONUS_POINTS':
      return {
        ...state,
        profile: {
          ...state.profile,
          bonusPoints: (state.profile?.bonusPoints || 0) + action.payload,
        },
      }

    case 'COMPLETE_PROFILE': {
      const { displayName, dob, height, weight } = action.payload
      return {
        ...state,
        profile: {
          ...state.profile,
          displayName,
          dob,
          height,
          weight,
          onboarding_completed: true,
        },
      }
    }

    // ── Notifications ────────────────────────────────────────────────────
    case 'ADD_NOTIFICATION':
      // Prepend new notification; cap list at 50 to avoid bloating stored state
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 50),
      }

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      }

    case 'RESET_STATE': {
      const defaultHabits = {
        'habit_gym': { id: 'habit_gym', name: 'Gym', type: 'good', icon: '🏋️', category: 'fitness', entries: {}, createdAt: new Date().toISOString() },
        'habit_walk': { id: 'habit_walk', name: 'Walk / Run', type: 'good', icon: '🚶', category: 'fitness', entries: {}, createdAt: new Date().toISOString() },
        'habit_read': { id: 'habit_read', name: 'Read', type: 'good', icon: '📚', category: 'mind', entries: {}, createdAt: new Date().toISOString() },
        'habit_meditate': { id: 'habit_meditate', name: 'Meditate', type: 'good', icon: '🧘', category: 'mind', entries: {}, createdAt: new Date().toISOString() },
        'habit_water': { id: 'habit_water', name: 'Drink Water Goal', type: 'good', icon: '💧', category: 'health', entries: {}, createdAt: new Date().toISOString() },
        'habit_sleep': { id: 'habit_sleep', name: 'Sleep on Time', type: 'good', icon: '😴', category: 'health', entries: {}, createdAt: new Date().toISOString() },
      }
      return {
        ...getDefaultState(),
        habits: defaultHabits,
        settings: {
          ...state.settings,
        },
        initialized: true,
      }
    }

    default:
      return state
  }
}

// ── Provider ───────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const { user, updateProfile } = useAuth()
  const uid = user?.uid || 'guest'
  const [state, dispatch] = useReducer(appReducer, getDefaultState())

  // Load from Supabase (or localStorage fallback) on mount / user change
  useEffect(() => {
    if (!uid || uid === 'guest') return

    let active = true

    async function loadState() {
      try {
        // 1. Try to load from Supabase
        const { data, error } = await supabase
          .from('user_states')
          .select('state')
          .eq('user_id', uid)
          .maybeSingle()

        if (!active) return

        if (error) {
          console.error('Error loading state from Supabase:', error)
          throw error
        }

        if (data?.state) {
          // Load state from DB
          dispatch({ type: 'INIT', payload: data.state })
          // Keep localStorage in sync as backup
          storage.set('appState', data.state, uid)
        } else {
          // No DB state found (new user). Check if they have local storage state
          const localSaved = storage.get('appState', uid)
          if (localSaved) {
            dispatch({ type: 'INIT', payload: localSaved })
            // Save to DB immediately
            await supabase.from('user_states').upsert({ user_id: uid, state: localSaved })
          } else {
            // Seed defaults
            const defaultHabits = {
              'habit_gym': { id: 'habit_gym', name: 'Gym', type: 'good', icon: '🏋️', category: 'fitness', entries: {}, createdAt: new Date().toISOString() },
              'habit_walk': { id: 'habit_walk', name: 'Walk / Run', type: 'good', icon: '🚶', category: 'fitness', entries: {}, createdAt: new Date().toISOString() },
              'habit_read': { id: 'habit_read', name: 'Read', type: 'good', icon: '📚', category: 'mind', entries: {}, createdAt: new Date().toISOString() },
              'habit_meditate': { id: 'habit_meditate', name: 'Meditate', type: 'good', icon: '🧘', category: 'mind', entries: {}, createdAt: new Date().toISOString() },
              'habit_water': { id: 'habit_water', name: 'Drink Water Goal', type: 'good', icon: '💧', category: 'health', entries: {}, createdAt: new Date().toISOString() },
              'habit_sleep': { id: 'habit_sleep', name: 'Sleep on Time', type: 'good', icon: '😴', category: 'health', entries: {}, createdAt: new Date().toISOString() },
            }
            const initialState = { habits: defaultHabits }
            dispatch({ type: 'INIT', payload: initialState })
            // Save to DB immediately
            await supabase.from('user_states').upsert({ user_id: uid, state: initialState })
          }
        }
      } catch (err) {
        console.warn('Falling back to local storage due to error:', err)
        // Offline fallback
        const localSaved = storage.get('appState', uid)
        if (localSaved) {
          dispatch({ type: 'INIT', payload: localSaved })
        } else {
          dispatch({ type: 'INIT', payload: { habits: {} } })
        }
      }
    }

    loadState()

    return () => {
      active = false
    }
  }, [uid])

  // Save to storage locally and sync to Supabase with a debounce
  useEffect(() => {
    if (!uid || uid === 'guest' || !state.initialized) return

    // 1. Immediately save to localstorage for instant responsiveness and offline support
    storage.set('appState', state, uid)

    // 2. Debounce writing to Supabase to prevent spamming the database
    const timer = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('user_states')
          .upsert({
            user_id: uid,
            state: state,
            updated_at: new Date().toISOString()
          })
        if (error) {
          console.error('Error syncing state to Supabase:', error)
        }
      } catch (err) {
        console.error('Failed to sync to Supabase:', err)
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [state, uid])

  // Recalculate points when logs change
  const recalcPoints = useCallback(() => {
    const today = todayKey()
    const log = state.dailyLogs[today]
    const fitnessLog = state.fitnessLogs[today] || {}
    const earned = calculateDayPoints(log || { date: today }, state.habits, state.todos, fitnessLog)
    const pts = sumPoints(earned)
    dispatch({ type: 'UPDATE_POINTS', payload: { date: today, pts } })
  }, [state.dailyLogs, state.habits, state.todos, state.fitnessLogs])

  // Computed values
  const totalPoints = Object.values(state.pointsHistory).reduce((s, p) => s + (p || 0), 0) + (state.profile?.bonusPoints || 0)

  const todayPoints = state.pointsHistory[todayKey()] || 0

  const getHabitStreak = useCallback((habitId) => {
    const habit = state.habits[habitId]
    if (!habit) return 0
    const isGood = habit.type === 'good'

    let streak = 0
    const d = new Date()

    // If today hasn't been logged yet, start checking from yesterday to preserve the active streak
    const todayK = dateKey(d)
    const todayEntry = habit.entries?.[todayK]
    const todayLogged = todayEntry && todayEntry.status !== null && todayEntry.status !== undefined

    if (!todayLogged) {
      d.setDate(d.getDate() - 1)
    }

    while (true) {
      const k = dateKey(d)
      const entry = habit.entries?.[k]
      const isSuccess = isGood ? entry?.status === 'done' : entry?.status === 'clean'

      if (isSuccess) {
        streak++
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  }, [state.habits])

  const getTodayLog = useCallback(() => state.dailyLogs[todayKey()] || null, [state.dailyLogs])

  const getTodayFitness = useCallback(() => state.fitnessLogs[todayKey()] || {}, [state.fitnessLogs])

  const getUpcomingTodos = useCallback((days = 7) => {
    const now = new Date()
    const end = new Date()
    end.setDate(end.getDate() + days)
    return state.todos
      .filter(t => {
        if (t.status === 'done') return false
        if (!t.dueDate) return false
        const due = new Date(t.dueDate)
        return due >= now && due <= end
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  }, [state.todos])

  // Safe global sound effects listener
  useEffect(() => {
    const handleGlobalClick = (e) => {
      try {
        const target = e.target.closest('button, a, [role="button"]')
        if (target && state.settings?.soundEffectsEnabled !== false) {
          playClickSound()
        }
      } catch (err) {
        console.debug('Failed to play click sound safely:', err)
      }
    }
    document.addEventListener('click', handleGlobalClick, { capture: true })
    return () => document.removeEventListener('click', handleGlobalClick, { capture: true })
  }, [state.settings?.soundEffectsEnabled])
 
  // Dynamic theme injector
  useEffect(() => {
    const currentTheme = state.settings?.theme || 'dark'
    document.documentElement.setAttribute('data-theme', currentTheme)
    localStorage.setItem('theme', currentTheme)
    
    if (currentTheme === 'dark' || currentTheme === 'midnight' || currentTheme === 'matrix' || currentTheme === 'cyberpunk') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [state.settings?.theme])

  // ── Privacy Blur — shoulder-surf protection ───────────────────────────
  // When privacyBlurEnabled is true, add body class on tab hide / window blur
  // and remove it instantly when the user returns.
  useEffect(() => {
    const privacyEnabled = state.settings?.privacyBlurEnabled

    const blur  = () => { if (privacyEnabled) document.body.classList.add('privacy-blurred') }
    const focus = () => document.body.classList.remove('privacy-blurred')

    const onVisibility = () => {
      if (document.hidden) blur()
      else focus()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', blur)
    window.addEventListener('focus', focus)

    // If the setting is toggled off, make sure we remove any lingering blur
    if (!privacyEnabled) document.body.classList.remove('privacy-blurred')

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', blur)
      window.removeEventListener('focus', focus)
    }
  }, [state.settings?.privacyBlurEnabled])

  // Explicit Supabase and local data reset
  const resetAppState = async () => {
    if (!uid || uid === 'guest') return
    
    // Explicit Supabase deletes across user data tables
    const tables = ['habits', 'tasks', 'logs', 'notebooks', 'user_states']
    for (const table of tables) {
      try {
        await supabase.from(table).delete().eq('user_id', uid)
      } catch (err) {
        console.warn(`[Reset] Supabase delete failed for table "${table}":`, err)
      }
    }

    // Reset local react-driven application state
    dispatch({ type: 'RESET_STATE' })
  }

  // ── Notification helpers (defined locally to avoid circular dep with useNotifications) ──
  const _fireSystemNotif = useCallback((title, body) => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (state.settings?.notificationsEnabled === false) return
    try { new Notification(title, { body, icon: '/icon-192.png' }) } catch { /* OS push not supported */ }
  }, [state.settings?.notificationsEnabled])

  const addNotification = useCallback(({ title, description, type = 'system' }) => {
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title,
        description,
        time: new Date().toISOString(),
        type,
        read: false,
      },
    })
  }, [dispatch])

  const notify = useCallback((title, body, type = 'system') => {
    addNotification({ title, description: body, type })
    _fireSystemNotif(title, body)
  }, [addNotification, _fireSystemNotif])

  const markAllNotificationsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' })
  }, [dispatch])

  const completeProfileOnboarding = async (displayName, dob, height, weight) => {
    if (!uid || uid === 'guest') return

    // 1. Update user metadata in Supabase Auth & AuthContext state
    await updateProfile({
      displayName,
      dob,
      height,
      weight,
      onboarding_completed: true,
    })

    // 2. Dispatch context actions to update local state immediately
    dispatch({ type: 'ADD_BONUS_POINTS', payload: 15 })
    dispatch({ type: 'COMPLETE_PROFILE', payload: { displayName, dob, height, weight } })

    // 3. Fire welcome notification
    notify('Profile Verified! 🎁', '15 Bonus points successfully claimed.', 'points')

    // 4. Immediately save the updated state to the user_states database and localStorage
    const updatedProfile = {
      ...state.profile,
      displayName,
      dob,
      height,
      weight,
      onboarding_completed: true,
      bonusPoints: (state.profile?.bonusPoints || 0) + 15,
    }
    const updatedState = {
      ...state,
      profile: updatedProfile,
    }

    storage.set('appState', updatedState, uid)

    const { error: dbError } = await supabase
      .from('user_states')
      .upsert({
        user_id: uid,
        state: updatedState,
        updated_at: new Date().toISOString(),
      })
    if (dbError) throw dbError
  }

  const value = {
    ...state,
    dispatch,
    totalPoints,
    todayPoints,
    getHabitStreak,
    getTodayLog,
    getTodayFitness,
    getUpcomingTodos,
    recalcPoints,
    uid,
    resetAppState,
    completeProfileOnboarding,
    // Notification API
    notify,
    addNotification,
    markAllNotificationsRead,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
