import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AuditEntry, BookType, CensusMember, FunnelMetrics, PlanBenefitConfig, QuoteStatus, QuoteVersion, SMECompanyDetails, SupportDocument, WorkspaceSnapshot } from '@/types/quote';
import type { Locale } from '@/i18n/routing';
import { rateCensus, type RatingBreakdown } from '@/lib/rating/engine';
import { evaluateCompliance, type ComplianceReport } from '@/lib/compliance/rules';
import { censusStats, applyAutoFix, ageFromDob } from '@/lib/census/engine';
import { apiFetch } from '@/lib/apiClient';

export type { AuditEntry };

// The keys that make up the resumable workspace. The server (per auth user) and the local
// sessionStorage cache hold exactly this shape; compliance/rating are derived, never stored.
export function snapshotOf(state: QuoteStore): WorkspaceSnapshot {
  return {
    company: state.company,
    census: state.census,
    sourceFileName: state.sourceFileName,
    lastParsedAt: state.lastParsedAt,
    unmappedColumns: state.unmappedColumns,
    activeConfig: state.activeConfig,
    bookType: state.bookType,
    documents: state.documents,
    versions: state.versions,
    currentVersionIndex: state.currentVersionIndex,
    activeQuoteNumber: state.versions.find((v) => v.quoteNumber)?.quoteNumber,
  };
}

interface QuoteStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;

  company: SMECompanyDetails;
  updateCompany: (details: Partial<SMECompanyDetails>) => void;

  census: CensusMember[];
  sourceFileName: string | null;
  lastParsedAt: string | null;
  unmappedColumns: string[];
  setParsedCensus: (members: CensusMember[], fileName: string, unmappedColumns: string[]) => void;
  clearCensus: () => void;
  resolveMember: (id: string, patch: Partial<CensusMember>) => void;
  applyFixesFor: (id: string) => void;

  activeConfig: PlanBenefitConfig;
  updateConfig: (patch: Partial<PlanBenefitConfig>) => void;

  bookType: BookType;
  setBookType: (book: BookType) => void;

  complianceReport: ComplianceReport;
  currentRating: RatingBreakdown;
  lastReRateMs: number;

  documents: SupportDocument[];
  addDocuments: (docs: SupportDocument[]) => void;
  removeDocument: (id: string) => void;

  funnel: FunnelMetrics | null;
  setFunnel: (funnel: FunnelMetrics) => void;

  versions: QuoteVersion[];
  currentVersionIndex: number;
  createNewVersion: (notes: string) => void;
  switchVersion: (index: number) => void;
  markBound: (versionId: string, policyNumber: string) => void;
  generateRenewal: () => void;

  auditLog: AuditEntry[];
  pushAudit: (actor: string, action: string, detail: string, i18n?: { actorKey: string; key: string; params?: Record<string, string | number> }) => void;

  // Server-side durable workspace. The browser store mirrors this snapshot; when a broker is
  // signed in the server is the source of truth so the session survives a cache clear or a
  // device change. `serverHydrated` flips once the authoritative snapshot has been applied.
  serverHydrated: boolean;
  lastSyncedAt: string | null;
  applyServerState: (snapshot: WorkspaceSnapshot, audit: AuditEntry[]) => void;
  markSynced: (at: string) => void;
  // On sign-out from a real account, clear the workspace so a shared broker terminal never
  // leaks one broker's census/quote to the next, and require re-hydration for the next user.
  resetWorkspace: () => void;

  isAiDrawerOpen: boolean;
  setAiDrawerOpen: (open: boolean) => void;
  isUaePassModalOpen: boolean;
  setUaePassModalOpen: (open: boolean) => void;
}

// Only durable keys are stored; compliance and rating are re-derived by the engines on
// rehydration, so a refresh can never restore a stale premium.
type PersistedQuoteState = Pick<
  QuoteStore,
  | 'company'
  | 'census'
  | 'sourceFileName'
  | 'lastParsedAt'
  | 'unmappedColumns'
  | 'activeConfig'
  | 'bookType'
  | 'documents'
  | 'versions'
  | 'currentVersionIndex'
  | 'auditLog'
  | 'lastSyncedAt'
>;

function recompute(census: CensusMember[], config: PlanBenefitConfig) {
  const t0 = performance.now();
  const report = evaluateCompliance(config, census);
  const rating = rateCensus(census, report.config);
  return {
    complianceReport: report,
    currentRating: rating,
    activeConfig: report.config,
    lastReRateMs: Math.round((performance.now() - t0) * 100) / 100,
  };
}

