import { NextRequest, NextResponse } from 'next/server';
import { persistenceEnabled } from '@/lib/supabase';
import { guard } from '@/lib/apiGuard';
import { syncOpportunity, createOpportunity, buildOpportunityFields, opportunityEndpoint, isRealOpportunityId } from '@/lib/salesforce';
import { submitRatingRequest } from '@/lib/integrations/ratingPlatform';
import { upsertQuote, listQuotes, quoteNumberFor, quotesBackend, getSalesforceOppId } from '@/lib/quotesStore';
import type { QuoteStatus, QuoteVersion, SMECompanyDetails } from '@/types/quote';

export async function GET(request: NextRequest) {
  const { denied } = await guard(request, { limit: 120 });
  if (denied) return denied;
  const quotes = await listQuotes();
  return NextResponse.json({
    persistence: persistenceEnabled() ? quotesBackend() : 'in-memory',
    count: quotes.length,
    quotes,
  });
}

export async function POST(request: NextRequest) {
  const { denied } = await guard(request, { limit: 60 });
  if (denied) return denied;

  const body = (await request.json()) as {
    version?: QuoteVersion;
    company?: Partial<SMECompanyDetails>;
    status?: QuoteStatus;
    quoteNumber?: string;
    ratedLives?: number;
  };
  const version = body.version;
  if (!version) {
    return NextResponse.json({ error: 'Body requires { version: QuoteVersion }' }, { status: 400 });
  }

  const company = body.company ?? {};
  const quoteNumber = body.quoteNumber ?? quoteNumberFor(company);
  const status: QuoteStatus = body.status ?? 'ready';

  const fields = buildOpportunityFields({
    companyName: company.companyName,
    quoteNumber,
    versionNumber: version.versionNumber,
    status,
    annualTotalAED: version.annualTotalAED,
    lives: version.totalLives,
    networkTier: version.config.networkTier,
    coPay: version.config.coPay,
  });

  // CRM seam with a real record: reuse the Opportunity already attached to this quote (update),
  // otherwise create one in Salesforce. The real returned id is persisted and flows to bind.
  const existingOppId = await getSalesforceOppId(quoteNumber);
  let oppId: string | null = existingOppId;
  let salesforceMode: 'create' | 'update' | 'mock' = 'mock';
  let sfAdapter: 'live' | 'mock' = 'mock';
  let sfOk = true;
  let sfDetail: string | undefined;

  if (existingOppId) {
    const sync = await syncOpportunity(opportunityEndpoint(existingOppId), fields);
    salesforceMode = 'update';
    sfAdapter = sync.adapter;
    sfOk = sync.ok;
    sfDetail = sync.detail;
  } else {
    const created = await createOpportunity(fields);
    sfAdapter = created.adapter;
    sfOk = created.ok;
    sfDetail = created.detail;
    if (created.adapter === 'mock') {
      salesforceMode = 'mock';
      oppId = created.id ?? null;
    } else if (created.ok && isRealOpportunityId(created.id)) {
      salesforceMode = 'create';
      oppId = created.id;
    }
  }

  const result = await upsertQuote({
    quoteNumber,
    status,
    company: company.companyName ?? '',
    tradeLicense: company.tradeLicense ?? '',
    emirate: company.emirate ?? 'Dubai',
    zoneType: company.zoneType ?? 'Freezone',
    industry: company.industry ?? '',
    lives: version.totalLives,
    annualTotalAED: version.annualTotalAED,
    activeVersionNumber: version.versionNumber,
    salesforceOppId: oppId ?? undefined,
    version,
  });

  // Rating platform seam: when an external underwriting engine is configured, the same rating
  // inputs are POSTed for authoritative re-rating; otherwise the adapter reports the contract.
  const rating = await submitRatingRequest({
    quoteNumber,
    lives: version.totalLives,
    networkTier: version.config.networkTier,
    coPay: version.config.coPay,
    pharmacyLimit: version.config.pharmacyLimit,
    annualTotalAED: version.annualTotalAED,
  });

  return NextResponse.json({
    quoteNumber,
    status,
    saved: result.persisted === 'supabase',
    persistence: persistenceEnabled() ? result.persisted : 'in-memory',
    backend: quotesBackend(),
    salesforceAdapter: sfAdapter,
    salesforceOk: sfOk,
    salesforceMode,
    salesforceOppId: oppId,
    salesforceDetail: sfDetail,
    salesforceFields: fields,
    ratingPlatformAdapter: rating.adapter,
    ratingPlatformOk: rating.ok,
  });
}
