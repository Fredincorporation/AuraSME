import type { CensusMember, PlanBenefitConfig } from '@/types/quote';

const ADULT_BASE: Record<PlanBenefitConfig['networkTier'], number> = {
  Essential: 145,
  Comprehensive: 215,
  'Premier Global': 340,
};

const AGE_FACTORS: { maxAge: number; factor: number }[] = [
  { maxAge: 14, factor: 0.45 },
  { maxAge: 30, factor: 1.0 },
  { maxAge: 45, factor: 1.25 },
  { maxAge: 60, factor: 1.75 },
  { maxAge: 200, factor: 2.4 },
];

const BAND_LOADINGS: Record<CensusMember['salaryBand'], number> = {
  'Band A (>AED 20k)': 1.15,
  'Band B (AED 10-20k)': 1.0,
  'Band C (<AED 10k/Basic)': 0.82,
};

const JURISDICTION_FACTORS: Record<CensusMember['jurisdiction'], number> = {
  'Dubai (DHA)': 1.0,
  'Abu Dhabi (DOH)': 1.06,
  'Northern Emirates (MOHAP)': 0.92,
};

const COPAY_FACTORS: Record<number, number> = { 0: 1.12, 10: 1.03, 15: 0.97, 20: 0.9 };

const PHARMACY_LOADINGS: Record<number, number> = { 1500: 0, 3000: 8, 5000: 18, 10000: 34 };

export interface MemberRating {
  memberId: string;
  name: string;
  age: number;
  monthly: number;
  annual: number;
  components: string[];
}

export interface RatingBreakdown {
  members: MemberRating[];
  netMonthly: number;
  netAnnual: number;
  vatAED: number;
  policyFeeAED: number;
  annualTotalAED: number;
  monthlyPerEmployeeAED: number;
  ratedLives: number;
  excludedLives: number;
}

export function rateMember(member: CensusMember, config: PlanBenefitConfig, withComponents = true): MemberRating | null {
  if (member.age <= 0) return null;
  if (member.underwritingStatus === 'underwriter-desk') return null;
  const base = ADULT_BASE[config.networkTier];
  const ageBracket = AGE_FACTORS.find((a) => member.age <= a.maxAge) ?? AGE_FACTORS[AGE_FACTORS.length - 1];
  const ageFactor = ageBracket.factor;
  const relationshipFactor = member.relationship === 'Child' ? 0.55 : member.relationship === 'Spouse' ? 0.9 : 1;
  const bandLoading = member.relationship === 'Principal' ? BAND_LOADINGS[member.salaryBand] : 1;
  const jurisdiction = JURISDICTION_FACTORS[member.jurisdiction];
  const copay = COPAY_FACTORS[config.coPay] ?? 1;

  let monthly = base * ageFactor * relationshipFactor * bandLoading * jurisdiction * copay;
  const childDiscount = member.relationship === 'Child' ? 0.4 : 1;
  monthly += (PHARMACY_LOADINGS[config.pharmacyLimit] ?? 12) * childDiscount;
  if (config.includeDental) monthly += 22 * childDiscount;
  if (config.includeOptical) monthly += 9 * childDiscount;
  if (config.includeMaternity && member.gender === 'F' && member.age >= 16 && member.age <= 55) monthly += 18;
  if (config.wellnessRider) monthly += 7;

  const components = withComponents
    ? [
        `${config.networkTier} base AED ${base}`,
        `age ${member.age} ×${ageFactor}`,
        `${relationshipFactor !== 1 ? member.relationship + ' ×' + relationshipFactor : 'principal rate'}`,
        `${member.jurisdiction} ×${jurisdiction}`,
        `${config.coPay}% co-pay ×${copay}`,
      ]
    : [];
  if (withComponents && bandLoading !== 1) components.push(`${member.salaryBand.slice(0, 6)} ×${bandLoading}`);

  return {
    memberId: member.id,
    name: member.name,
    age: member.age,
    monthly: Math.round(monthly * 100) / 100,
    annual: Math.round(monthly * 12 * 100) / 100,
    components,
  };
}

export function rateCensus(members: CensusMember[], config: PlanBenefitConfig, withComponents = true): RatingBreakdown {
  const rated = members
    .map((m) => rateMember(m, config, withComponents))
    .filter((r): r is MemberRating => r !== null);
  const netMonthly = rated.reduce((sum, r) => sum + r.monthly, 0);
  const netAnnual = netMonthly * 12;
  const vatAED = netAnnual * 0.05;
  const policyFeeAED = 500;
  const relationshipById = new Map(members.map((m) => [m.id, m.relationship]));
  const principals = rated.filter((r) => relationshipById.get(r.memberId) === 'Principal').length || 1;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    members: rated,
    netMonthly: round2(netMonthly),
    netAnnual: round2(netAnnual),
    vatAED: round2(vatAED),
    policyFeeAED,
    annualTotalAED: round2(netAnnual + vatAED + policyFeeAED),
    monthlyPerEmployeeAED: round2(netAnnual / principals / 12),
    ratedLives: rated.length,
    excludedLives: members.length - rated.length,
  };
}
