import 'server-only';
import type { IntegrationContract, IntegrationResult } from './types';

// Outbound contract to an underwriting/rating platform. This build already prices in-process;
// when RATING_PLATFORM_URL + RATING_PLATFORM_TOKEN are set the same rating request is POSTed to
// the external engine so a carrier can re-rate authoritatively. Without them the adapter reports
// the request it would have sent (adapter:'mock').

export function ratingPlatformConfigured(): boolean {
  return Boolean(process.env.RATING_PLATFORM_URL && process.env.RATING_PLATFORM_TOKEN);
}

export interface RatingRequest {
  quoteNumber: string;
  lives: number;
  networkTier: string;
  coPay: number;
  pharmacyLimit: number;
  annualTotalAED: number;
}

export async function submitRatingRequest(req: RatingRequest, timeoutMs = 10_000): Promise<IntegrationResult> {
  const url = process.env.RATING_PLATFORM_URL;
  const token = process.env.RATING_PLATFORM_TOKEN;
  if (!url || !token) return { adapter: 'mock', ok: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/rating-requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    if (res.ok) return { adapter: 'live', ok: true };
    const text = (await res.text().catch(() => '')).slice(0, 200);
    return { adapter: 'live', ok: false, detail: `rating platform ${res.status}: ${text}` };
  } catch (err) {
    const reason = (err as Error).name === 'AbortError' ? `timed out after ${timeoutMs}ms` : (err as Error).message;
    return { adapter: 'live', ok: false, detail: `rating platform unreachable: ${reason}` };
  } finally {
    clearTimeout(timer);
  }
}

export function ratingPlatformContract(): IntegrationContract {
  return {
    id: 'rating-platform',
    direction: 'outbound',
    label: 'Underwriting / Rating Platform',
    method: 'POST',
    endpoint: '/rating-requests',
    auth: 'Bearer (RATING_PLATFORM_TOKEN)',
    envVars: ['RATING_PLATFORM_URL', 'RATING_PLATFORM_TOKEN'],
    configured: ratingPlatformConfigured(),
    fields: [
      { name: 'quoteNumber', type: 'string', note: 'Stable quote ledger reference' },
      { name: 'lives', type: 'number', note: 'Rated lives in the snapshot' },
      { name: 'networkTier', type: 'string', note: 'Essential | Comprehensive | Premier Global' },
      { name: 'coPay', type: 'number', note: 'Outpatient co-pay percentage' },
      { name: 'pharmacyLimit', type: 'number', note: 'Annual pharmacy benefit limit (AED)' },
      { name: 'annualTotalAED', type: 'number', note: 'VAT-inclusive annual total' },
    ],
  };
}
