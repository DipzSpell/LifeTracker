/**
 * HealthSync.jsx — Bluetooth + Google Fit device sync (design-system UI).
 *
 * Presentation only — Bluetooth GATT connection, Google Fit OAuth/sync,
 * Supabase health_readings read/write, all auto-reconnect logic unchanged.
 *
 * Hero status: dark glass-card, cyan glow when any device is connected
 * (no bright green/purple gradients). Rings: Steps=cyan, HR=coral, Sleep=violet.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  Watch, Bluetooth, BluetoothConnected, Battery, HeartPulse, RefreshCw,
  CheckCircle2, Footprints, Moon, WifiOff, Link2Off, Zap, Flame,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { todayKey } from '../lib/storage'
import { isBluetoothSupported, connectHealthDevice } from '../lib/bluetoothService'
import {
  isGoogleFitConfigured, requestGoogleFitAccessToken, syncGoogleFitLast7Days, GoogleFitAuthError,
} from '../lib/googleFitService'
import Toast, { useToast } from '../components/ui/Toast'
import ProgressRing from '../components/bevel/ProgressRing'

/* ── Design-system palette (mirrors src/styles/theme.css) — CSS-var strings
   so they re-resolve live on theme switch, no JS hook needed ──────────── */
const C = {
  cyan: 'var(--accent)',
  lime: 'var(--success)',
  violet: 'var(--special)',
  coral: 'var(--danger)',
  muted: 'var(--text-muted)',
}
const MONO = "'JetBrains Mono', ui-monospace, monospace"

const GF_CONNECTED_KEY = 'healthsync_gf_connected'
const GF_LAST_SYNCED_KEY = 'healthsync_gf_last_synced'

