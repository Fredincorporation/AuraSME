import {
  applyAutoFix,
  buildSampleCensus,
  censusStats,
  dedupeMembers,
  parseCensusWorkbook,
} from '@/lib/census/engine';
import { COMPLIANCE_RULES, evaluateCompliance } from '@/lib/compliance/rules';
import { rateCensus } from '@/lib/rating/engine';
import type { CensusMember, NetworkTier, PlanBenefitConfig } from '@/types/quote';

const BASE_CONFIG: PlanBenefitConfig = {
  networkTier: 'Comprehensive',
  coPay: 10,
  pharmacyLimit: 3000,
  includeDental: true,
  includeOptical: false,
  includeMaternity: true,
  wellnessRider: true,
};

export const DEMO_TIERS: NetworkTier[] = ['Essential', 'Comprehensive', 'Premier Global'];

export interface DemoTierResult {
  tier: NetworkTier;
  /** Label shown in the switcher — the engine key is `Premier Global`. */
  label: string;
  annualTotalAED: number;
  monthlyPerEmployeeAED: number;
  ratedLives: number;
  excludedLives: number;
  rulesAutoAligned: number;
}

export interface DemoScenario {
  rosterRows: number;
  members: number;
  principals: number;
  dependants: number;
  issuesFound: number;
  autoFixesApplied: number;
  qualityBeforeFix: number;
  qualityAfterFix: number;
  clearedAfterFix: number;
  flaggedAfterFix: number;
  underwriterAfterFix: number;
  complianceRules: number;
  tiers: DemoTierResult[];
  engineRunMs: number;
}

/**
 * Applies every auto-fixable issue on every member, mirroring the store's bulk-fix path.
 * Only non-info issues are counted, so the headline can't claim more repairs than it flagged.
 */
function autoFixAll(members: CensusMember[]): { members: CensusMember[]; fixesApplied: number } {
  let fixesApplied = 0;
  const next = members.map((member) => {
    let current = member;
    for (const issue of member.censusIssues.filter((i) => i.autoFixable)) {
      current = applyAutoFix(current, issue.code);
      if (issue.severity !== 'info') fixesApplied += 1;
    }
    return current;
  });
  return { members: next, fixesApplied };
}

/**
 * Runs the shipped sample roster through the real census, compliance and rating engines so
 * the marketing page reports measured output instead of invented constants.
 */
export function buildDemoScenario(): DemoScenario {
  const started = performance.now();

  const parsed = parseCensusWorkbook(buildSampleCensus());
  const deduped = dedupeMembers(parsed.members);

  const before = censusStats(deduped);
  const { members: fixed, fixesApplied } = autoFixAll(deduped);
  const after = censusStats(fixed);

  const tiers = DEMO_TIERS.map((tier) => {
    const report = evaluateCompliance({ ...BASE_CONFIG, networkTier: tier }, fixed);
    const rating = rateCensus(fixed, report.config);
    return {
      tier,
      label: tier === 'Premier Global' ? 'Premier' : tier,
      annualTotalAED: rating.annualTotalAED,
      monthlyPerEmployeeAED: rating.monthlyPerEmployeeAED,
      ratedLives: rating.ratedLives,
      excludedLives: rating.excludedLives,
      rulesAutoAligned: report.findings.filter((f) => f.autoFixed).length,
    } satisfies DemoTierResult;
  });

  return {
    rosterRows: parsed.rowCount,
    members: after.total,
    principals: after.principals,
    dependants: after.dependants,
    issuesFound: before.issueCount,
    autoFixesApplied: fixesApplied,
    qualityBeforeFix: before.quality,
    qualityAfterFix: after.quality,
    clearedAfterFix: after.cleared,
    flaggedAfterFix: after.flagged,
    underwriterAfterFix: after.underwriter,
    complianceRules: COMPLIANCE_RULES.length,
    tiers,
    engineRunMs: Math.round((performance.now() - started) * 10) / 10,
  };
}
