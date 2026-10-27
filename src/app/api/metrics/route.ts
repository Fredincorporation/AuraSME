import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/apiGuard';
import { listQuotes, computeFunnel, quotesBackend } from '@/lib/quotesStore';

// Reads the real persisted quote ledger (Supabase when configured, otherwise the in-process
// ledger this session built) and returns the funnel + conversion the dashboard displays.
export async function GET(request: NextRequest) {
  const { denied } = await guard(request, { limit: 120 });
  if (denied) return denied;

  const quotes = await listQuotes();
  const metrics = computeFunnel(quotes);
  return NextResponse.json({
    ...metrics,
    backend: quotesBackend(),
    generatedAt: new Date().toISOString(),
  });
}
