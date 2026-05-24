/**
 * Points Engine — defines all rules for awarding and deducting points.
 */

export const POINTS_RULES = {
  // Positive
  GYM_DONE: { pts: 10, label: 'Gym done', icon: '🏋️' },
  STEPS_5K: { pts: 5, label: 'Walked 5,000+ steps', icon: '👟' },
  STEPS_10K: { pts: 10, label: 'Walked 10,000+ steps', icon: '🚀' },
  SLEPT_ON_TIME: { pts: 5, label: 'Slept on time', icon: '😴' },
  TODO_DONE: { pts: 3, label: 'Task completed', icon: '✅' },
  BRUSHED: { pts: 2, label: 'Brushed teeth', icon: '🦷' },
  BATHED: { pts: 2, label: 'Bathed/Showered', icon: '🚿' },
  MEDITATED: { pts: 5, label: 'Meditated', icon: '🧘' },
  WATER_GOAL: { pts: 3, label: 'Water goal reached', icon: '💧' },
  NO_BAD_HABIT: { pts: 15, label: 'No bad habits day', icon: '🌟' },
  STREAK_7: { pts: 50, label: '7-day streak bonus!', icon: '🔥' },
  STREAK_30: { pts: 200, label: '30-day streak bonus!', icon: '💎' },
  READ: { pts: 5, label: 'Read today', icon: '📚' },
  LOGGED_DAY: { pts: 1, label: 'Logged the day', icon: '📝' },
  WOKE_EARLY: { pts: 5, label: 'Woke before 6am', icon: '🌅' },
  // Negative
  SKIPPED_GYM: { pts: -5, label: 'Skipped gym', icon: '😞' },
  SLEPT_LATE: { pts: -3, label: 'Slept very late', icon: '🌙' },
  BAD_HABIT: { pts: -5, label: 'Bad habit logged', icon: '⚠️' },
}

/**
 * Calculate points for a given daily log entry
 * @param {object} log - The daily log object
 * @param {object} habits - Habits data { [id]: { doneDates: [], type: 'good'|'bad' } }
 * @returns {Array} Array of { rule, pts, label, icon }
 */
export function calculateDayPoints(log, habits = {}, todos = []) {
  const earned = []

  if (!log) return earned

  // Gym
  if (log.gymStatus === 'done') earned.push(POINTS_RULES.GYM_DONE)
  if (log.gymStatus === 'skipped') earned.push(POINTS_RULES.SKIPPED_GYM)

  // Steps
  const steps = log.steps || 0
  if (steps >= 10000) earned.push(POINTS_RULES.STEPS_10K)
  else if (steps >= 5000) earned.push(POINTS_RULES.STEPS_5K)

  // Sleep
  if (log.wokeEarly) earned.push(POINTS_RULES.WOKE_EARLY)
  if (log.sleptOnTime) earned.push(POINTS_RULES.SLEPT_ON_TIME)
  if (log.sleptLate) earned.push(POINTS_RULES.SLEPT_LATE)

  // Morning routine
  if (log.brushed) earned.push(POINTS_RULES.BRUSHED)
  if (log.bathed) earned.push(POINTS_RULES.BATHED)
  if (log.meditated) earned.push(POINTS_RULES.MEDITATED)

  // Water
  if (log.waterGoalMet) earned.push(POINTS_RULES.WATER_GOAL)

  // Logged the day
  earned.push(POINTS_RULES.LOGGED_DAY)

  // Todos completed today
  const completedTodos = todos.filter(t => t.completedDate === log.date && t.status === 'done')
  completedTodos.forEach(() => earned.push({ ...POINTS_RULES.TODO_DONE }))

  // Bad habits check
  const badHabitIds = Object.keys(habits).filter(id => habits[id].type === 'bad')
  const hasBadHabitToday = badHabitIds.some(id =>
    habits[id].entries?.[log.date]?.status === 'done'
  )
  if (!hasBadHabitToday && badHabitIds.length > 0) {
    earned.push(POINTS_RULES.NO_BAD_HABIT)
  }

  return earned
}

