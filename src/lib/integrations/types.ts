import 'server-only';

// Common shape for every outbound integration seam in this build (Salesforce, payments, rating
// platform, policy admin). Each adapter is contract-first: with credentials it performs the real
// call; without them it reports the exact request it *would* have sent so the demo, e2e and
// health probe stay runnable and honest. Credentials are never logged or returned.

export interface IntegrationResult {
  adapter: 'live' | 'mock';
  ok: boolean;
  detail?: string;
}

export interface ContractField {
  name: string;
  type: string;
  note: string;
}

export interface IntegrationContract {
  id: string;
  direction: 'outbound';
  label: string;
  method: string;
  endpoint: string;
  auth: string;
  envVars: string[];
  configured: boolean;
  fields: ContractField[];
}
