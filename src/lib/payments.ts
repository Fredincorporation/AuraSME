import 'server-only';

// Env-gated payment collection seam, same contract-first pattern as the Salesforce adapter. With
// PAYMENT_GATEWAY_URL + PAYMENT_API_KEY set it POSTs a collection intent to the live gateway;
// without them it reports the exact payload it *would* have sent (adapter:'mock') so the demo and
// tests keep running. The API key is never logged or returned.

export interface PaymentResult {
  adapter: 'live' | 'mock';
  ok: boolean;
  reference?: string;
  detail?: string;
}

export function paymentConfigured(): boolean {
  return Boolean(process.env.PAYMENT_GATEWAY_URL && process.env.PAYMENT_API_KEY);
}

export async function createCollectionIntent(
  input: { quoteNumber: string; policyNumber?: string; amountAED: number; lives: number },
  timeoutMs = 10_000
): Promise<PaymentResult> {
  const reference = `PAY-${input.quoteNumber}`;
  const base = { adapter: 'live' as const };
  const url = process.env.PAYMENT_GATEWAY_URL;
  const key = process.env.PAYMENT_API_KEY;
  if (!url || !key) return { adapter: 'mock', ok: true, reference };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/collection-intents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        external_ref: reference,
        policy_number: input.policyNumber,
        amount_aed: input.amountAED,
        lives: input.lives,
        currency: 'AED',
      }),
      signal: controller.signal,
    });
    if (res.ok) return { ...base, ok: true, reference };
    const text = (await res.text().catch(() => '')).slice(0, 200);
    return { ...base, ok: false, detail: `payment gateway ${res.status}: ${text}` };
  } catch (err) {
    const reason = (err as Error).name === 'AbortError' ? `timed out after ${timeoutMs}ms` : (err as Error).message;
    return { ...base, ok: false, detail: `payment gateway unreachable: ${reason}` };
  } finally {
    clearTimeout(timer);
  }
}
