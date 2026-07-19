/**
 * googleFitService.js — Google Fit REST API integration
 *
 * Uses Google Identity Services (GIS) token client for OAuth (no backend
 * required — this is a pure client-side implicit-style token flow scoped
 * to read-only Fitness data). The access token lives only in memory / the
 * browser session; it is never persisted to Supabase.
 *
 * Requires VITE_GOOGLE_FIT_CLIENT_ID in .env — see .env.example.
 *
 * Day buckets are anchored to LOCAL midnight (not "now minus N*24h"), and
 * every API call is console-logged (request + response) — both fixes for
 * a real bug: anchoring to "now" instead of local midnight made "today"'s
 * bucket only cover the last few hours since the anchor time, undercounting
 * (often to near-zero) the true daily total. The steps aggregate also now
 * pins dataSourceId to the estimated_steps derived stream — omitting it
 * makes Google merge multiple contributing apps' streams, which can come
 * back empty/partial depending on what's installed on the phone.
 */

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const SLEEP_ACTIVITY_TYPE = 72 // Google Fit activity type constant for "sleep"
const STEPS_DATA_SOURCE_ID = 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'

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

/**
 * Thrown when Google Fit responds 401/403 — token expired/revoked or scope
 * denied. Callers should treat this as "disconnected" and prompt reconnect,
 * not just show a generic error toast.
 */
export class GoogleFitAuthError extends Error {
  constructor(status, body) {
    super(`Google Fit authorization expired or was denied (${status}). Reconnect Google Fit to continue syncing.`)
    this.name = 'GoogleFitAuthError'
    this.status = status
    this.body = body
  }
}

let callSeq = 0
async function fitFetch(accessToken, url, options = {}) {
  const id = ++callSeq
  const label = `[GoogleFit #${id}] ${options.method || 'GET'} ${url}`
  if (options.body) console.log(label, 'request body:', options.body)
  else console.log(label)

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const text = await res.text().catch(() => '')
  console.log(`[GoogleFit #${id}] response status: ${res.status}`, text.slice(0, 500))

  if (res.status === 401 || res.status === 403) {
    throw new GoogleFitAuthError(res.status, text)
  }
  if (!res.ok) {
    throw new Error(`Google Fit API error (${res.status}): ${text.slice(0, 200)}`)
  }
  return text ? JSON.parse(text) : {}
}

function dateKeyFromMillis(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Local midnight N days ago, in epoch millis (NOT UTC midnight). */
function localMidnightMillisAgo(daysAgo) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return d.getTime()
}

/** Daily step totals, bucketed by LOCAL day, for the given time range. */
export async function fetchDailySteps(accessToken, startTimeMillis, endTimeMillis) {
  const data = await fitFetch(accessToken, 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    body: JSON.stringify({
      aggregateBy: [{
        dataTypeName: 'com.google.step_count.delta',
        dataSourceId: STEPS_DATA_SOURCE_ID,
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: String(startTimeMillis),
      endTimeMillis: String(endTimeMillis),
    }),
  })

  if (!data.bucket?.length) {
    console.warn('[GoogleFit] steps: no buckets in response for range', new Date(startTimeMillis), '→', new Date(endTimeMillis))
  }

  const rows = []
  for (const bucket of data.bucket || []) {
    const steps = (bucket.dataset || [])
      .flatMap(ds => ds.point || [])
      .reduce((sum, p) => sum + (p.value?.[0]?.intVal || 0), 0)
    console.log(`[GoogleFit] steps bucket ${dateKeyFromMillis(Number(bucket.startTimeMillis))}: ${steps}`)
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

/** Daily average heart rate (bpm), bucketed by LOCAL day, for the given time range. */
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

  if (!data.bucket?.length) {
    console.warn('[GoogleFit] heart_rate: no buckets in response for range', new Date(startTimeMillis), '→', new Date(endTimeMillis))
  }

  const rows = []
  for (const bucket of data.bucket || []) {
    const points = (bucket.dataset || []).flatMap(ds => ds.point || [])
    console.log(`[GoogleFit] heart_rate bucket ${dateKeyFromMillis(Number(bucket.startTimeMillis))}: ${points.length} points`)
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

/** Daily total calories burned, bucketed by LOCAL day, for the given time range. */
export async function fetchDailyCalories(accessToken, startTimeMillis, endTimeMillis) {
  const data = await fitFetch(accessToken, 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName: 'com.google.calories.expended' }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: String(startTimeMillis),
      endTimeMillis: String(endTimeMillis),
    }),
  })

  if (!data.bucket?.length) {
    console.warn('[GoogleFit] calories: no buckets in response for range', new Date(startTimeMillis), '→', new Date(endTimeMillis))
  }

  const rows = []
  for (const bucket of data.bucket || []) {
    const cals = (bucket.dataset || [])
      .flatMap(ds => ds.point || [])
      .reduce((sum, p) => sum + (p.value?.[0]?.fpVal || 0), 0)
    console.log(`[GoogleFit] calories bucket ${dateKeyFromMillis(Number(bucket.startTimeMillis))}: ${Math.round(cals)}`)
    if (cals > 0) {
      rows.push({
        reading_type: 'calories',
        value: Math.round(cals),
        unit: 'kcal',
        reading_date: dateKeyFromMillis(Number(bucket.startTimeMillis)),
        reading_time: new Date(Number(bucket.endTimeMillis)).toISOString(),
        source: 'google_fit',
      })
    }
  }
  return rows
}

