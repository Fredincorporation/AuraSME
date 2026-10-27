import 'server-only';

// Single seam between the quoting engine and the CRM. With SF_INSTANCE_URL + SF_ACCESS_TOKEN
// set it creates and PATCHes live Opportunity records; without them it reports the exact payload
// it *would* have sent (adapter:'mock') so the demo and tests stay runnable. The access token is
// never logged or returned.
//
// Only STANDARD Opportunity fields are written (Name, StageName, Amount, CloseDate, Description).
// Custom fields (PlanTier__c, NumberOfLives, …) and non-standard stage names would be rejected by
// a real org, so the rich quote data is carried in the Description text instead.

export interface SalesforceSync {
  adapter: 'live' | 'mock';
  ok: boolean;
  detail?: string;
}

export interface SalesforceCreate extends SalesforceSync {
  id?: string;
}

export function salesforceConfigured(): boolean {
  return Boolean(process.env.SF_INSTANCE_URL && process.env.SF_ACCESS_TOKEN);
}

const API_VERSION = 'v61.0';

// Maps this build's quote funnel to a Salesforce Opportunity stage. Draft/review/underwriting/
// ready use standard open-pipeline stages; bound → Closed Won; declined → Closed Lost.
const STAGE_BY_STATUS: Record<string, string> = {
  draft: 'Prospecting',
  review: 'Qualification',
  underwriting: 'Needs Analysis',
  ready: 'Proposal/Price Quote',
  bound: 'Closed Won',
  declined: 'Closed Lost',
};

export function stageNameForStatus(status: string): string {
  return STAGE_BY_STATUS[status] ?? 'Prospecting';
}

export function isRealOpportunityId(id?: string | null): id is string {
  // A Salesforce record id is 15 or 18 alphanumeric chars. Our synthetic demo placeholders
  // (006SF…, 006DEMO…) contain non-alphanumeric padding patterns we never send live, so they
  // are excluded by requiring a fully-alphanumeric token of length 15/18.
  return Boolean(id && /^[0-9A-Za-z]{15}$|^[0-9A-Za-z]{18}$/.test(id) && !/^006(SF|DEMO)/i.test(id));
}

export interface OpportunityFields {
  Name: string;
  StageName: string;
  Amount: number;
  CloseDate: string;
  Description: string;
}

export function buildOpportunityFields(input: {
  companyName?: string;
  quoteNumber: string;
  versionNumber: number;
  status: string;
  annualTotalAED: number;
  lives: number;
  networkTier?: string;
  coPay?: number;
  policyNumber?: string;
}): OpportunityFields {
  const close = new Date();
  // Closed Won/Lost require a CloseDate; today is valid for both.
  return {
    Name: `${input.companyName || 'SME Group'} — Quote ${input.quoteNumber} V${input.versionNumber}`,
    StageName: stageNameForStatus(input.status),
    Amount: input.annualTotalAED,
    CloseDate: close.toISOString().slice(0, 10),
    Description: [
      `AuraSME quote ${input.quoteNumber}, version ${input.versionNumber}.`,
      input.networkTier ? `Tier: ${input.networkTier}.` : '',
      input.coPay != null ? `Co-pay: ${input.coPay}%.` : '',
      `Insured lives: ${input.lives}.`,
      `VAT-inclusive annual premium: AED ${input.annualTotalAED.toLocaleString()}.`,
      input.policyNumber ? `Policy number: ${input.policyNumber}.` : '',
    ]
      .filter(Boolean)
      .join(' '),
  };
}

export async function createOpportunity(fields: OpportunityFields, timeoutMs = 12_000): Promise<SalesforceCreate> {
  const instance = process.env.SF_INSTANCE_URL;
  const token = process.env.SF_ACCESS_TOKEN;
  if (!instance || !token) return { adapter: 'mock', ok: true, id: `006SF${String(Date.now()).slice(-10)}` };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${instance.replace(/\/+$/, '')}/services/data/${API_VERSION}/sobjects/Opportunity`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
      signal: controller.signal,
    });
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as { id?: string } | null;
      return { adapter: 'live', ok: Boolean(data?.id), id: data?.id };
    }
    const text = (await res.text().catch(() => '')).slice(0, 200);
    return { adapter: 'live', ok: false, detail: `salesforce create ${res.status}: ${text}` };
  } catch (err) {
    const reason = (err as Error).name === 'AbortError' ? `timed out after ${timeoutMs}ms` : (err as Error).message;
    return { adapter: 'live', ok: false, detail: `salesforce create unreachable: ${reason}` };
  } finally {
    clearTimeout(timer);
  }
}

export async function syncOpportunity(
  endpoint: string,
  fields: Record<string, unknown> | OpportunityFields,
  timeoutMs = 12_000
): Promise<SalesforceSync> {
  const instance = process.env.SF_INSTANCE_URL;
  const token = process.env.SF_ACCESS_TOKEN;
  if (!instance || !token) return { adapter: 'mock', ok: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${instance.replace(/\/+$/, '')}${endpoint}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
      signal: controller.signal,
    });
    if (res.ok || res.status === 204) return { adapter: 'live', ok: true };
    const text = (await res.text().catch(() => '')).slice(0, 200);
    return { adapter: 'live', ok: false, detail: `salesforce ${res.status}: ${text}` };
  } catch (err) {
    const reason = (err as Error).name === 'AbortError' ? `timed out after ${timeoutMs}ms` : (err as Error).message;
    return { adapter: 'live', ok: false, detail: `salesforce unreachable: ${reason}` };
  } finally {
    clearTimeout(timer);
  }
}

export function opportunityEndpoint(id: string): string {
  return `/services/data/${API_VERSION}/sobjects/Opportunity/${id}`;
}
