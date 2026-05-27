/**
 * supabaseClient.js — canonical Supabase client export
 *
 * Place your credentials in .env at the project root:
 *   VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<your-anon-key>
 *
 * For Netlify: add the same vars in Site Settings → Environment Variables.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id')) {
  console.warn(
    '[Supabase] Missing or placeholder env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  )
}

/**
 * Supabase client — use this export everywhere in the app.
 *
 * Auth settings:
 *   - autoRefreshToken: keeps JWT fresh automatically.
 *   - persistSession: stores the session in localStorage so the user stays
 *     logged in after a page reload or browser close.
 *   - detectSessionInUrl: handles the OAuth redirect callback automatically.
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)

export default supabase
