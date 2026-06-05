import { useCallback } from 'react'
import { useApp } from '../context/AppContext'

/**
 * useNotifications
 * ─────────────────────────────────────────────────────────────────
 * Central notification utility. Exposes:
 *   requestPermission()  — asks the OS for Notification permission (once)
 *   sendSystemNotification(title, body) — fires an OS-level alert
 *   addNotification({ title, description, type }) — appends to in-app list
 *   notify(title, body, type) — calls both addNotification + sendSystemNotification
 */
export function useNotifications() {
  const { dispatch, settings } = useApp()

  /** Ask the browser for OS notification permission. Call at most once. */
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied'
    if (Notification.permission !== 'default') return Notification.permission
    try {
      return await Notification.requestPermission()
    } catch {
      return 'denied'
    }
  }, [])

  /** Fire a real OS-level push notification (non-blocking). */
  const sendSystemNotification = useCallback((title, body) => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (settings?.notificationsEnabled === false) return
    try {
      new Notification(title, { body, icon: '/icon-192.png' })
    } catch (err) {
      console.debug('[Notification] OS push failed:', err)
    }
  }, [settings?.notificationsEnabled])

  /** Append an in-app notification entry to global state. */
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

  /**
   * Master trigger — fires BOTH an in-app entry AND an OS push.
   * @param {string} title  — Short headline shown in OS banner + bell list
   * @param {string} body   — Longer detail line (OS body / in-app description)
   * @param {string} type   — 'points' | 'streak' | 'system'
   */
  const notify = useCallback((title, body, type = 'system') => {
    addNotification({ title, description: body, type })
    sendSystemNotification(title, body)
  }, [addNotification, sendSystemNotification])

  return { requestPermission, sendSystemNotification, addNotification, notify }
}
