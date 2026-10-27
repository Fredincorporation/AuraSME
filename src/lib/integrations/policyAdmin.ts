import 'server-only';
import type { IntegrationContract, IntegrationResult } from './types';

// Outbound contract to a policy administration system. On binding, the issued policy record is
// POSTed to the administration platform so it becomes the book-of-record. With POLICY_ADMIN_URL +
// POLICY_ADMIN_TOKEN set it calls the live system; without them it reports the bind-ready payload
// (adapter:'mock').

export function policyAdminConfigured(): boolean {
  return Boolean(process.env.POLICY_ADMIN_URL && process.env.POLICY_ADMIN_TOKEN);
}

export interface PolicyIssue {
  quoteNumber: string;
  policyNumber: string;
  status: 'bound';
  lives: number;
  annualTotalAED: number;
}

export async function issuePolicy(payload: PolicyIssue, timeoutMs = 10_000): Promise<IntegrationResult> {
  const url = process.env.POLICY_ADMIN_URL;
  const token = process.env.POLICY_ADMIN_TOKEN;
  if (!url || !token) return { adapter: 'mock', ok: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/policies`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (res.ok) return { adapter: 'live', ok: true };
    const text = (await res.text().catch(() => '')).slice(0, 200);
    return { adapter: 'live', ok: false, detail: `policy admin ${res.status}: ${text}` };
  } catch (err) {
    const reason = (err as Error).name === 'AbortError' ? `timed out after ${timeoutMs}ms` : (err as Error).message;
    return { adapter: 'live', ok: false, detail: `policy admin unreachable: ${reason}` };
  } finally {
    clearTimeout(timer);
  }
}

export function policyAdminContract(): IntegrationContract {
  return {
    id: 'policy-admin',
    direction: 'outbound',
    label: 'Policy Administration System',
    method: 'POST',
    endpoint: '/policies',
    auth: 'Bearer (POLICY_ADMIN_TOKEN)',
    envVars: ['POLICY_ADMIN_URL', 'POLICY_ADMIN_TOKEN'],
    configured: policyAdminConfigured(),
    fields: [
      { name: 'quoteNumber', type: 'string', note: 'Stable quote ledger reference' },
      { name: 'policyNumber', type: 'string', note: 'Issued policy number' },
      { name: 'status', type: "'bound'", note: 'Administration record state' },
      { name: 'lives', type: 'number', note: 'Insured lives on the policy' },
      { name: 'annualTotalAED', type: 'number', note: 'VAT-inclusive annual premium' },
    ],
  };
}