const initialCensus: CensusMember[] = [];
const initialComputed = recompute(initialCensus, {
  networkTier: 'Comprehensive',
  coPay: 10,
  pharmacyLimit: 3000,
  includeDental: true,
  includeOptical: false,
  includeMaternity: true,
  wellnessRider: true,
});

export const useQuoteStore = create<QuoteStore>()(
  persist(
    (set, get) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),

      company: {
        companyName: '',
        tradeLicense: '',
        emirate: 'Dubai',
        zoneType: 'Mainland',
        industry: '',
        hrContactName: '',
        hrContactEmail: '',
        hrContactPhone: '',
      },
      updateCompany: (details) => {
        set((state) => ({ company: { ...state.company, ...details } }));
        get().pushAudit('SME HR', 'Company profile saved', details.companyName ?? '', { actorKey: 'hr', key: 'companySaved', params: { company: details.companyName ?? '' } });
      },

      census: initialCensus,
      sourceFileName: null,
      lastParsedAt: null,
      unmappedColumns: [],
      setParsedCensus: (members, fileName, unmappedColumns) => {
        const stats = censusStats(members);
        set((state) => {
          const computed = recompute(members, state.activeConfig);
          return {
            census: members,
            sourceFileName: fileName,
            lastParsedAt: new Date().toISOString(),
            unmappedColumns,
            ...computed,
            versions: [],
            currentVersionIndex: -1,
          };
        });
        get().pushAudit('Census Engine', 'Parsed census', `${fileName}: ${stats.total} rows, ${stats.issueCount} issues, ${stats.autoFixable} auto-fixable`, { actorKey: 'censusEngine', key: 'censusParsed', params: { file: fileName, rows: stats.total, issues: stats.issueCount, autoFixable: stats.autoFixable } });
      },
      clearCensus: () => {
        set(() => ({
          census: [],
          sourceFileName: null,
          lastParsedAt: null,
          unmappedColumns: [],
          versions: [],
          currentVersionIndex: -1,
          ...recompute([], get().activeConfig),
        }));
      },
      resolveMember: (id, patch) => {
        set((state) => {
          const census = state.census.map((m) =>
            m.id === id
              ? {
                  ...m,
                  ...patch,
                  age: patch.dob ? ageFromDob(patch.dob) : m.age,
                  censusIssues: m.censusIssues.filter((i) => !(i.autoFixable && patchMatchesIssue(patch, i.code))),
                  fixesApplied: [...m.fixesApplied, `manual: ${Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', ')}`],
                }
              : m
          );
          const recalc = census.map((m) => (m.censusIssues.every((i) => i.severity === 'info') && m.underwritingStatus === 'flagged-review' ? { ...m, underwritingStatus: 'auto-cleared' as const } : m));
          return { census: recalc, ...recompute(recalc, get().activeConfig) };
        });
        get().pushAudit('HR User', 'Manual field correction', id, { actorKey: 'hrUser', key: 'manualCorrection', params: { id } });
      },
      applyFixesFor: (id) => {
        set((state) => {
          const census = state.census.map((m) => {
            if (m.id !== id) return m;
            let next = m;
            for (const issue of m.censusIssues.filter((i) => i.autoFixable)) {
              next = applyAutoFix(next, issue.code);
            }
            return next;
          });
          return { census, ...recompute(census, get().activeConfig) };
        });
        get().pushAudit('Census Engine', 'Applied auto-fixes', id, { actorKey: 'censusEngine', key: 'autoFixesApplied', params: { id } });
      },

      activeConfig: initialComputed.activeConfig,
      updateConfig: (patch) => {
        set((state) => {
          const nextConfig = { ...state.activeConfig, ...patch };
          return { ...recompute(state.census, nextConfig) };
        });
      },

      bookType: 'SME',
      setBookType: (book) => set({ bookType: book }),

      complianceReport: initialComputed.complianceReport,
      currentRating: initialComputed.currentRating,
      lastReRateMs: initialComputed.lastReRateMs,

      documents: [],
      addDocuments: (docs) => set((state) => ({ documents: [...state.documents, ...docs] })),
      removeDocument: (id) => set((state) => ({ documents: state.documents.filter((d) => d.id !== id) })),

      funnel: null,
      setFunnel: (funnel) => set({ funnel }),

      versions: [],
      currentVersionIndex: -1,
      createNewVersion: (notes: string) => {
        const state = get();
        if (state.currentRating.ratedLives === 0) return;
        const rating = state.currentRating;
        const status: QuoteStatus = state.complianceReport.ok ? 'ready' : 'review';
        const version: QuoteVersion = {
          versionId: `V${state.versions.length + 1}`,
          versionNumber: state.versions.length + 1,
          status,
          createdAt: new Date().toISOString(),
          updatedBy: state.company.hrContactName || 'Broker Portal Session',
          totalLives: rating.ratedLives,
          principalCount: censusStats(state.census).principals,
          dependantCount: censusStats(state.census).dependants,
          config: { ...state.activeConfig },
          annualNetAED: Math.round(rating.netAnnual),
          vatAED: Math.round(rating.vatAED),
          policyFeeAED: rating.policyFeeAED,
          annualTotalAED: Math.round(rating.annualTotalAED),
          monthlyPerEmployeeAED: rating.monthlyPerEmployeeAED,
          salesforceOppId: `006DEMO${String(state.versions.length + 1).padStart(8, '0')}`,
          salesforceSyncStatus: 'pending',
          salesforceAdapter: 'mock',
          persistence: 'pending',
          notes: notes || `Iteration V${state.versions.length + 1}`,
        };
        set({ versions: [...state.versions, version], currentVersionIndex: state.versions.length });
        get().pushAudit('Quote Engine', 'Version snapshot created', `${version.versionId}: AED ${version.annualTotalAED.toLocaleString()} total`, { actorKey: 'quoteEngine', key: 'versionCreated', params: { version: version.versionId, total: version.annualTotalAED.toLocaleString() } });
        persistVersion(version, state.company, status);
      },
      switchVersion: (index) => {
        set((state) => {
          const target = state.versions[index];
          if (!target) return {};
          return { currentVersionIndex: index, ...recompute(state.census, target.config) };
        });
      },

      markBound: (versionId, policyNumber) => {
        const version = get().versions.find((v) => v.versionId === versionId);
        if (!version) return;
        set((state) => ({
          versions: state.versions.map((v) =>
            v.versionId === versionId ? { ...v, status: 'bound' as QuoteStatus, policyNumber, salesforceSyncStatus: 'synced' as const } : v
          ),
        }));
        get().pushAudit('Quote Engine', 'Policy bound', `${versionId}: ${policyNumber}`, { actorKey: 'quoteEngine', key: 'policyBound', params: { version: versionId, policy: policyNumber } });
        apiFetch('/api/quotes/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quoteNumber: version.quoteNumber, versionId: version.versionId, status: 'bound', policyNumber, salesforceOppId: version.salesforceOppId, annualTotalAED: version.annualTotalAED, versionNumber: version.versionNumber, lives: version.totalLives }),
        }).catch(() => undefined);
      },

      generateRenewal: () => {
        const state = get();
        if (state.census.length === 0) return;
        // Age every life by one year from its DOB (or by bumping the recorded age when no DOB
        // is available) and re-rate — a renewal is the same engine run forward twelve months.
        const aged = state.census.map((m) => {
          if (m.dob) {
            const d = new Date(m.dob);
            d.setFullYear(d.getFullYear() + 1);
            const dob = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return { ...m, dob, age: ageFromDob(dob) };
          }
          return { ...m, age: m.age + 1 };
        });
        const computed = recompute(aged, state.activeConfig);
        const rating = computed.currentRating;
        if (rating.ratedLives === 0) return;
        const status: QuoteStatus = rating.ratedLives === 0 ? 'underwriting' : computed.complianceReport.ok ? 'ready' : 'review';
        const version: QuoteVersion = {
          versionId: `V${state.versions.length + 1}`,
          versionNumber: state.versions.length + 1,
          status,
          createdAt: new Date().toISOString(),
          updatedBy: 'Renewal Engine',
          totalLives: rating.ratedLives,
          principalCount: censusStats(aged).principals,
          dependantCount: censusStats(aged).dependants,
          config: { ...state.activeConfig },
          annualNetAED: Math.round(rating.netAnnual),
          vatAED: Math.round(rating.vatAED),
          policyFeeAED: rating.policyFeeAED,
          annualTotalAED: Math.round(rating.annualTotalAED),
          monthlyPerEmployeeAED: rating.monthlyPerEmployeeAED,
          salesforceOppId: `006DEMO${String(state.versions.length + 1).padStart(8, '0')}`,
          salesforceSyncStatus: 'pending',
          salesforceAdapter: 'mock',
          persistence: 'pending',
          notes: `Renewal — population aged +1 year, re-rated`,
        };
        set({ ...computed, versions: [...state.versions, version], currentVersionIndex: state.versions.length });
        get().pushAudit('Quote Engine', 'Renewal quote generated', `${version.versionId}: AED ${version.annualTotalAED.toLocaleString()} at +1yr`, { actorKey: 'quoteEngine', key: 'renewalCreated', params: { version: version.versionId, total: version.annualTotalAED.toLocaleString() } });
        persistVersion(version, state.company, status);
      },

      auditLog: [],
      pushAudit: (actor, action, detail, i18n) =>
        set((state) => ({
          auditLog: [
            ...state.auditLog,
            { at: new Date().toISOString(), actor, action, detail, actorKey: i18n?.actorKey, i18nKey: i18n?.key, params: i18n?.params },
          ],
        })),

      serverHydrated: false,
      lastSyncedAt: null,
      // Server snapshot wins over the local cache; engines re-derive compliance/rating from the
      // restored census + config so a refresh never shows a stale premium.
      applyServerState: (snapshot, audit) => {
        set((state) => ({
          company: snapshot.company ?? state.company,
          census: snapshot.census ?? [],
          sourceFileName: snapshot.sourceFileName ?? null,
          lastParsedAt: snapshot.lastParsedAt ?? null,
          unmappedColumns: snapshot.unmappedColumns ?? [],
          bookType: snapshot.bookType ?? 'SME',
          documents: snapshot.documents ?? [],
          versions: snapshot.versions ?? [],
          currentVersionIndex: snapshot.currentVersionIndex ?? -1,
          auditLog: audit ?? state.auditLog,
          serverHydrated: true,
          // recompute sets activeConfig from the compliance engine, so it governs over the raw
          // restored config rather than being overwritten by it.
          ...recompute(snapshot.census ?? [], snapshot.activeConfig ?? state.activeConfig),
        }));
      },
      markSynced: (at) => set({ lastSyncedAt: at }),
      resetWorkspace: () =>
        set({
          company: {
            companyName: '',
            tradeLicense: '',
            emirate: 'Dubai',
            zoneType: 'Mainland',
            industry: '',
            hrContactName: '',
            hrContactEmail: '',
            hrContactPhone: '',
          },
          census: [],
          sourceFileName: null,
          lastParsedAt: null,
          unmappedColumns: [],
          documents: [],
          versions: [],
          currentVersionIndex: -1,
          auditLog: [],
          lastSyncedAt: null,
          serverHydrated: false,
          ...recompute([], initialComputed.activeConfig),
        }),

      isAiDrawerOpen: false,
      setAiDrawerOpen: (open) => set({ isAiDrawerOpen: open }),
      isUaePassModalOpen: false,
      setUaePassModalOpen: (open) => set({ isUaePassModalOpen: open }),
    }),
    {
      // Session scope, not local storage: a shared broker terminal must not reopen on the
      // previous quote, while a mid-wizard reload keeps the current one intact.
      name: 'aurasme-quote-session',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      // Hydration is driven by <QuoteSessionBootstrap /> so the server-rendered empty state
      // and the first client render agree.
      skipHydration: true,
      partialize: (state): PersistedQuoteState => ({
        company: state.company,
        census: state.census,
        sourceFileName: state.sourceFileName,
        lastParsedAt: state.lastParsedAt,
        unmappedColumns: state.unmappedColumns,
        activeConfig: state.activeConfig,
        bookType: state.bookType,
        documents: state.documents,
        versions: state.versions,
        currentVersionIndex: state.currentVersionIndex,
        auditLog: state.auditLog,
        lastSyncedAt: state.lastSyncedAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) useQuoteStore.setState(recompute(state.census, state.activeConfig));
      },
    },
  ),
);

