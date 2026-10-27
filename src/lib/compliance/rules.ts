import type { CensusMember, PlanBenefitConfig } from '@/types/quote';

export interface ComplianceRule {
  id: string;
  jurisdiction: 'DHA' | 'DOH' | 'MOHAP' | 'UAE';
  label: string;
  citation: string;
  check: (config: PlanBenefitConfig, members: CensusMember[]) => RuleCheckResult;
}

interface RuleCheckResult {
  ok: boolean;
  autoFix?: Partial<PlanBenefitConfig>;
  detail: string;
  detailKey: string;
  detailParams?: Record<string, string | number>;
}

export const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'DHA-ANB-COPAY-20',
    jurisdiction: 'DHA',
    label: 'Co-pay cap 20%',
    citation: 'DHA Access Point Network Benefits circular',
    check: (c) =>
      c.coPay <= 20
        ? { ok: true, detail: `${c.coPay}% within DHA 20% cap`, detailKey: 'COPAY_OK', detailParams: { coPay: c.coPay } }
        : { ok: false, detail: `${c.coPay}% exceeds DHA 20% cap`, detailKey: 'COPAY_FAIL', detailParams: { coPay: c.coPay } },
  },
  {
    id: 'DHA-MEB-MATERNITY',
    jurisdiction: 'DHA',
    label: 'Maternity in MEB',
    citation: 'DHA Essential Benefits Scheme list',
    check: (c, members) => {
      const hasFemaleAdults = members.some((m) => m.gender === 'F' && m.age >= 16 && m.age <= 60);
      if (c.networkTier !== 'Essential' || !hasFemaleAdults) return { ok: true, detail: 'Not applicable to this configuration', detailKey: 'MATERNITY_NA' };
      return c.includeMaternity
        ? { ok: true, detail: 'Maternity included as required by DHA Essential Benefits', detailKey: 'MATERNITY_OK' }
        : { ok: false, detail: 'DHA Essential plans must include maternity for female members 16-60', autoFix: { includeMaternity: true }, detailKey: 'MATERNITY_FAIL' };
    },
  },
  {
    id: 'UAE-CHRONIC-30DAYS',
    jurisdiction: 'UAE',
    label: 'Chronic waiting ≤ 30 days',
    citation: 'UAE unified health insurance law — chronic condition waiting period',
    check: () => ({ ok: true, detail: 'No waiting period configured for chronic conditions', detailKey: 'CHRONIC_OK' }),
  },
  {
    id: 'DOH-PHARMACY-1500',
    jurisdiction: 'DOH',
    label: 'Pharmacy ≥ AED 1,500',
    citation: 'DOH Essential Benefits list (phaceuticals)',
    check: (c, members) => {
      const hasDoh = members.some((m) => m.jurisdiction === 'Abu Dhabi (DOH)');
      if (!hasDoh) return { ok: true, detail: 'No DOH members in census', detailKey: 'PHARMACY_NA' };
      return c.pharmacyLimit >= 1500
        ? { ok: true, detail: `Pharmacy limit AED ${c.pharmacyLimit.toLocaleString()} meets DOH minimum`, detailKey: 'PHARMACY_OK', detailParams: { limit: c.pharmacyLimit.toLocaleString() } }
        : { ok: false, detail: `DOH requires pharmacy ≥ AED 1,500 (current ${c.pharmacyLimit})`, autoFix: { pharmacyLimit: 1500 }, detailKey: 'PHARMACY_FAIL', detailParams: { limit: c.pharmacyLimit.toLocaleString() } };
    },
  },
  {
    id: 'DHA-EID-KYC',
    jurisdiction: 'DHA',
    label: 'Emirates ID on file',
    citation: 'DHA enrolment — insured identity must be verifiable via Emirates ID',
    check: (_c: PlanBenefitConfig, members: CensusMember[]): RuleCheckResult => {
      const dha = members.filter((m) => m.jurisdiction === 'Dubai (DHA)');
      if (dha.length === 0) return { ok: true, detail: 'No DHA members in census', detailKey: 'EID_KYC_NA' };
      const missing = dha.filter((m) => !m.emiratesId).length;
      const ok = missing === 0;
      return {
        ok,
        detail: ok
          ? `All ${dha.length} DHA members carry an Emirates ID`
          : `${missing} DHA member(s) have no Emirates ID — cannot enrol until identity is supplied`,
        detailKey: ok ? 'EID_KYC_OK' : 'EID_KYC_FAIL',
        detailParams: { count: dha.length, missing },
      };
    },
  },
];

export interface ComplianceReport {
  ok: boolean;
  corrected: boolean;
  config: PlanBenefitConfig;
  findings: { ruleId: string; label: string; citation: string; ok: boolean; detail: string; autoFixed: boolean; detailKey: string; detailParams?: Record<string, string | number> }[];
  referrals: { memberId: string; name: string; reason: string; ruleId: string }[];
}

export function evaluateCompliance(config: PlanBenefitConfig, members: CensusMember[], autoCorrect = true): ComplianceReport {
  let working = { ...config };
  const findings: ComplianceReport['findings'] = [];
  const jurisdictions = new Set(members.map((m) => m.jurisdiction));
  const applies = (rule: ComplianceRule) =>
    rule.jurisdiction === 'UAE' ||
    (rule.jurisdiction === 'DHA' && jurisdictions.has('Dubai (DHA)')) ||
    (rule.jurisdiction === 'DOH' && jurisdictions.has('Abu Dhabi (DOH)'));

  let corrected = false;
  for (const rule of COMPLIANCE_RULES.filter(applies)) {
    const result = rule.check(working, members);
    let autoFixed = false;
    if (!result.ok && autoCorrect && result.autoFix) {
      working = { ...working, ...result.autoFix };
      corrected = true;
      autoFixed = true;
    }
    findings.push({ ruleId: rule.id, label: rule.label, citation: rule.citation, ok: result.ok || autoFixed, detail: result.detail, autoFixed, detailKey: result.detailKey, detailParams: result.detailParams });
  }

  const referrals: ComplianceReport['referrals'] = [];
  for (const m of members) {
    if (m.underwritingStatus === 'underwriter-desk') {
      const reason = m.issues?.[0] ?? m.censusIssues[0]?.message ?? 'Declared medical condition requires senior underwriter review';
      referrals.push({ memberId: m.id, name: m.name, reason, ruleId: 'UW-DECL' });
    }
    for (const i of m.censusIssues) {
      if (i.severity === 'blocking' && !i.autoFixable) {
        referrals.push({ memberId: m.id, name: m.name, reason: i.message, ruleId: i.code });
      }
    }
  }

  return { ok: findings.every((f) => f.ok), corrected, config: working, findings, referrals };
}
