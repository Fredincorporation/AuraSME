import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Browser-side Supabase client. Auth sessions persist to localStorage under the
// Supabase-managed key, so a refresh restores the signed-in user without any server
// cookie or middleware. Returns null when the project isn't configured so callers can
// degrade to an honest "not configured" state instead of crashing.
let cached: SupabaseClient | null | undefined;

export function authConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseBrowser(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (typeof window === 'undefined' || !url || !anon) {
    cached = null;
    return cached;
  }
  cached = createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return cached;
}
