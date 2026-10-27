export type IssueCode =
  | 'MISSING_DOB'
  | 'MISSING_EID'
  | 'MISSING_GENDER'
  | 'UNKNOWN_RELATIONSHIP'
  | 'INVALID_DOB'
  | 'DERIVED_FROM_EID'
  | 'EID_PATTERN_MISMATCH'
  | 'DUPLICATE_EID'
  | 'CHILD_OVER_AGE'
  | 'BAND_INFERRED_FROM_SALARY';

export interface CensusIssue {
  code: IssueCode;
  message: string;
  severity: 'blocking' | 'warning' | 'info';
  autoFixable: boolean;
  fix?: string;
  // Stable i18n key + interpolation values so the UI can render this issue in the
  // active locale. `code` doubles as the key unless two distinct messages share a
  // code (e.g. EID_PATTERN_MISMATCH), in which case `key` disambiguates. `message`
  // stays English so the ingestion API and e2e assertions keep their contract.
  key?: string;
  params?: Record<string, string | number>;
}

export interface CensusMember {
  id: string;
  name: string;
  emiratesId?: string;
  dob?: string;
  gender: 'M' | 'F';
  relationship: 'Principal' | 'Spouse' | 'Child';
  salaryBand: 'Band A (>AED 20k)' | 'Band B (AED 10-20k)' | 'Band C (<AED 10k/Basic)';
  monthlySalary?: number;
  jurisdiction: 'Dubai (DHA)' | 'Abu Dhabi (DOH)' | 'Northern Emirates (MOHAP)';
  riskCategory: 'low' | 'moderate' | 'high';
  underwritingStatus: 'auto-cleared' | 'flagged-review' | 'underwriter-desk';
  issues?: string[];
  suggestedFix?: string;
  censusIssues: CensusIssue[];
  age: number;
  fixesApplied: string[];
}

export type NetworkTier = 'Essential' | 'Comprehensive' | 'Premier Global';
export type CoPayRate = 0 | 10 | 15 | 20;

export interface PlanBenefitConfig {
  networkTier: NetworkTier;
  coPay: CoPayRate;
  pharmacyLimit: number;
  includeDental: boolean;
  includeOptical: boolean;
  includeMaternity: boolean;
  wellnessRider: boolean;
}

export interface QuoteVersion {
  versionId: string;
  versionNumber: number;
  quoteNumber?: string;
  status?: QuoteStatus;
  createdAt: string;
  updatedBy: string;
  totalLives: number;
  principalCount: number;
  dependantCount: number;
  config: PlanBenefitConfig;
  annualNetAED: number;
  vatAED: number;
  policyFeeAED: number;
  annualTotalAED: number;
  monthlyPerEmployeeAED: number;
  salesforceOppId: string;
  salesforceSyncStatus: 'synced' | 'mock-payload' | 'pending' | 'error';
  salesforceAdapter: 'mock' | 'live';
  persistence: 'supabase' | 'supabase-write-failed' | 'memory-only' | 'pending';
  policyNumber?: string;
  notes: string;
}

export type BookType = 'SME' | 'Individual';

export type SupportDocType =
  | 'medical-declaration'
  | 'eid-copy'
  | 'salary-proof'
  | 'visa-copy'
  | 'other';

export interface SupportDocument {
  id: string;
  fileName: string;
  type: SupportDocType;
  // Set only when the filename carried a recognizable Emirates ID or member name;
  // never inferred from file content (there is no OCR in this build).
  memberId?: string;
  memberName?: string;
  status: 'linked' | 'unmatched';
  receivedAt: string;
  sizeBytes: number;
}

// Funnel stage of a quote, matching the `quotes.current_status` column.
export type QuoteStatus = 'draft' | 'review' | 'ready' | 'underwriting' | 'bound' | 'declined';

export interface QuoteRecord {
  quoteNumber: string;
  status: QuoteStatus;
  company: string;
  tradeLicense: string;
  lives: number;
  annualTotalAED: number;
  activeVersionNumber: number;
  salesforceOppId?: string;
  policyNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FunnelMetrics {
  backend: 'supabase' | 'memory' | 'in-memory';
  observed: number;
  stages: Record<QuoteStatus, number>;
  conversionRate: number | null;
  turnaroundMedianSec: number | null;
}

export interface SMECompanyDetails {
  companyName: string;
  tradeLicense: string;
  emirate: 'Dubai' | 'Abu Dhabi' | 'Sharjah' | 'Other';
  zoneType: 'Freezone' | 'Mainland';
  industry: string;
  hrContactName: string;
  hrContactEmail: string;
  hrContactPhone: string;
}

// A single immutable action on the broker's workspace, rendered in the active locale from
// `actorKey`/`i18nKey`/`params` when present and falling back to the raw English strings.
export interface AuditEntry {
  at: string;
  actor: string;
  action: string;
  detail: string;
  actorKey?: string;
  i18nKey?: string;
  params?: Record<string, string | number>;
}

// The resumable working state for one broker. Persisted server-side (per auth user) so a
// cache clear, a device switch, or a different browser restores the exact session — the
// sessionStorage store is only a fast local cache of this shape. Compliance and rating are
// deliberately NOT stored: the engines re-derive them from `census` + `activeConfig` on load,
// so a stale premium can never be restored.
export interface WorkspaceSnapshot {
  company: SMECompanyDetails;
  census: CensusMember[];
  sourceFileName: string | null;
  lastParsedAt: string | null;
  unmappedColumns: string[];
  activeConfig: PlanBenefitConfig;
  bookType: BookType;
  documents: SupportDocument[];
  versions: QuoteVersion[];
  currentVersionIndex: number;
  activeQuoteNumber?: string;
}
