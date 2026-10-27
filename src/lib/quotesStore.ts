import 'server-only';
import { createHash } from 'node:crypto';
import { getSupabaseAdmin, persistenceEnabled } from './supabase';
import { isRealOpportunityId } from './salesforce';
import type { FunnelMetrics, QuoteRecord, QuoteStatus, QuoteVersion } from '@/types/quote';

// Server-side quote ledger. Persists to Supabase `quotes` when configured, otherwise keeps
// an in-process ledger so the public demo and the e2e run still produce a real funnel from
// real engine output — never synthetic numbers.

interface UpsertInput {
  quoteNumber: string;
  status: QuoteStatus;
  company: string;
  tradeLicense: string;
  emirate: string;
  zoneType: string;
  industry: string;
  lives: number;
  annualTotalAED: number;
  activeVersionNumber: number;
  salesforceOppId?: string;
  policyNumber?: string;
  version?: QuoteVersion;
}

// Deterministic, stable-per-company quote number so repeated snapshots evolve one quote rather
// than creating a new row each time. trade_license is only UNIQUE at the company level, so the
// quote number carries a year prefix and is upserted on conflict here.
const memoryLedger = new Map<string, QuoteRecord>();

export function computeStatus(v: {
  ratedLives: number;
  complianceOk: boolean;
  hasVersion: boolean;
}): QuoteStatus {
  if (v.ratedLives === 0) return 'underwriting';
  if (!v.complianceOk) return 'review';
  return v.hasVersion ? 'ready' : 'draft';
}

