import { useAuthStore } from '@/store/useAuthStore';

// All browser calls to the protected /api surface go through here so the Supabase access
// token rides along as a bearer credential and the server can re-verify it. In the no-creds
// demo there is no token and enforcement is off, so a plain request still succeeds.
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().session?.access_token;
  const headers = new Headers(init.headers);
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
