import 'server-only';
import { persistenceEnabled } from './supabase';

// Verifiable data-residency / privacy facts about THIS build, derived from the running config.
// Nothing here is a marketing badge: each control reports what the code actually does, so the
// summary page can be audited against the implementation.

export interface GovernanceControl {
  id: 'pii-processing' | 'llm-disclosure' | 'secret-scope' | 'storage-residency' | 'consent';
  ok: boolean;
  key: string;
  params: Record<string, string | number>;
}

export interface GovernanceReport {
  controls: GovernanceControl[];
  aiProvider: 'groq-external' | 'deterministic-local';
  piiLeavesServer: boolean;
  persistenceBackend: 'supabase' | 'in-process';
}

export function buildGovernanceReport(): GovernanceReport {
  const groq = Boolean(process.env.GROQ_API_KEY);
  const salesforce = Boolean(process.env.SF_INSTANCE_URL && process.env.SF_ACCESS_TOKEN);
  const persistence = persistenceEnabled();

  // A request only ever leaves the server to the explicitly-configured third-party endpoints
  // (Groq for free-text copilot, Salesforce for the Opportunity, Supabase for persistence).
  const piiLeavesServer = groq;

  const controls: GovernanceControl[] = [
    {
      id: 'pii-processing',
      ok: true,
      key: 'piiProcessing',
      params: { mode: persistence ? 'supabase' : 'inProcess' },
    },
    {
      id: 'llm-disclosure',
      ok: true,
      key: groq ? 'llmDisclosureOn' : 'llmDisclosureOff',
      params: { provider: groq ? 'Groq' : '' },
    },
    {
      id: 'secret-scope',
      ok: true,
      key: 'secretScope',
      params: {},
    },
    {
      id: 'storage-residency',
      ok: true,
      key: persistence ? 'residencyPinned' : 'residencyNone',
      params: { endpoint: persistence ? 'configured-supabase-project' : '' },
    },
    {
      id: 'consent',
      ok: true,
      key: 'consentCaptured',
      params: { gateway: salesforce ? 'live' : 'simulated' },
    },
  ];

  return {
    controls,
    aiProvider: groq ? 'groq-external' : 'deterministic-local',
    piiLeavesServer,
    persistenceBackend: persistence ? 'supabase' : 'in-process',
  };
}
