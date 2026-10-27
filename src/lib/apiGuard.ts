import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, persistenceEnabled } from './supabase';

// Supabase auth is browser-local (localStorage session, no server cookie), so the client
// presents its access token as `Authorization: Bearer <jwt>` and every data route re-verifies
// it server-side before touching the engines. Enforcement is config-gated: it turns on once
// the project is configured, and REQUIRE_API_AUTH=0 opts the public demo/e2e back out.

const WINDOW_MS = 60_000;

export function authEnforced(): boolean {
  if (process.env.REQUIRE_API_AUTH === '0') return false;
  // Without Supabase configured there is nothing to verify against — the no-creds demo runs open.
  return persistenceEnabled();
}

function bearer(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}

// In-memory sliding-window limiter. Correct for a single Node process (`next start`);
// on multi-instance/serverless each isolate counts its own traffic, so swap this map for
// a shared store (Redis/Upstash) when you scale out.
const hits = new Map<string, number[]>();
let lastSweep = 0;

function rateCheck(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  if (now - lastSweep > windowMs) {
    const cutoff = now - windowMs;
    for (const [k, times] of hits) {
      const kept = times.filter((t) => t > cutoff);
      if (kept.length === 0) hits.delete(k);
      else hits.set(k, kept);
    }
    lastSweep = now;
  }
  const cutoff = now - windowMs;
  const times = (hits.get(key) ?? []).filter((t) => t > cutoff);
  if (times.length >= limit) {
    hits.set(key, times);
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((times[0] + windowMs - now) / 1000)) };
  }
  times.push(now);
  hits.set(key, times);
  return { ok: true, remaining: limit - times.length, retryAfterSec: 0 };
}

export interface GuardResult {
  userId: string;
  denied: NextResponse | null;
}

// Verifies the caller (401 when a configured deployment is missing/holding a bad token),
// then applies a per-caller, per-route rate limit (429). Returns the resolved identity so
// handlers can attribute writes.
export async function guard(
  request: NextRequest,
  opts: { limit: number; windowMs?: number }
): Promise<GuardResult> {
  let userId = 'anonymous';

  if (authEnforced()) {
    const token = bearer(request);
    if (!token) {
      return {
        userId,
        denied: NextResponse.json(
          { error: 'Missing bearer token. Sign in to use the quote API.' },
          { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
        ),
      };
    }
    const admin = getSupabaseAdmin();
    const { data, error } = admin ? await admin.auth.getUser(token) : { data: null, error: new Error('auth unconfigured') };
    if (error || !data?.user) {
      return {
        userId,
        denied: NextResponse.json(
          { error: 'Invalid or expired session.' },
          { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
        ),
      };
    }
    userId = data.user.id;
  }

  const window = opts.windowMs ?? WINDOW_MS;
  const key = `${request.nextUrl.pathname}|${userId !== 'anonymous' ? userId : clientIp(request)}`;
  const rate = rateCheck(key, opts.limit, window);
  if (!rate.ok) {
    return {
      userId,
      denied: NextResponse.json(
        { error: 'Too many requests. Slow down and try again.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec), 'X-RateLimit-Remaining': '0' } }
      ),
    };
  }

  return { userId, denied: null };
}
