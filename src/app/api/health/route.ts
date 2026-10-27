import { NextResponse } from 'next/server';
import { getSupabaseAdmin, persistenceEnabled } from '@/lib/supabase';
import { authEnforced } from '@/lib/apiGuard';
import { salesforceConfigured } from '@/lib/salesforce';
import { paymentConfigured } from '@/lib/payments';
import { ratingPlatformConfigured } from '@/lib/integrations/ratingPlatform';
import { policyAdminConfigured } from '@/lib/integrations/policyAdmin';

// Probe the exact columns /api/quotes writes, not just `id` — a partially applied
// schema otherwise reports "supabase" while every snapshot insert fails.
const WRITTEN_COLUMNS =
  'version_number,version_code,network_tier,copay_percentage,pharmacy_limit,include_dental,include_optical,include_maternity,wellness_rider,total_lives,principal_count,dependant_count,annual_premium_aed,monthly_per_life_aed,notes,created_by';

async function probePersistence(): Promise<'supabase' | 'supabase-schema-missing' | 'in-memory'> {
  if (!persistenceEnabled()) return 'in-memory';
  const client = getSupabaseAdmin();
  if (!client) return 'in-memory';
  const { error } = await client.from('quote_versions').select(WRITTEN_COLUMNS).limit(1);
  return error ? 'supabase-schema-missing' : 'supabase';
}

// The durable per-broker workspace needs the v2 tables (workspaces + audit_events). Probe them
// so a half-applied schema reports degraded rather than claiming durable sessions that fail.
async function probeWorkspace(): Promise<'supabase' | 'supabase-schema-missing' | 'in-memory'> {
  if (!persistenceEnabled()) return 'in-memory';
  const client = getSupabaseAdmin();
  if (!client) return 'in-memory';
  const { error } = await client.from('workspaces').select('user_id,quote_number,state,updated_at').limit(1);
  return error ? 'supabase-schema-missing' : 'supabase';
}

export async function GET() {
  const persistence = await probePersistence();
  const workspacePersistence = await probeWorkspace();
  return NextResponse.json({
    service: 'AuraSME Quote Engine',
    status: persistence === 'supabase-schema-missing' || workspacePersistence === 'supabase-schema-missing' ? 'degraded' : 'ok',
    version: '0.1.0',
    persistence,
    workspacePersistence,
    apiAuth: authEnforced() ? 'enforced' : 'disabled',
    rateLimit: 'in-memory',
    salesforceAdapter: salesforceConfigured() ? 'live' : 'mock-payload-only',
    paymentAdapter: paymentConfigured() ? 'live' : 'mock-payload-only',
    ratingPlatformAdapter: ratingPlatformConfigured() ? 'live' : 'mock-payload-only',
    policyAdminAdapter: policyAdminConfigured() ? 'live' : 'mock-payload-only',
    aiProvider: process.env.GROQ_API_KEY ? 'groq-llama-3.3-70b' : 'deterministic-rule-engine',
    notes:
      persistence === 'supabase-schema-missing'
        ? 'Supabase credentials are set but supabase_schema.sql has not been applied — quote versions persist in process memory only.'
        : workspacePersistence === 'supabase-schema-missing'
          ? 'Quote ledger is healthy, but supabase_schema_v2.sql (workspaces/audit_events) is not applied — broker sessions stay tab-scoped instead of durable.'
          : undefined,
    endpoints: [
      'POST /api/census/parse',
      'POST /api/rating',
      'POST /api/budget',
      'POST /api/quotes',
      'GET  /api/quotes',
      'POST /api/quotes/status',
      'GET  /api/metrics',
      'GET  /api/session',
      'POST /api/session',
      'POST /api/documents',
      'GET  /api/governance',
      'GET  /api/integrations/contracts',
      'POST /api/copilot',
      'GET  /api/openapi.json',
    ],
  });
}