/** Sleep sessions (activityType 72) in the given time range. */
export async function fetchSleepSessions(accessToken, startTimeMillis, endTimeMillis) {
  const startTime = new Date(startTimeMillis).toISOString()
  const endTime = new Date(endTimeMillis).toISOString()
  const url = `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`
  const data = await fitFetch(accessToken, url)

  if (!data.session?.length) {
    console.warn('[GoogleFit] sessions: no sessions in response for range', startTime, '→', endTime)
  }

  const sleepSessions = (data.session || []).filter(s => s.activityType === SLEEP_ACTIVITY_TYPE)
  console.log(`[GoogleFit] sessions: ${data.session?.length || 0} total, ${sleepSessions.length} sleep`)

  return sleepSessions.map(s => {
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

/**
 * Fetches steps + heart rate + calories + sleep for the last N days
 * (default 7), anchored to LOCAL midnight so "today" is the full day so
 * far, not just the hours since whatever time the sync happened to run.
 * Returns { rows, summary } — summary is today's values for a sync-result
 * toast ("Synced: 7365 steps, HR 106 bpm").
 */
export async function syncGoogleFitLast7Days(accessToken, days = 7) {
  const endTimeMillis = Date.now()
  const startTimeMillis = localMidnightMillisAgo(days)
  console.log(`[GoogleFit] sync range: ${new Date(startTimeMillis)} → ${new Date(endTimeMillis)}`)

  const [steps, heartRate, calories, sleep] = await Promise.all([
    fetchDailySteps(accessToken, startTimeMillis, endTimeMillis),
    fetchDailyHeartRate(accessToken, startTimeMillis, endTimeMillis),
    fetchDailyCalories(accessToken, startTimeMillis, endTimeMillis),
    fetchSleepSessions(accessToken, startTimeMillis, endTimeMillis),
  ])

  const rows = [...steps, ...heartRate, ...calories, ...sleep]
  console.log(`[GoogleFit] sync fetched ${rows.length} rows total:`, {
    steps: steps.length, heartRate: heartRate.length, calories: calories.length, sleep: sleep.length,
  })

  const todayK = dateKeyFromMillis(Date.now())
  const summary = {
    steps: steps.find(r => r.reading_date === todayK)?.value ?? null,
    heartRate: [...heartRate].reverse().find(r => r.reading_date === todayK)?.value
      ?? [...heartRate].reverse()[0]?.value ?? null,
    calories: calories.find(r => r.reading_date === todayK)?.value ?? null,
  }
  console.log('[GoogleFit] today summary:', summary)

  return { rows, summary }
}
