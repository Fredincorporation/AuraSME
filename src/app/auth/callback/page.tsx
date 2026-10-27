'use client';

import { useEffect } from 'react';
import { getSupabaseBrowser } from '@/lib/supabaseClient';

// Supabase's PKCE/implicit callback. The browser client's detectSessionInUrl consumes
// the tokens from the URL on load; this page just waits for that and returns to the app.
export default function AuthCallbackPage() {
  useEffect(() => {
    const client = getSupabaseBrowser();
    let cancelled = false;
    const done = () => {
      if (!cancelled) window.location.replace('/');
    };
    if (!client) {
      window.location.replace('/');
      return;
    }
    client.auth.getSession().then(done).catch(done);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <p>Completing sign-in…</p>
    </div>
  );
}
