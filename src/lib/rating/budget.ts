import { evaluateCompliance } from '@/lib/compliance/rules';
import { rateCensus, type RatingBreakdown } from '@/lib/rating/engine';
import type { CoPayRate, CensusMember, NetworkTier, PlanBenefitConfig } from '@/types/quote';

export type BudgetBasis = 'monthlyTotal' | 'perEmployeeMonth' | 'annualTotal';
export type BudgetStrategy = 'maxCoverage' | 'balanced' | 'lowestCost';

const TIERS: NetworkTier[] = ['Essential', 'Comprehensive', 'Premier Global'];
const CO_PAYS: CoPayRate[] = [0, 10, 15, 20];
const PHARMACY_LIMITS = [1500, 3000, 5000, 10000];
const BOOLS = [false, true];

export const BUDGET_GRID_SIZE =
  TIERS.length * CO_PAYS.length * PHARMACY_LIMITS.length * BOOLS.length ** 4;

// Deliberately simple and published, so a reviewer can check the ranking by hand.
const TIER_POINTS: Record<NetworkTier, number> = { Essential: 30, Comprehensive: 62, 'Premier Global': 100 };
const COPAY_POINTS: Record<CoPayRate, number> = { 0: 25, 10: 18, 15: 10, 20: 0 };
const PHARMACY_POINTS: Record<number, number> = { 1500: 0, 3000: 8, 5000: 14, 10000: 20 };
const RIDER_POINTS = { includeDental: 10, includeOptical: 6, includeMaternity: 10, wellnessRider: 6 } as const;
const MAX_POINTS = 100 + 25 + 20 + 10 + 6 + 10 + 6;

export interface MandatedChange {
  ruleId: string;
  label: string;
  citation: string;
  detail: string;
}

export interface BudgetOption {
  key: string;
  strategy: BudgetStrategy;
  config: PlanBenefitConfig;
  mandated: MandatedChange[];
  monthlyTotalAED: number;
  perEmployeeMonthAED: number;
  annualTotalAED: number;
  coverageIndex: number;
  ratedLives: number;
  excludedLives: number;
  /** Difference against the live configuration on the requested basis and coverage index. */
  deltaVsCurrent: { priceAED: number; coverage: number };
}

export interface BudgetSearchResult {
  basis: BudgetBasis;
  targetAED: number;
  gridEvaluated: number;
  distinctPlans: number;
  withinBudget: number;
  elapsedMs: number;
  options: BudgetOption[];
  /** Set when no compliant plan fits: the cheapest one the rules allow, and by how much it misses. */
  shortfall: { cheapest: BudgetOption; gapAED: number } | null;
  current: BudgetOption;
}

interface Candidate {
  key: string;
  config: PlanBenefitConfig;
  mandated: MandatedChange[];
  rating: RatingBreakdown;
  coverage: number;
  price: number;
}

function coveragePoints(config: PlanBenefitConfig): number {
  return (
    TIER_POINTS[config.networkTier] +
    COPAY_POINTS[config.coPay] +
    (PHARMACY_POINTS[config.pharmacyLimit] ?? 0) +
    Object.entries(RIDER_POINTS).reduce((sum, [field, points]) => (config[field as keyof PlanBenefitConfig] ? sum + points : sum), 0)
  );
}

