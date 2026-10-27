import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { authConfigured, getSupabaseBrowser } from '@/lib/supabaseClient';

export type AuthStatus = 'idle' | 'loading' | 'signed-in' | 'signed-out' | 'unconfigured';

interface AuthResult {
  ok: boolean;
  // 'confirm-email' when sign-up succeeded but a session isn't issued until the
  // address is verified; 'check-inbox' for a magic link that was queued.
  notice?: 'confirm-email' | 'check-inbox';
  error?: string;
}

interface AuthStore {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  configured: boolean;
  initialized: boolean;
  init: () => void;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResult>;
  signInWithOtp: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: 'idle',
  user: null,
  session: null,
  configured: authConfigured(),
  initialized: false,

  init: () => {
    if (get().initialized) return;
    const client = getSupabaseBrowser();
    if (!client) {
      set({ status: 'unconfigured', configured: false, initialized: true });
      return;
    }
    set({ initialized: true, status: 'loading' });

    client.auth.getSession().then(({ data }) => {
      set({
        session: data.session ?? null,
        user: data.session?.user ?? null,
        status: data.session ? 'signed-in' : 'signed-out',
      });
    });

    client.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        status: session ? 'signed-in' : 'signed-out',
      });
    });
  },

  signInWithPassword: async (email, password) => {
    const client = getSupabaseBrowser();
    if (!client) return { ok: false, error: 'unconfigured' };
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    set({ session: data.session, user: data.session?.user ?? null, status: 'signed-in' });
    return { ok: true };
  },

  signUp: async (email, password, fullName) => {
    const client = getSupabaseBrowser();
    if (!client) return { ok: false, error: 'unconfigured' };
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return { ok: false, error: error.message };
    // A session is returned only when email confirmation is disabled on the project.
    if (data.session) {
      set({ session: data.session, user: data.session.user, status: 'signed-in' });
      return { ok: true };
    }
    return { ok: true, notice: 'confirm-email' };
  },

  signInWithOtp: async (email) => {
    const client = getSupabaseBrowser();
    if (!client) return { ok: false, error: 'unconfigured' };
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, notice: 'check-inbox' };
  },

  signOut: async () => {
    const client = getSupabaseBrowser();
    await client?.auth.signOut();
    set({ session: null, user: null, status: client ? 'signed-out' : 'unconfigured' });
  },
}));
