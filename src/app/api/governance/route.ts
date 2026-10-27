import { NextResponse, connection } from 'next/server';
import { buildGovernanceReport } from '@/lib/dataGovernance';

// Reads runtime environment (Groq key, Supabase, Salesforce), so it must not be baked at build.
// connection() opts the handler into per-request execution under cacheComponents.
export async function GET() {
  await connection();
  return NextResponse.json(buildGovernanceReport());
}
