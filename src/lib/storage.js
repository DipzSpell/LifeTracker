/**
 * localStorage helpers — primary data store for offline-first PWA.
 * All data is scoped per user ID for multi-user support.
 */

const PREFIX = 'lt_'

export const storage = {
  get(key, userId = 'guest') {
    try {
      const raw = localStorage.getItem(`${PREFIX}${userId}_${key}`)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  set(key, value, userId = 'guest') {
    try {
      localStorage.setItem(`${PREFIX}${userId}_${key}`, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },

  remove(key, userId = 'guest') {
    localStorage.removeItem(`${PREFIX}${userId}_${key}`)
  },

  clear(userId = 'guest') {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(`${PREFIX}${userId}_`))
    keys.forEach(k => localStorage.removeItem(k))
  },
}

// Date helpers
export const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const dateKey = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const getLast30Days = () => {
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(dateKey(d))
  }
  return days
}

export const getLast7Days = () => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(dateKey(d))
  }
  return days
}
