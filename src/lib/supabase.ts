import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Supabase client. Only available when env vars are set (e.g. in production or after copying .env.example to .env). */
export const supabase =
  url && anonKey
    ? createClient(url, anonKey)
    : null