function patchMatchesIssue(patch: Partial<CensusMember>, code: string): boolean {
  if (code === 'DERIVED_FROM_EID' || code === 'MISSING_DOB' || code === 'INVALID_DOB') return 'dob' in patch;
  if (code === 'MISSING_EID' || code === 'EID_PATTERN_MISMATCH') return 'emiratesId' in patch;
  if (code === 'BAND_INFERRED_FROM_SALARY') return 'salaryBand' in patch;
  return true;
}

function persistVersion(version: QuoteVersion, company: SMECompanyDetails, status: QuoteStatus) {
  apiFetch('/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, company, status }),
  })
    .then((r) => r.json())
    .then((data) => {
      useQuoteStore.setState((state) => ({
        versions: state.versions.map((v) =>
          v.versionId === version.versionId
            ? {
                ...v,
                quoteNumber: data.quoteNumber ?? v.quoteNumber,
                salesforceOppId: data.salesforceOppId ?? v.salesforceOppId,
                salesforceSyncStatus: data.salesforceOppId ? (data.salesforceAdapter === 'live' ? 'synced' : 'mock-payload') : 'error',
                salesforceAdapter: data.salesforceAdapter ?? 'mock',
                persistence: data.saved ? 'supabase' : data.persistence === 'in-memory' ? 'memory-only' : 'supabase-write-failed',
              }
            : v
        ),
      }));
    })
    .catch(() => undefined);
}
