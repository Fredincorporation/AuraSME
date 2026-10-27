'use client';

import { useEffect, useRef } from 'react';
import { useQuoteStore, snapshotOf } from '@/store/useQuoteStore';
import { useAuthStore } from '@/store/useAuthStore';
import { authConfigured } from '@/lib/supabaseClient';
import { apiFetch } from '@/lib/apiClient';

// Durable, per-broker workspace sync. When a broker is signed in to Supabase, the server copy of
// their session is authoritative: this loads it on sign-in (so a cache clear, a new device, or a
// different browser restores their census, config, documents and version history) and then
// mirrors every change back with a debounced write. The browser's sessionStorage store stays a
// fast local cache; without auth configured (the open demo / e2e run) this component does nothing
// and the session remains scoped to the tab.
const SYNC_DEBOUNCE_MS = 900;

export const WorkspaceSync = () => {
  const user = useAuthStore((s) => s.user);
  const serverHydrated = useQuoteStore((s) => s.serverHydrated);
  const signedIn = Boolean(user) && authConfigured();
  const lastSentRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasSignedInRef = useRef(false);

  // 3. On a real signed-in -> signed-out transition, clear the workspace so a shared terminal
  //    does not expose the previous broker's data and the next sign-in re-hydrates fresh.
  useEffect(() => {
    const configured = authConfigured();
    const nowSignedIn = Boolean(user) && configured;
    if (configured && wasSignedInRef.current && !nowSignedIn) {
      if (timerRef.current) clearTimeout(timerRef.current);
      lastSentRef.current = '';
      useQuoteStore.getState().resetWorkspace();
    }
    wasSignedInRef.current = nowSignedIn;
  }, [user]);

  // 1. Load the authoritative server snapshot once per sign-in, before any write is allowed.
  useEffect(() => {
    if (!signedIn) return;
    if (useQuoteStore.getState().serverHydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/session');
        if (!res.ok) return;
        const data = (await res.json()) as { snapshot?: unknown; audit?: unknown };
        if (cancelled) return;
        const { applyServerState } = useQuoteStore.getState();
        if (data.snapshot) {
          applyServerState(data.snapshot as Parameters<typeof applyServerState>[0], (data.audit ?? []) as Parameters<typeof applyServerState>[1]);
        } else {
          // Brand-new broker: nothing on the server yet. Keep the local session and let it sync up.
          const st = useQuoteStore.getState();
          applyServerState(snapshotOf(st), st.auditLog);
        }
      } catch {
        // Offline / transient error: leave the local cache in play rather than wiping the screen.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  // 2. Mirror durable changes back to the server after hydration, debounced and de-duplicated.
  useEffect(() => {
    if (!signedIn || !serverHydrated) return;
    const unsubscribe = useQuoteStore.subscribe((state) => {
      if (!state.serverHydrated) return;
      const payload = JSON.stringify({ snapshot: snapshotOf(state), audit: state.auditLog });
      if (payload === lastSentRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lastSentRef.current = payload;
        const body = JSON.parse(payload) as { snapshot: unknown; audit: unknown };
        apiFetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.syncedAt) useQuoteStore.getState().markSynced(data.syncedAt);
          })
          .catch(() => {
            // A failed write leaves the local cache ahead of the server; the next change retries.
            lastSentRef.current = '';
          });
      }, SYNC_DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [signedIn, serverHydrated]);

  return null;
};
