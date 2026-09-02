import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fails loudly at startup instead of a confusing "network error" the
  // first time something tries to read data — see .env.example.
  throw new Error(
    'Λείπουν οι μεταβλητές VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Δες το .env.example στη ρίζα του project.',
  )
}

export const supabase = createClient(url, anonKey)
