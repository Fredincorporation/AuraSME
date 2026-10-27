import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/apiGuard';
import { salesforceConfigured } from '@/lib/salesforce';
import { paymentConfigured } from '@/lib/payments';
import { ratingPlatformContract } from '@/lib/integrations/ratingPlatform';
import { policyAdminContract } from '@/lib/integrations/policyAdmin';
import type { IntegrationContract } from '@/lib/integrations/types';

function salesforceContract(): IntegrationContract {
  return {
    id: 'salesforce',
    direction: 'outbound',
    label: 'CRM — Salesforce Opportunity',
    method: 'POST + PATCH',
    endpoint: '/services/data/v61.0/sobjects/Opportunity[/{id}]',
    auth: 'Bearer (SF_ACCESS_TOKEN)',
    envVars: ['SF_INSTANCE_URL', 'SF_ACCESS_TOKEN'],
    configured: salesforceConfigured(),
    fields: [
      { name: 'Name', type: 'string', note: 'Company — Quote {quoteNumber} V{n}' },
      { name: 'StageName', type: 'string', note: 'Standard stage mapped from funnel status (Closed Won on bind)' },
      { name: 'Amount', type: 'number', note: 'VAT-inclusive annual premium (AED)' },
      { name: 'CloseDate', type: 'string (YYYY-MM-DD)', note: 'Required by Salesforce; set to today' },
      { name: 'Description', type: 'string', note: 'Tier, co-pay, lives, policy number carried as text' },
    ],
  };
}

function paymentContract(): IntegrationContract {
  return {
    id: 'payment-gateway',
    direction: 'outbound',
    label: 'Payment Collection Gateway',
    method: 'POST',
    endpoint: '/collection-intents',
    auth: 'Bearer (PAYMENT_API_KEY)',
    envVars: ['PAYMENT_GATEWAY_URL', 'PAYMENT_API_KEY'],
    configured: paymentConfigured(),
    fields: [
      { name: 'external_ref', type: 'string', note: 'PAY-{quoteNumber}' },
      { name: 'policy_number', type: 'string', note: 'Issued policy on bind' },
      { name: 'amount_aed', type: 'number', note: 'Collection amount (AED)' },
      { name: 'lives', type: 'number', note: 'Insured lives' },
      { name: 'currency', type: "'AED'", note: 'Settlement currency' },
    ],
  };
}

// Contract-first view of every outbound integration seam. Reports the exact request shape and
// whether credentials are present (configured), never the secrets themselves, so an integrator
// can see what this build calls out to and confirm each seam is wired.
export async function GET(request: NextRequest) {
  const { denied } = await guard(request, { limit: 120 });
  if (denied) return denied;

  return NextResponse.json({
    integrations: [
      salesforceContract(),
      paymentContract(),
      ratingPlatformContract(),
      policyAdminContract(),
    ],
  });
}
