/**
 * useNotebooks — user-isolated CRUD hook for the `notebooks` table
 *
 * Features:
 *  - Fetches only the authenticated user's rows (RLS + explicit eq filter)
 *  - All mutations automatically inject user.uid so a user can never
 *    read or write another user's data
 *  - Optimistic UI updates (create / delete instantly update local state)
 *  - Optional realtime subscription to sync across tabs/devices
 *
 * DB schema required (see src/lib/schema.sql):
 *   create table public.notebooks (
 *     id         uuid primary key default gen_random_uuid(),
 *     user_id    uuid references auth.users not null,
 *     title      text not null,
 *     content    text default '',
 *     tags       text[] default '{}',
 *     pinned     boolean default false,
 *     created_at timestamptz default now(),
 *     updated_at timestamptz default now()
 *   );
 *   alter table public.notebooks enable row level security;
 *   create policy "notebooks: all own"
 *     on public.notebooks for all
 *     using  (auth.uid() = user_id)
 *     with check (auth.uid() = user_id);
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useNotebooks({ enableRealtime = false } = {}) {
  const { user } = useAuth()
  const uid = user?.uid      // Supabase UUID — same as auth.uid() in RLS

  const [notebooks, setNotebooks] = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const channelRef = useRef(null)

  // ── Fetch all notebooks for the current user ─────────────────────────────
  const fetchNotebooks = useCallback(async () => {
    if (!uid) { setNotebooks([]); return }
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', uid)                        // ← explicit isolation (belt + RLS suspenders)
        .order('pinned', { ascending: false })      // pinned first
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setNotebooks(data ?? [])
    } catch (err) {
      console.error('[useNotebooks] fetch error:', err)
      setError(err.message || 'Failed to load notebooks.')
    } finally {
      setLoading(false)
    }
  }, [uid])

  // ── Auto-fetch on user change ─────────────────────────────────────────────
  useEffect(() => {
    fetchNotebooks()
  }, [fetchNotebooks])

  // ── Optional realtime subscription ────────────────────────────────────────
  useEffect(() => {
    if (!enableRealtime || !uid) return

    channelRef.current = supabase
      .channel(`notebooks:user:${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notebooks', filter: `user_id=eq.${uid}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotebooks(prev => [payload.new, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setNotebooks(prev => prev.map(n => n.id === payload.new.id ? payload.new : n))
          } else if (payload.eventType === 'DELETE') {
            setNotebooks(prev => prev.filter(n => n.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enableRealtime, uid])

  // ── Create ────────────────────────────────────────────────────────────────
  const createNotebook = async ({ title, content = '', tags = [], pinned = false }) => {
    if (!uid) throw new Error('Not authenticated')

    // Optimistic insert — prepend a temporary row
    const tempId = `temp-${Date.now()}`
    const tempRow = {
      id: tempId, user_id: uid, title, content, tags, pinned,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    setNotebooks(prev => [tempRow, ...prev])

    try {
      const { data, error: insertError } = await supabase
        .from('notebooks')
        .insert({
          user_id: uid,                             // ← always attach authenticated user id
          title,
          content,
          tags,
          pinned,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Replace temp row with real DB row
      setNotebooks(prev => prev.map(n => n.id === tempId ? data : n))
      return data
    } catch (err) {
      // Roll back optimistic update on error
      setNotebooks(prev => prev.filter(n => n.id !== tempId))
      throw err
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────
  const updateNotebook = async (id, updates) => {
    if (!uid) throw new Error('Not authenticated')

    // Optimistic update
    setNotebooks(prev =>
      prev.map(n => n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n)
    )

    const { data, error: updateError } = await supabase
      .from('notebooks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', uid)                          // ← double-check ownership client-side
      .select()
      .single()

    if (updateError) {
      // Roll back — refetch to get consistent state
      fetchNotebooks()
      throw updateError
    }
    setNotebooks(prev => prev.map(n => n.id === id ? data : n))
    return data
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteNotebook = async (id) => {
    if (!uid) throw new Error('Not authenticated')

    // Optimistic delete
    setNotebooks(prev => prev.filter(n => n.id !== id))

    const { error: deleteError } = await supabase
      .from('notebooks')
      .delete()
      .eq('id', id)
      .eq('user_id', uid)                          // ← double-check ownership client-side

    if (deleteError) {
      // Roll back
      fetchNotebooks()
      throw deleteError
    }
  }

  // ── Toggle pin ────────────────────────────────────────────────────────────
  const togglePin = async (id) => {
    const notebook = notebooks.find(n => n.id === id)
    if (!notebook) return
    return updateNotebook(id, { pinned: !notebook.pinned })
  }

  return {
    notebooks,
    loading,
    error,
    refetch: fetchNotebooks,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    togglePin,
  }
}
