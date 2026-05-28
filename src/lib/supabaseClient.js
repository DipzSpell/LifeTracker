/**
 * supabaseClient.js — Canonical Supabase client
 *
 * Credentials go in .env at project root:
 *   VITE_SUPABASE_URL=https://<project-id>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<your-anon-key>
 *
 * IMPORTANT — HashRouter + OAuth:
 *   Supabase's detectSessionInUrl looks for the `#access_token` fragment
 *   that Google redirects back to your app with. With HashRouter, the
 *   URL looks like:  http://localhost:5173/#access_token=...
 *   The Supabase client parses this automatically ONLY when
 *   detectSessionInUrl is true (which is the default). No extra work needed.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id')) {
  console.error(
    '[Supabase] ⚠️  Missing credentials!\n' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.\n' +
    'Get them from: Supabase Dashboard → Settings → API'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      /**
       * autoRefreshToken — automatically refreshes the JWT before it expires.
       * persistSession  — stores session in localStorage so user stays logged in.
       * detectSessionInUrl — parses the OAuth redirect token from the URL hash.
       *   This is essential for Google OAuth to work with HashRouter.
       */
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // flowType: 'implicit' is the default and works with the Supabase
      // redirect that Google sends back. Keep it as-is.
      flowType: 'implicit',
    },
  }
)

export default supabase