function daysAgoKey(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ─────────────────────────────────────────────────────────────────────────
   HERO CARD — overall connection status (dark glass + cyan glow when live)
───────────────────────────────────────────────────────────────────────── */
function HeroCard({ bleConnected, gfConnected }) {
  const anyConnected = bleConnected || gfConnected
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="glass-card relative"
      style={{
        padding: '1.4rem 1.3rem',
        overflow: 'hidden',
        ...(anyConnected ? { boxShadow: '0 0 32px var(--accent-glow)', borderColor: 'rgb(var(--accent-rgb)/0.35)' } : {}),
      }}
    >
      <div className="flex items-center gap-4 relative">
        <div className="flex items-center justify-center flex-shrink-0" style={{
          width: 56, height: 56, borderRadius: 18,
          background: anyConnected ? 'rgb(var(--accent-rgb)/0.14)' : 'var(--bg-glass)',
        }}>
          <Watch size={26} style={{ color: anyConnected ? C.cyan : 'var(--text-muted)' }} />
        </div>
        <div>
          <span className="section-label">Health Sync</span>
          <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0' }}>
            {anyConnected ? 'Connected & Syncing' : 'No Devices Connected'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 relative flex-wrap">
        <span className="flex items-center gap-1.5" style={{
          fontSize: 11, fontWeight: 700, fontFamily: MONO,
          color: bleConnected ? C.cyan : 'var(--text-muted)',
          background: bleConnected ? 'rgb(var(--accent-rgb)/0.12)' : 'var(--bg-glass)',
          border: `1px solid ${bleConnected ? 'rgb(var(--accent-rgb)/0.35)' : 'var(--border-subtle)'}`,
          padding: '4px 10px', borderRadius: 20,
        }}>
          {bleConnected ? <BluetoothConnected size={12} /> : <Bluetooth size={12} />}
          Bluetooth {bleConnected ? 'Connected' : 'Off'}
        </span>
        <span className="flex items-center gap-1.5" style={{
          fontSize: 11, fontWeight: 700, fontFamily: MONO,
          color: gfConnected ? C.cyan : 'var(--text-muted)',
          background: gfConnected ? 'rgb(var(--accent-rgb)/0.12)' : 'var(--bg-glass)',
          border: `1px solid ${gfConnected ? 'rgb(var(--accent-rgb)/0.35)' : 'var(--border-subtle)'}`,
          padding: '4px 10px', borderRadius: 20,
        }}>
          <Zap size={12} />
          Google Fit {gfConnected ? 'Connected' : 'Off'}
        </span>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   BLUETOOTH CONNECT CARD
───────────────────────────────────────────────────────────────────────── */
function BluetoothCard({
  supported, connecting, connected, deviceName, battery, heartRate,
  onConnect, onDisconnect,
}) {
  if (!supported) {
    return (
      <div className="glass-card" style={{ padding: '1.2rem' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: 34, height: 34, borderRadius: 12, background: 'var(--bg-glass)' }}>
            <WifiOff size={17} style={{ color: 'var(--text-muted)' }} />
          </div>
          <span className="section-label">Bluetooth Device</span>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Web Bluetooth is not supported in this browser. Chrome ya Edge use karo is feature ke liye.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card" style={{ padding: '1.2rem' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: 34, height: 34, borderRadius: 12, background: 'rgb(var(--accent-rgb)/0.12)' }}>
            {connected ? <BluetoothConnected size={17} style={{ color: C.cyan }} /> : <Bluetooth size={17} style={{ color: C.cyan }} />}
          </div>
          <span className="section-label">Bluetooth Device</span>
        </div>
        {connected && <CheckCircle2 size={16} style={{ color: C.lime }} />}
      </div>

      {connected ? (
        <div className="space-y-3">
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{deviceName}</p>

          <div className="flex items-center gap-4">
            {heartRate != null && (
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgb(var(--danger-rgb)/0.12)' }}>
                  <HeartPulse size={15} className="bevel-heartbeat" style={{ color: C.coral }} />
                </span>
                <div>
                  <p className="stat-number" style={{ fontSize: 16, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{heartRate}</p>
                  <p style={{ fontSize: 9.5, color: 'var(--text-muted)', margin: 0 }}>BPM</p>
                </div>
              </div>
            )}
            {battery != null && (
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgb(var(--success-rgb)/0.12)' }}>
                  <Battery size={15} style={{ color: C.lime }} />
                </span>
                <div>
                  <p className="stat-number" style={{ fontSize: 16, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{battery}%</p>
                  <p style={{ fontSize: 9.5, color: 'var(--text-muted)', margin: 0 }}>Battery</p>
                </div>
              </div>
            )}
          </div>

          <button
            id="ble-disconnect-btn"
            onClick={onDisconnect}
            className="glass-btn w-full"
            style={{ padding: '0.6rem', color: C.coral, fontSize: 12.5, fontWeight: 700 }}
          >
            <Link2Off size={14} /> Disconnect
          </button>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
            Connect a heart rate monitor, band, or watch over Bluetooth (GATT). Live readings sync straight to your account.
          </p>
          <button
            id="ble-connect-btn"
            onClick={onConnect}
            disabled={connecting}
            className="glass-btn glass-btn-accent w-full disabled:opacity-60"
            style={{ padding: '0.65rem', fontSize: 12.5, fontWeight: 700 }}
          >
            {connecting ? <RefreshCw size={14} className="animate-spin" /> : <Bluetooth size={14} />}
            {connecting ? 'Connecting…' : 'Connect Device'}
          </button>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   GOOGLE FIT CONNECT CARD
───────────────────────────────────────────────────────────────────────── */
function GoogleFitCard({
  configured, connecting, connected, syncing, lastSynced, onConnect, onDisconnect, onSyncNow,
}) {
  return (
    <div className="glass-card" style={{ padding: '1.2rem' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center flex-shrink-0" style={{ width: 34, height: 34, borderRadius: 12, background: 'rgb(var(--accent-rgb)/0.12)' }}>
            <Zap size={17} style={{ color: C.cyan }} />
          </div>
          <span className="section-label">Google Fit</span>
        </div>
        {connected && <CheckCircle2 size={16} style={{ color: C.lime }} />}
      </div>

      {!configured ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Set <code style={{ background: 'var(--bg-glass)', padding: '1px 5px', borderRadius: 5, fontFamily: MONO }}>VITE_GOOGLE_FIT_CLIENT_ID</code> in your .env file to enable Google Fit sync.
        </p>
      ) : connected ? (
        <div className="space-y-3">
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Last synced: <strong style={{ color: 'var(--text-primary)' }}>{lastSynced ? formatDistanceToNow(lastSynced, { addSuffix: true }) : 'never'}</strong>
          </p>
          <div className="flex gap-2">
            <button
              id="gf-sync-now-btn"
              onClick={onSyncNow}
              disabled={syncing}
              className="glass-btn glass-btn-accent flex-1 disabled:opacity-60"
              style={{ padding: '0.6rem', fontSize: 12.5, fontWeight: 700 }}
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
            <button
              id="gf-disconnect-btn"
              onClick={onDisconnect}
              className="glass-btn"
              style={{ padding: '0.6rem 0.9rem', color: C.coral }}
            >
              <Link2Off size={13} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
            Sync steps, heart rate, and sleep from Google Fit — last 7 days, refreshed on demand.
          </p>
          <button
            id="gf-connect-btn"
            onClick={onConnect}
            disabled={connecting}
            className="glass-btn glass-btn-accent w-full disabled:opacity-60"
            style={{ padding: '0.65rem', fontSize: 12.5, fontWeight: 700 }}
          >
            {connecting ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            {connecting ? 'Connecting…' : 'Connect Google Fit'}
          </button>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   SYNCED DATA PREVIEW — 3 mini rings: Steps=cyan, HR=coral, Sleep=violet
───────────────────────────────────────────────────────────────────────── */
function SyncedPreview({ steps, stepGoal, heartRate, sleepHours }) {
  const stepPct = stepGoal > 0 ? Math.min(100, Math.round((steps / stepGoal) * 100)) : 0
  // Heart rate and sleep don't have a natural 0-100 "completion" — the rings
  // just frame the icon; step ring is the one with a real percentage.
  return (
    <div className="glass-card" style={{ padding: '1.2rem' }}>
      <span className="section-label block" style={{ marginBottom: 12 }}>Today's Synced Data</span>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-2">
          <ProgressRing pct={stepPct} size={64} stroke={6} from={C.cyan} to={C.cyan} mini
            center={<Footprints size={16} style={{ color: C.cyan }} />} trackColor="var(--border-subtle)" />
          <p className="stat-number" style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{steps.toLocaleString()}</p>
          <span className="section-label">Steps</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgb(var(--danger-rgb)/0.10)' }}>
            <HeartPulse size={22} className={heartRate != null ? 'bevel-heartbeat' : ''} style={{ color: C.coral }} />
          </div>
          <p className="stat-number" style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{heartRate != null ? `${heartRate} bpm` : '—'}</p>
          <span className="section-label">Latest HR</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgb(var(--special-rgb)/0.10)' }}>
            <Moon size={20} style={{ color: C.violet }} />
          </div>
          <p className="stat-number" style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{sleepHours != null ? `${sleepHours}h` : '—'}</p>
          <span className="section-label">Last Sleep</span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   SYNC HISTORY — compact mono rows
───────────────────────────────────────────────────────────────────────── */
const READING_META = {
  steps:      { icon: Footprints, color: C.cyan,   label: 'Steps' },
  heart_rate: { icon: HeartPulse, color: C.coral,  label: 'Heart Rate' },
  sleep:      { icon: Moon,       color: C.violet, label: 'Sleep' },
  calories:   { icon: Flame,      color: C.lime,   label: 'Calories' },
}
const SOURCE_LABEL = { google_fit: 'Google Fit', bluetooth: 'Bluetooth', manual: 'Manual' }

function SyncHistory({ rows }) {
  return (
    <div className="glass-card" style={{ padding: '1.2rem' }}>
      <span className="section-label block" style={{ marginBottom: 12 }}>Sync History</span>
      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.25rem 0', color: 'var(--text-muted)', fontSize: 13 }}>
          <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>📡</div>
          No syncs yet — connect a device above to get started.
        </div>
      ) : (
        <div className="flex flex-col">
          {rows.map((row, i) => {
            const meta = READING_META[row.reading_type] || READING_META.steps
            const Icon = meta.icon
            return (
              <div key={row.id} className="flex items-center gap-3"
                style={{ padding: '0.55rem 0.1rem', borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <span className="flex items-center justify-center flex-shrink-0" style={{ width: 28, height: 28, borderRadius: 9, background: `color-mix(in srgb, ${meta.color} 12%, transparent)` }}>
                  <Icon size={13} style={{ color: meta.color }} />
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO, color: 'var(--text-primary)', flexShrink: 0 }}>
                  {meta.label}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: MONO, color: meta.color, flexShrink: 0 }}>
                  {row.value}{row.unit === 'bpm' ? ' bpm' : row.unit === 'hours' ? 'h' : ''}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: MONO, marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
                  {SOURCE_LABEL[row.source] || row.source} · {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────── */
export default function HealthSync() {
  const { uid, settings } = useApp()
  const { toasts, addToast, removeToast } = useToast()

  const bleControllerRef = useRef(null)
  const lastHrInsertRef = useRef(0)
  const gfTokenRef = useRef(null)

  const [bleSupported] = useState(isBluetoothSupported())
  const [bleConnecting, setBleConnecting] = useState(false)
  const [bleConnected, setBleConnected] = useState(false)
  const [bleDeviceName, setBleDeviceName] = useState(null)
  const [bleBattery, setBleBattery] = useState(null)
  const [bleHeartRate, setBleHeartRate] = useState(null)

  const gfConfigured = isGoogleFitConfigured()
  const [gfConnecting, setGfConnecting] = useState(false)
  const [gfConnected, setGfConnected] = useState(false)
  const [gfSyncing, setGfSyncing] = useState(false)
  const [gfLastSynced, setGfLastSynced] = useState(() => {
    const stored = localStorage.getItem(GF_LAST_SYNCED_KEY)
    return stored ? Number(stored) : null
  })

  const [previewSteps, setPreviewSteps] = useState(0)
  const [previewHR, setPreviewHR] = useState(null)
  const [previewSleep, setPreviewSleep] = useState(null)
  const [history, setHistory] = useState([])

  const insertReadings = useCallback(async (rows) => {
    if (!uid || uid === 'guest' || !rows.length) return
    console.log('[HealthSync] inserting into health_readings:', rows)
    const { error } = await supabase.from('health_readings').insert(rows.map(r => ({ ...r, user_id: uid })))
    if (error) console.error('[HealthSync] insert failed:', error)
    else console.log('[HealthSync] insert succeeded')
  }, [uid])

  const loadPreviewAndHistory = useCallback(async () => {
    if (!uid || uid === 'guest') return
    const today = todayKey()

    const [stepsRes, hrRes, sleepRes, historyRes] = await Promise.all([
      supabase.from('health_readings').select('value').eq('user_id', uid).eq('reading_type', 'steps').eq('reading_date', today).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('health_readings').select('value').eq('user_id', uid).eq('reading_type', 'heart_rate').order('reading_time', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('health_readings').select('value').eq('user_id', uid).eq('reading_type', 'sleep').order('reading_time', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('health_readings').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(5),
    ])

    console.log('[HealthSync] loadPreviewAndHistory for', today, {
      steps: stepsRes.data?.value ?? null,
      heartRate: hrRes.data?.value ?? null,
      sleep: sleepRes.data?.value ?? null,
      stepsErr: stepsRes.error, hrErr: hrRes.error, sleepErr: sleepRes.error,
    })

    setPreviewSteps(stepsRes.data?.value || 0)
    setPreviewHR(hrRes.data?.value ?? null)
    setPreviewSleep(sleepRes.data?.value ?? null)
    setHistory(historyRes.data || [])
  }, [uid])

  useEffect(() => { loadPreviewAndHistory() }, [loadPreviewAndHistory])

  /* ── Bluetooth handlers ─────────────────────────────────────────────── */
  const handleConnectBluetooth = useCallback(async () => {
    setBleConnecting(true)
    try {
      const controller = await connectHealthDevice({
        onHeartRate: (bpm) => {
          setBleHeartRate(bpm)
          const now = Date.now()
          if (now - lastHrInsertRef.current > 4000) {
            lastHrInsertRef.current = now
            insertReadings([{
              reading_type: 'heart_rate', value: bpm, unit: 'bpm',
              reading_date: todayKey(), reading_time: new Date().toISOString(), source: 'bluetooth',
            }]).then(loadPreviewAndHistory)
          }
        },
        onBattery: (pct) => setBleBattery(pct),
        onDisconnect: () => {
          setBleConnected(false)
          setBleDeviceName(null)
          setBleBattery(null)
          setBleHeartRate(null)
          bleControllerRef.current = null
        },
      })
      bleControllerRef.current = controller
      setBleConnected(true)
      setBleDeviceName(controller.deviceName)
      addToast(`Connected to ${controller.deviceName}`, 'success')
    } catch (err) {
      if (err?.name !== 'NotFoundError') addToast(err.message, 'error')
    } finally {
      setBleConnecting(false)
    }
  }, [addToast, insertReadings, loadPreviewAndHistory])

  const handleDisconnectBluetooth = useCallback(() => {
    bleControllerRef.current?.disconnect()
    bleControllerRef.current = null
    setBleConnected(false)
    setBleDeviceName(null)
    setBleBattery(null)
    setBleHeartRate(null)
  }, [])

  /* ── Google Fit handlers ────────────────────────────────────────────── */
  const disconnectGoogleFitSilently = useCallback(() => {
    gfTokenRef.current = null
    setGfConnected(false)
    localStorage.removeItem(GF_CONNECTED_KEY)
  }, [])

  const runGoogleFitSync = useCallback(async (accessToken) => {
    if (!uid || uid === 'guest') {
      console.log('[HealthSync] skipping sync — no authenticated uid')
      return
    }
    console.log('[HealthSync] sync starting…')
    setGfSyncing(true)
    try {
      const { rows, summary } = await syncGoogleFitLast7Days(accessToken)
      console.log('[HealthSync] fetched rows from Google Fit:', rows.length, rows)

      const startDate = daysAgoKey(7)
      const { error: delErr } = await supabase.from('health_readings').delete()
        .eq('user_id', uid).eq('source', 'google_fit').gte('reading_date', startDate)
      if (delErr) console.error('[HealthSync] delete old google_fit rows failed:', delErr)
      else console.log('[HealthSync] cleared old google_fit rows since', startDate)

      if (rows.length) {
        await insertReadings(rows)
        console.log('[HealthSync] inserted', rows.length, 'rows into Supabase health_readings')
      } else {
        console.warn('[HealthSync] Google Fit returned zero rows — nothing to insert. Check the bucket logs above for an empty-response warning.')
      }

      const now = Date.now()
      setGfLastSynced(now)
      localStorage.setItem(GF_LAST_SYNCED_KEY, String(now))

      const parts = []
      if (summary.steps != null) parts.push(`${summary.steps.toLocaleString()} steps`)
      if (summary.heartRate != null) parts.push(`HR ${summary.heartRate} bpm`)
      if (summary.calories != null) parts.push(`${summary.calories} cal`)
      addToast(parts.length ? `Synced: ${parts.join(', ')}` : 'Synced, but no data found for today yet.', parts.length ? 'success' : 'info')

      await loadPreviewAndHistory()
      console.log('[HealthSync] preview + history reloaded from Supabase')
    } catch (err) {
      if (err instanceof GoogleFitAuthError) {
        console.error('[HealthSync] auth error, disconnecting:', err.status, err.body)
        disconnectGoogleFitSilently()
        addToast('Permission issue — reconnect Google Fit', 'error')
      } else {
        console.error('[HealthSync] sync failed:', err)
        addToast(err.message, 'error')
      }
    } finally {
      setGfSyncing(false)
    }
  }, [uid, insertReadings, addToast, loadPreviewAndHistory, disconnectGoogleFitSilently])

  const handleConnectGoogleFit = useCallback(async () => {
    setGfConnecting(true)
    try {
      const { accessToken, expiresAt } = await requestGoogleFitAccessToken()
      gfTokenRef.current = { accessToken, expiresAt }
      setGfConnected(true)
      localStorage.setItem(GF_CONNECTED_KEY, '1')
      await runGoogleFitSync(accessToken)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setGfConnecting(false)
    }
  }, [addToast, runGoogleFitSync])

  const handleDisconnectGoogleFit = useCallback(() => {
    const token = gfTokenRef.current?.accessToken
    if (token && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(token, () => {})
    }
    disconnectGoogleFitSilently()
  }, [disconnectGoogleFitSilently])

  const handleSyncNow = useCallback(() => {
    if (gfTokenRef.current?.accessToken) runGoogleFitSync(gfTokenRef.current.accessToken)
  }, [runGoogleFitSync])

  // Silent auto-reconnect + auto-sync on page load if previously connected
  useEffect(() => {
    if (!gfConfigured) return
    if (localStorage.getItem(GF_CONNECTED_KEY) !== '1') return
    requestGoogleFitAccessToken()
      .then(({ accessToken, expiresAt }) => {
        gfTokenRef.current = { accessToken, expiresAt }
        setGfConnected(true)
        runGoogleFitSync(accessToken)
      })
      .catch(() => {
        // Silent attempt failed (consent expired/revoked) — leave disconnected,
        // user can reconnect manually.
        localStorage.removeItem(GF_CONNECTED_KEY)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => { bleControllerRef.current?.disconnect() }, [])

  return (
    <div className="relative">
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="relative space-y-4" style={{ zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="px-1">
          <span className="section-label">Devices & Integrations</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>Health Sync</h1>
        </motion.div>

        <HeroCard bleConnected={bleConnected} gfConnected={gfConnected} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BluetoothCard
            supported={bleSupported}
            connecting={bleConnecting}
            connected={bleConnected}
            deviceName={bleDeviceName}
            battery={bleBattery}
            heartRate={bleHeartRate}
            onConnect={handleConnectBluetooth}
            onDisconnect={handleDisconnectBluetooth}
          />
          <GoogleFitCard
            configured={gfConfigured}
            connecting={gfConnecting}
            connected={gfConnected}
            syncing={gfSyncing}
            lastSynced={gfLastSynced}
            onConnect={handleConnectGoogleFit}
            onDisconnect={handleDisconnectGoogleFit}
            onSyncNow={handleSyncNow}
          />
        </div>

        <SyncedPreview
          steps={previewSteps}
          stepGoal={settings?.stepGoal || 8000}
          heartRate={bleHeartRate ?? previewHR}
          sleepHours={previewSleep}
        />

        <SyncHistory rows={history} />

        <div style={{ height: '1.5rem' }} />
      </div>
    </div>
  )
}
