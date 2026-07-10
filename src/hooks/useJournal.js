/**
 * useJournal.js — Custom hook for Daily Journal module using Supabase
 *
 * Features:
 *  - Fetches today's entry + 30-day history on mount
 *  - saveEntry() uses upsert (onConflict: user_id,entry_date) so saving
 *    twice on the same day safely updates instead of erroring
 *  - Auto-saves draft to localStorage every 10 seconds
 *  - Exposes draftSavedAt timestamp so the UI can show a "draft saved" flash
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

/** Returns local date string YYYY-MM-DD (not UTC, uses local timezone offset) */
function getLocalDateString() {
  const tzOffset = new Date().getTimezoneOffset() * 60000
  return new Date(Date.now() - tzOffset).toISOString().slice(0, 10)
}

const DRAFT_KEY_PREFIX = 'lt_journal_draft_'

export function useJournal() {
  const { user } = useAuth()
  const uid = user?.uid

  const [todayEntry,   setTodayEntry]   = useState(null)
  const [history,      setHistory]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState(null)
  const [draftSavedAt, setDraftSavedAt] = useState(null)   // timestamp of last auto-save

  const draftKey = uid ? `${DRAFT_KEY_PREFIX}${uid}_${getLocalDateString()}` : null

  // ── Load draft from localStorage ──────────────────────────────────────────
  const loadDraft = useCallback(() => {
    if (!draftKey) return null
    try {
      const raw = localStorage.getItem(draftKey)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }, [draftKey])

  // ── Save draft to localStorage ────────────────────────────────────────────
  const saveDraft = useCallback((form) => {
    if (!draftKey) return
    try {
      localStorage.setItem(draftKey, JSON.stringify(form))
      setDraftSavedAt(new Date())
    } catch { /* storage full – ignore */ }
  }, [draftKey])

  // ── Clear draft (after successful remote save) ────────────────────────────
  const clearDraft = useCallback(() => {
    if (!draftKey) return
    try { localStorage.removeItem(draftKey) } catch { /* ignore */ }
  }, [draftKey])

  // ── Fetch today + history from Supabase ───────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    setError(null)
    const todayStr = getLocalDateString()

    try {
      // 1. Today's entry
      const { data: todayData, error: todayErr } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', uid)
        .eq('entry_date', todayStr)
        .maybeSingle()

      if (todayErr) throw todayErr
      setTodayEntry(todayData)

      // 2. History — newest first, last 30 days
      const { data: historyData, error: historyErr } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', uid)
        .order('entry_date', { ascending: false })
        .limit(30)

      if (historyErr) throw historyErr
      setHistory(historyData || [])
    } catch (err) {
      console.error('[useJournal] fetch error:', err)
      setError(err.message || 'Failed to load journal data.')
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Upsert today's entry ──────────────────────────────────────────────────
  const saveEntry = async (form) => {
    if (!uid) throw new Error('Not authenticated')
    setSaving(true)
    setError(null)
    const todayStr = getLocalDateString()

    const record = {
      user_id:       uid,
      entry_date:    todayStr,
      top_things:    form.topThings  || [],
      work_notes:    form.work       || '',
      trading_notes: form.trading    || '',
      gym_notes:     form.gym        || '',
      mood_notes:    form.mood       || '',
      tomorrow_focus: form.tomorrow  || '',
    }

    try {
      const { data, error: saveErr } = await supabase
        .from('journal_entries')
        .upsert(record, { onConflict: 'user_id,entry_date' })
        .select()
        .single()

      if (saveErr) throw saveErr

      setTodayEntry(data)
      // Update history list in-place (replace today's row or prepend)
      setHistory(prev => {
        const rest = prev.filter(item => item.entry_date !== todayStr)
        return [data, ...rest]
      })
      // Clear localStorage draft after successful save
      clearDraft()
      return data
    } catch (err) {
      console.error('[useJournal] save error:', err)
      const msg = err.message || 'Failed to save journal entry.'
      setError(msg)
      throw new Error(msg, { cause: err })
    } finally {
      setSaving(false)
    }
  }

  return {
    todayEntry,
    history,
    loading,
    saving,
    error,
    saveEntry,
    saveDraft,
    loadDraft,
    clearDraft,
    draftSavedAt,
    refresh: fetchData,
  }
}
