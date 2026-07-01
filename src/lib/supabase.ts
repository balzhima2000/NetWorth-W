import { createClient } from '@supabase/supabase-js';

// Credentials come from environment variables (see .env.example).
// Create a `.env.local` with your own Supabase project's URL + anon key.
// If they're absent, `supabaseConfigured` is false and all sync/auth calls
// are gated off — the app runs fully as a local-only (localStorage) tracker.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

// When unconfigured we still create a harmless placeholder client so module
// imports don't crash; every call site guards real usage behind `supabaseConfigured`.
export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
);

export type { User, Session } from '@supabase/supabase-js';
