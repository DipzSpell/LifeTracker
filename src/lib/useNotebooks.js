/**
 * useNotebooks — user-isolated data fetching hook
 *
 * Fetches rows from the `notebooks` table where user_id = authenticated user's id.
 * All CRUD helpers automatically inject the current user's id so a user can
 * never accidentally read or write another user's data.
 *
 * Requires Supabase Row Level Security on the `notebooks` table:
 *
 *   create table public.notebooks (
 *     id         uuid primary key default gen_random_uuid(),
 *     user_id    uuid references auth.users not null,
 *     title      text not null,
 *     content    text,
 *     created_at timestamptz default now(),
 *     updated_at timestamptz default now()
 *   );
 *   alter table public.notebooks enable row level security;
 *   create policy "CRUD own notebooks"
 *     on public.notebooks for all
 *     using (auth.uid() = user_id)
 *     with check (auth.uid() = user_id);
 */
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useNotebooks() {
  const { user } = useAuth()
  const [notebooks, setNotebooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // ── Fetch all notebooks for the current user ───────────────────────────
  const fetchNotebooks = useCallback(async () => {
    if (!user?.uid) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', user.uid)       // ← data isolation: only this user's rows
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setNotebooks(data ?? [])
    } catch (err) {
      console.error('[useNotebooks] fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.uid])

  // ── Auto-fetch when the authenticated user changes ─────────────────────
  useEffect(() => {
    fetchNotebooks()
  }, [fetchNotebooks])

  // ── Create a new notebook entry ────────────────────────────────────────
  const createNotebook = async ({ title, content = '' }) => {
    if (!user?.uid) throw new Error('Not authenticated')
    const { data, error: insertError } = await supabase
      .from('notebooks')
      .insert({
        user_id: user.uid,            // ← always attach the authenticated user id
        title,
        content,
      })
      .select()
      .single()

    if (insertError) throw insertError
    setNotebooks((prev) => [data, ...prev])
    return data
  }

  // ── Update an existing notebook entry ──────────────────────────────────
  const updateNotebook = async (id, updates) => {
    if (!user?.uid) throw new Error('Not authenticated')
    const { data, error: updateError } = await supabase
      .from('notebooks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.uid)        // ← double-check ownership client-side
      .select()
      .single()

    if (updateError) throw updateError
    setNotebooks((prev) => prev.map((n) => (n.id === id ? data : n)))
    return data
  }

  // ── Delete a notebook entry ────────────────────────────────────────────
  const deleteNotebook = async (id) => {
    if (!user?.uid) throw new Error('Not authenticated')
    const { error: deleteError } = await supabase
      .from('notebooks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.uid)        // ← double-check ownership client-side

    if (deleteError) throw deleteError
    setNotebooks((prev) => prev.filter((n) => n.id !== id))
  }

  return {
    notebooks,
    loading,
    error,
    refetch: fetchNotebooks,
    createNotebook,
    updateNotebook,
    deleteNotebook,
  }
}
