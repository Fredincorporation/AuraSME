import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/apiGuard';
import { syncOpportunity, buildOpportunityFields, opportunityEndpoint, isRealOpportunityId } from '@/lib/salesforce';
import { createCollectionIntent } from '@/lib/payments';
import { issuePolicy } from '@/lib/integrations/policyAdmin';
import { setQuoteStatus } from '@/lib/quotesStore';
import type { QuoteStatus } from '@/types/quote';

// Advances a persisted quote's funnel stage (used for issuance → 'bound'). On binding it PATCHes
// the real Salesforce Opportunity to Closed Won, raises a payment collection intent and issues the
// policy to the administration system — each live only when its credentials are configured.
export async function POST(request: NextRequest) {
  const { denied } = await guard(request, { limit: 60 });
  if (denied) return denied;

  const body = (await request.json()) as {
    quoteNumber?: string;
    status?: QuoteStatus;
    policyNumber?: string;
    salesforceOppId?: string;
    annualTotalAED?: number;
    versionNumber?: number;
    lives?: number;
  };
  const { quoteNumber, status, policyNumber } = body;
  if (!quoteNumber || !status) {
    return NextResponse.json({ error: 'Body requires { quoteNumber, status }' }, { status: 400 });
  }

  const result = await setQuoteStatus(quoteNumber, status, policyNumber);

  let salesforceAdapter: 'live' | 'mock' = 'mock';
  let salesforceOk = true;
  let salesforceDetail: string | undefined;
  // Only PATCH a genuine Salesforce id — a synthetic demo id would 404 against a real org.
  if (isRealOpportunityId(body.salesforceOppId)) {
    const fields = buildOpportunityFields({
      quoteNumber,
      versionNumber: body.versionNumber ?? 1,
      status,
      annualTotalAED: body.annualTotalAED ?? 0,
      lives: body.lives ?? 0,
      policyNumber,
    });
    const sync = await syncOpportunity(opportunityEndpoint(body.salesforceOppId), fields);
    salesforceAdapter = sync.adapter;
    salesforceOk = sync.ok;
    salesforceDetail = sync.detail;
  }

  let payment: { adapter: 'live' | 'mock'; ok: boolean; reference?: string } | undefined;
  let policyAdmin: { adapter: 'live' | 'mock'; ok: boolean; detail?: string } | undefined;
  if (status === 'bound') {
    const intent = await createCollectionIntent({
      quoteNumber,
      policyNumber,
      amountAED: body.annualTotalAED ?? 0,
      lives: body.lives ?? 0,
    });
    payment = { adapter: intent.adapter, ok: intent.ok, reference: intent.reference };

    if (policyNumber) {
      const issued = await issuePolicy({
        quoteNumber,
        policyNumber,
        status: 'bound',
        lives: body.lives ?? 0,
        annualTotalAED: body.annualTotalAED ?? 0,
      });
      policyAdmin = { adapter: issued.adapter, ok: issued.ok, detail: issued.detail };
    }
  }

  return NextResponse.json({ quoteNumber, status, policyNumber, persisted: result.persisted, salesforceAdapter, salesforceOk, salesforceDetail, payment, policyAdmin });
}
