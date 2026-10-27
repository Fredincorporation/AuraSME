'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

// Kicks off Supabase session restore + auth-state subscription once on mount.
// Supabase persists the session in localStorage, so this survives refreshes without
// any server cookie or middleware.
export const AuthBootstrap = () => {
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);

  return null;
};