export function sumPoints(earnedArray) {
  return earnedArray.reduce((sum, e) => sum + e.pts, 0)
}

// Badges
export const BADGES = {
  WARRIOR_7: {
    id: 'WARRIOR_7',
    name: '7-Day Warrior',
    desc: 'Completed gym 7 days in a row',
    icon: '⚔️',
    color: 'from-orange-500 to-red-500',
  },
  CLEAN_WEEK: {
    id: 'CLEAN_WEEK',
    name: 'Clean Week',
    desc: 'All good habits done for a full week',
    icon: '✨',
    color: 'from-cyan-400 to-blue-500',
  },
  EARLY_BIRD: {
    id: 'EARLY_BIRD',
    name: 'Early Bird',
    desc: 'Woke up before 6am',
    icon: '🌅',
    color: 'from-yellow-400 to-orange-400',
  },
  STEP_MASTER: {
    id: 'STEP_MASTER',
    name: 'Step Master',
    desc: '10,000 steps in a day',
    icon: '👟',
    color: 'from-green-400 to-emerald-500',
  },
  HYDRATION_HERO: {
    id: 'HYDRATION_HERO',
    name: 'Hydration Hero',
    desc: 'Hit water goal 7 days in a row',
    icon: '💧',
    color: 'from-blue-400 to-cyan-500',
  },
  ZEN_MASTER: {
    id: 'ZEN_MASTER',
    name: 'Zen Master',
    desc: 'Meditated 7 days in a row',
    icon: '🧘',
    color: 'from-purple-400 to-pink-500',
  },
  CENTURION: {
    id: 'CENTURION',
    name: 'Centurion',
    desc: 'Earned 1000 total points',
    icon: '💯',
    color: 'from-yellow-400 to-yellow-600',
  },
  DIAMOND: {
    id: 'DIAMOND',
    name: 'Diamond Streak',
    desc: '30-day habit streak',
    icon: '💎',
    color: 'from-cyan-300 to-purple-500',
  },
  NIGHT_OWL_TAMED: {
    id: 'NIGHT_OWL_TAMED',
    name: 'Night Owl Tamed',
    desc: 'Slept on time for 5 days straight',
    icon: '🦉',
    color: 'from-indigo-400 to-blue-600',
  },
  TASK_KING: {
    id: 'TASK_KING',
    name: 'Task King',
    desc: 'Completed 50 tasks total',
    icon: '👑',
    color: 'from-yellow-500 to-amber-600',
  },
}

/**
 * Check which badges have been earned based on history
 */
export function checkBadges(history = {}, habits = {}, todos = [], totalPoints = 0) {
  const earned = new Set()
  const days = Object.keys(history).sort()

  // Step Master
  const hasStepDay = days.some(d => (history[d]?.steps || 0) >= 10000)
  if (hasStepDay) earned.add('STEP_MASTER')

  // Early Bird
  const hasEarlyDay = days.some(d => history[d]?.wokeEarly)
  if (hasEarlyDay) earned.add('EARLY_BIRD')

  // Centurion
  if (totalPoints >= 1000) earned.add('CENTURION')

  // Task King
  const doneTodos = todos.filter(t => t.status === 'done').length
  if (doneTodos >= 50) earned.add('TASK_KING')

  // Gym 7-day streak
  let gymStreak = 0
  for (const d of days) {
    if (history[d]?.gymStatus === 'done') {
      gymStreak++
      if (gymStreak >= 7) { earned.add('WARRIOR_7'); break }
    } else if (history[d]?.gymStatus !== 'rest') {
      gymStreak = 0
    }
  }

  // Sleep on time 5 days
  let sleepStreak = 0
  for (const d of days) {
    if (history[d]?.sleptOnTime) {
      sleepStreak++
      if (sleepStreak >= 5) { earned.add('NIGHT_OWL_TAMED'); break }
    } else {
      sleepStreak = 0
    }
  }

  return [...earned]
}