function toRecord(row: Record<string, unknown>): QuoteRecord {
  return {
    quoteNumber: String(row.quote_number ?? ''),
    status: (String(row.current_status ?? 'draft') as QuoteStatus),
    company: String((row.sme_companies as Record<string, unknown>)?.company_name ?? row.company_name ?? ''),
    tradeLicense: String((row.sme_companies as Record<string, unknown>)?.trade_license ?? row.trade_license ?? ''),
    lives: Number(row.total_lives ?? 0),
    annualTotalAED: Number(row.latest_annual_premium_aed ?? 0),
    activeVersionNumber: Number(row.active_version_number ?? 1),
    salesforceOppId: row.salesforce_opportunity_id ? String(row.salesforce_opportunity_id) : undefined,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export async function upsertQuote(input: UpsertInput): Promise<{ quoteNumber: string; persisted: 'supabase' | 'memory' }> {
  const now = new Date().toISOString();
  const existing = memoryLedger.get(input.quoteNumber);
  memoryLedger.set(input.quoteNumber, {
    quoteNumber: input.quoteNumber,
    status: input.status,
    company: input.company,
    tradeLicense: input.tradeLicense,
    lives: input.lives,
    annualTotalAED: input.annualTotalAED,
    activeVersionNumber: input.activeVersionNumber,
    salesforceOppId: input.salesforceOppId ?? existing?.salesforceOppId,
    policyNumber: input.policyNumber ?? existing?.policyNumber,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  const client = getSupabaseAdmin();
  if (!client) return { quoteNumber: input.quoteNumber, persisted: 'memory' };

  // 1. Upsert the company by trade license (when one is declared) to obtain the FK.
  let companyId: string | null = null;
  if (input.tradeLicense) {
    const { data } = await client
      .from('sme_companies')
      .upsert(
        {
          company_name: input.company || 'Unnamed SME',
          trade_license: input.tradeLicense,
          jurisdiction: input.emirate,
          zone_type: input.zoneType,
          industry: input.industry,
        },
        { onConflict: 'trade_license' }
      )
      .select('id')
      .maybeSingle();
    companyId = data?.id ?? null;
  }

  // 2. Upsert the quote row (funnel state).
  const quoteRow = {
    quote_number: input.quoteNumber,
    company_id: companyId,
    active_version_number: input.activeVersionNumber,
    current_status: input.status,
    salesforce_opportunity_id: input.salesforceOppId ?? null,
    salesforce_sync_status: input.salesforceOppId ? 'synced' : 'pending',
    updated_at: now,
  };
  const { data: quote } = await client
    .from('quotes')
    .upsert(quoteRow, { onConflict: 'quote_number' })
    .select('id')
    .maybeSingle();
  const quoteId: string | null = quote?.id ?? null;

  // 3. Write the version snapshot linked to the quote.
  if (input.version) {
    const v = input.version;
    await client.from('quote_versions').insert({
      quote_id: quoteId,
      version_number: v.versionNumber,
      version_code: v.versionId,
      network_tier: v.config.networkTier,
      copay_percentage: v.config.coPay,
      pharmacy_limit: v.config.pharmacyLimit,
      include_dental: v.config.includeDental,
      include_optical: v.config.includeOptical,
      include_maternity: v.config.includeMaternity,
      wellness_rider: v.config.wellnessRider,
      annual_premium_aed: v.annualTotalAED,
      monthly_per_life_aed: v.monthlyPerEmployeeAED,
      total_lives: v.totalLives,
      principal_count: v.principalCount,
      dependant_count: v.dependantCount,
      notes: v.notes,
      created_by: v.updatedBy,
    });
  }

  return { quoteNumber: input.quoteNumber, persisted: 'supabase' };
}

export async function setQuoteStatus(
  quoteNumber: string,
  status: QuoteStatus,
  policyNumber?: string
): Promise<{ persisted: 'supabase' | 'memory' }> {
  const now = new Date().toISOString();
  const existing = memoryLedger.get(quoteNumber);
  if (existing) memoryLedger.set(quoteNumber, { ...existing, status, policyNumber: policyNumber ?? existing.policyNumber, updatedAt: now });

  const client = getSupabaseAdmin();
  if (!client) return { persisted: 'memory' };
  await client
    .from('quotes')
    .update({ current_status: status, updated_at: now })
    .eq('quote_number', quoteNumber);
  return { persisted: 'supabase' };
}

export async function listQuotes(limit = 100): Promise<QuoteRecord[]> {
  const client = getSupabaseAdmin();
  if (!client) return [...memoryLedger.values()];

  const { data, error } = await client
    .from('quotes')
    .select(
      'quote_number,current_status,active_version_number,salesforce_opportunity_id,created_at,updated_at,sme_companies(company_name,trade_license)'
    )
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) return [...memoryLedger.values()];

  const rows = (data ?? []) as Record<string, unknown>[];
  // The embedded company carries the natural key; the per-quote premium lives in the latest
  // version, so resolve the most recent premium for each quote shown.
  const records = rows.map(toRecord);
  const numbers = records.map((r) => r.quoteNumber).filter(Boolean);
  if (numbers.length) {
    const { data: versions } = await client
      .from('quote_versions')
      .select('version_number,annual_premium_aed,total_lives,quotes(quote_number)')
      .in('quote_id', (await idsFor(client, numbers)))
      .order('version_number', { ascending: false });
    const latest = new Map<string, { total_lives: number; annual_premium_aed: number }>();
    for (const v of (versions ?? []) as Record<string, unknown>[]) {
      const qn = String((v.quotes as Record<string, unknown>)?.quote_number ?? '');
      if (qn && !latest.has(qn)) latest.set(qn, { total_lives: Number(v.total_lives ?? 0), annual_premium_aed: Number(v.annual_premium_aed ?? 0) });
    }
    for (const r of records) {
      const l = latest.get(r.quoteNumber);
      if (l) {
        r.lives = l.total_lives;
        r.annualTotalAED = l.annual_premium_aed;
      }
    }
  }
  return records;
}

async function idsFor(client: ReturnType<typeof getSupabaseAdmin> & object, quoteNumbers: string[]): Promise<string[]> {
  const { data } = await client.from('quotes').select('id,quote_number').in('quote_number', quoteNumbers);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => String(r.id)).filter(Boolean);
}

export function quotesBackend(): 'supabase' | 'memory' {
  return persistenceEnabled() && getSupabaseAdmin() ? 'supabase' : 'memory';
}

// The real Salesforce Opportunity id already attached to this quote, if any. Used so a
// re-snapshot of the same company updates one CRM record rather than creating a duplicate.
export async function getSalesforceOppId(quoteNumber: string): Promise<string | null> {
  const memory = memoryLedger.get(quoteNumber)?.salesforceOppId;
  if (isRealOpportunityId(memory)) return memory;

  const client = getSupabaseAdmin();
  if (!client) return null;
  const { data } = await client.from('quotes').select('salesforce_opportunity_id').eq('quote_number', quoteNumber).maybeSingle();
  const id = data?.salesforce_opportunity_id ? String(data.salesforce_opportunity_id) : null;
  return isRealOpportunityId(id) ? id : null;
}

export function quoteNumberFor(company: { tradeLicense?: string; emirate?: string }): string {
  const license = (company.tradeLicense || '').trim();
  const year = new Date().getFullYear();
  if (license) return `CIG-UAE-${year}-${license.replace(/\s+/g, '').slice(-8).toUpperCase()}`;
  return `CIG-UAE-${year}-${createHash('sha1').update((company.emirate || 'UAE') + year).digest('hex').slice(0, 8).toUpperCase()}`;
}

export function computeFunnel(quotes: QuoteRecord[]): FunnelMetrics {
  const stages: Record<QuoteStatus, number> = { draft: 0, review: 0, ready: 0, underwriting: 0, bound: 0, declined: 0 };
  for (const q of quotes) stages[q.status] = (stages[q.status] ?? 0) + 1;

  const priced = stages.review + stages.ready + stages.bound;
  const conversionRate = priced > 0 ? stages.bound / priced : null;

  const durations = quotes
    .filter((q) => q.status === 'bound' && q.createdAt && q.updatedAt)
    .map((q) => (new Date(q.updatedAt).getTime() - new Date(q.createdAt).getTime()) / 1000)
    .filter((s) => s >= 0)
    .sort((a, b) => a - b);
  const turnaroundMedianSec = durations.length
    ? Math.round(durations[Math.floor(durations.length / 2)] * 10) / 10
    : null;

  return { backend: 'memory', observed: quotes.length, stages, conversionRate, turnaroundMedianSec };
}

