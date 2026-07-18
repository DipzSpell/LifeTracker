/**
 * googleFitService.js — Google Fit REST API integration
 *
 * Uses Google Identity Services (GIS) token client for OAuth (no backend
 * required — this is a pure client-side implicit-style token flow scoped
 * to read-only Fitness data). The access token lives only in memory / the
 * browser session; it is never persisted to Supabase.
 *
 * Requires VITE_GOOGLE_FIT_CLIENT_ID in .env — see .env.example.
 */

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const SLEEP_ACTIVITY_TYPE = 72 // Google Fit activity type constant for "sleep"

export const GOOGLE_FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
].join(' ')

export function isGoogleFitConfigured() {
  return !!import.meta.env.VITE_GOOGLE_FIT_CLIENT_ID
}

let gisLoadPromise = null
function loadGoogleIdentityServices() {
  if (gisLoadPromise) return gisLoadPromise
  gisLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return }
    const script = document.createElement('script')
    script.src = GIS_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'))
    document.head.appendChild(script)
  })
  return gisLoadPromise
}

/**
 * Opens the Google consent popup and resolves with a short-lived access
 * token (typically 1 hour) scoped to read-only Fitness data.
 */
export async function requestGoogleFitAccessToken() {
  const clientId = import.meta.env.VITE_GOOGLE_FIT_CLIENT_ID
  if (!clientId) {
    throw new Error('VITE_GOOGLE_FIT_CLIENT_ID is not set — add it to your .env file to enable Google Fit sync.')
  }
  await loadGoogleIdentityServices()

  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_FIT_SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error))
          return
        }
        resolve({
          accessToken: response.access_token,
          expiresAt: Date.now() + (Number(response.expires_in) || 3600) * 1000,
        })
      },
      error_callback: (err) => reject(new Error(err?.message || 'Google Fit authorization was cancelled.')),
    })
    tokenClient.requestAccessToken({ prompt: '' })
  })
}

async function fitFetch(accessToken, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Google Fit API error (${res.status}): ${text.slice(0, 200)}`)
  }
  return res.json()
}

function dateKeyFromMillis(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Daily step totals, bucketed by day, for the given time range. */
export async function fetchDailySteps(accessToken, startTimeMillis, endTimeMillis) {
  const data = await fitFetch(accessToken, 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: String(startTimeMillis),
      endTimeMillis: String(endTimeMillis),
    }),
  })

  const rows = []
  for (const bucket of data.bucket || []) {
    const steps = (bucket.dataset || [])
      .flatMap(ds => ds.point || [])
      .reduce((sum, p) => sum + (p.value?.[0]?.intVal || 0), 0)
    if (steps > 0) {
      rows.push({
        reading_type: 'steps',
        value: steps,
        unit: 'steps',
        reading_date: dateKeyFromMillis(Number(bucket.startTimeMillis)),
        reading_time: new Date(Number(bucket.endTimeMillis)).toISOString(),
        source: 'google_fit',
      })
    }
  }
  return rows
}

/** Daily average heart rate (bpm), bucketed by day, for the given time range. */
export async function fetchDailyHeartRate(accessToken, startTimeMillis, endTimeMillis) {
  const data = await fitFetch(accessToken, 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName: 'com.google.heart_rate.bpm' }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: String(startTimeMillis),
      endTimeMillis: String(endTimeMillis),
    }),
  })

  const rows = []
  for (const bucket of data.bucket || []) {
    const points = (bucket.dataset || []).flatMap(ds => ds.point || [])
    if (!points.length) continue
    const avg = points.reduce((sum, p) => sum + (p.value?.[0]?.fpVal || 0), 0) / points.length
    rows.push({
      reading_type: 'heart_rate',
      value: Math.round(avg),
      unit: 'bpm',
      reading_date: dateKeyFromMillis(Number(bucket.startTimeMillis)),
      reading_time: new Date(Number(bucket.endTimeMillis)).toISOString(),
      source: 'google_fit',
    })
  }
  return rows
}

/** Sleep sessions (activityType 72) in the given time range. */
export async function fetchSleepSessions(accessToken, startTimeMillis, endTimeMillis) {
  const startTime = new Date(startTimeMillis).toISOString()
  const endTime = new Date(endTimeMillis).toISOString()
  const url = `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`
  const data = await fitFetch(accessToken, url)

  return (data.session || [])
    .filter(s => s.activityType === SLEEP_ACTIVITY_TYPE)
    .map(s => {
      const start = Number(s.startTimeMillis)
      const end = Number(s.endTimeMillis)
      const hours = Math.round(((end - start) / 3600000) * 10) / 10
      return {
        reading_type: 'sleep',
        value: hours,
        unit: 'hours',
        reading_date: dateKeyFromMillis(start),
        reading_time: new Date(end).toISOString(),
        source: 'google_fit',
      }
    })
}

/** Fetches steps + heart rate + sleep for the last 7 days in one call. */
export async function syncGoogleFitLast7Days(accessToken) {
  const endTimeMillis = Date.now()
  const startTimeMillis = endTimeMillis - 7 * 86400000

  const [steps, heartRate, sleep] = await Promise.all([
    fetchDailySteps(accessToken, startTimeMillis, endTimeMillis),
    fetchDailyHeartRate(accessToken, startTimeMillis, endTimeMillis),
    fetchSleepSessions(accessToken, startTimeMillis, endTimeMillis),
  ])

  return [...steps, ...heartRate, ...sleep]
}