function priceOf(rating: RatingBreakdown, basis: BudgetBasis): number {
  if (basis === 'annualTotal') return rating.annualTotalAED;
  if (basis === 'perEmployeeMonth') return rating.monthlyPerEmployeeAED;
  return rating.annualTotalAED / 12;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function planKey(config: PlanBenefitConfig): string {
  return JSON.stringify([
    config.networkTier,
    config.coPay,
    config.pharmacyLimit,
    config.includeDental,
    config.includeOptical,
    config.includeMaternity,
    config.wellnessRider,
  ]);
}

/**
 * Prices one requested configuration through the shipped engines — compliance auto-correction
 * first, then rating — so a candidate carries exactly what applying it would cost, mandated uplifts included.
 */
function evaluateCandidate(requested: PlanBenefitConfig, members: CensusMember[], basis: BudgetBasis): Candidate {
  const report = evaluateCompliance(requested, members);
  const rating = rateCensus(members, report.config, false);
  return {
    key: planKey(report.config),
    config: report.config,
    mandated: report.findings
      .filter((f) => f.autoFixed)
      .map((f) => ({ ruleId: f.ruleId, label: f.label, citation: f.citation, detail: f.detail })),
    rating,
    coverage: Math.round((coveragePoints(report.config) / MAX_POINTS) * 100),
    price: priceOf(rating, basis),
  };
}

function buildCandidates(members: CensusMember[], basis: BudgetBasis): Candidate[] {
  const byKey = new Map<string, Candidate>();
  for (const networkTier of TIERS) {
    for (const coPay of CO_PAYS) {
      for (const pharmacyLimit of PHARMACY_LIMITS) {
        for (const includeDental of BOOLS) {
          for (const includeOptical of BOOLS) {
            for (const includeMaternity of BOOLS) {
              for (const wellnessRider of BOOLS) {
                const candidate = evaluateCandidate(
                  { networkTier, coPay, pharmacyLimit, includeDental, includeOptical, includeMaternity, wellnessRider },
                  members,
                  basis
                );
                // Two requested plans the rules collapse into one must not be offered as two choices.
                if (!byKey.has(candidate.key)) byKey.set(candidate.key, candidate);
              }
            }
          }
        }
      }
    }
  }
  return [...byKey.values()];
}

function toOption(candidate: Candidate, strategy: BudgetStrategy, current: Candidate): BudgetOption {
  return {
    key: candidate.key,
    strategy,
    config: candidate.config,
    mandated: candidate.mandated,
    monthlyTotalAED: round2(candidate.rating.annualTotalAED / 12),
    perEmployeeMonthAED: round2(candidate.rating.monthlyPerEmployeeAED),
    annualTotalAED: round2(candidate.rating.annualTotalAED),
    coverageIndex: candidate.coverage,
    ratedLives: candidate.rating.ratedLives,
    excludedLives: candidate.rating.excludedLives,
    deltaVsCurrent: { priceAED: round2(candidate.price - current.price), coverage: candidate.coverage - current.coverage },
  };
}

export function searchBudgetTarget(
  members: CensusMember[],
  currentConfig: PlanBenefitConfig,
  basis: BudgetBasis,
  targetAED: number
): BudgetSearchResult {
  const started = performance.now();
  const candidates = buildCandidates(members, basis);
  const current = evaluateCandidate(currentConfig, members, basis);

  const affordable = candidates.filter((c) => c.price <= targetAED);
  const byCoverageDesc = [...affordable].sort((a, b) => b.coverage - a.coverage || a.price - b.price);
  const byPriceAsc = [...affordable].sort((a, b) => a.price - b.price || b.coverage - a.coverage);

  const picked: BudgetOption[] = [];
  const take = (candidate: Candidate | undefined, strategy: BudgetStrategy) => {
    if (!candidate || picked.some((p) => p.key === candidate.key)) return;
    picked.push(toOption(candidate, strategy, current));
  };

  take(byCoverageDesc[0], 'maxCoverage');
  take(byPriceAsc[0], 'lowestCost');

  // "Balanced" is the most coverage gained per dirham spent above the cheapest fit.
  const cheapest = byPriceAsc[0];
  const richest = byCoverageDesc[0];
  if (cheapest && richest && cheapest.key !== richest.key) {
    const valuePerDirham = (c: Candidate) => (c.coverage - cheapest.coverage) / (c.price - cheapest.price || 1);
    const middle = [...affordable]
      .filter((c) => c.key !== cheapest.key && c.key !== richest.key)
      .sort((a, b) => valuePerDirham(b) - valuePerDirham(a))[0];
    take(middle, 'balanced');
  }
  for (const candidate of byCoverageDesc) {
    if (picked.length >= 3) break;
    take(candidate, 'balanced');
  }

  const cheapestOverall = [...candidates].sort((a, b) => a.price - b.price || b.coverage - a.coverage)[0];
  const shortfall =
    affordable.length === 0 && cheapestOverall
      ? { cheapest: toOption(cheapestOverall, 'lowestCost', current), gapAED: round2(cheapestOverall.price - targetAED) }
      : null;

  return {
    basis,
    targetAED,
    gridEvaluated: BUDGET_GRID_SIZE,
    distinctPlans: candidates.length,
    withinBudget: affordable.length,
    elapsedMs: Math.round((performance.now() - started) * 10) / 10,
    options: picked,
    shortfall,
    current: toOption(current, 'maxCoverage', current),
  };
}
