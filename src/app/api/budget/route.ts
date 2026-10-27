import { NextRequest, NextResponse } from 'next/server';
import { searchBudgetTarget, type BudgetBasis } from '@/lib/rating/budget';
import { MAX_CENSUS_ROWS } from '@/lib/census/engine';
import { guard } from '@/lib/apiGuard';
import type { CensusMember, PlanBenefitConfig } from '@/types/quote';

const BASES: BudgetBasis[] = ['monthlyTotal', 'perEmployeeMonth', 'annualTotal'];

export async function POST(request: NextRequest) {
  const { denied } = await guard(request, { limit: 60 });
  if (denied) return denied;
  const body = (await request.json()) as {
    members?: CensusMember[];
    config?: PlanBenefitConfig;
    basis?: BudgetBasis;
    targetAED?: number;
  };
  const { members, config, basis, targetAED } = body;

  if (!Array.isArray(members) || !config) {
    return NextResponse.json({ error: 'Body requires { members, config, basis, targetAED }' }, { status: 400 });
  }
  if (members.length === 0) {
    return NextResponse.json({ error: 'Census has no rows to price.' }, { status: 422 });
  }
  // The search prices the whole grid against the roster, so the row count is the cost driver.
  if (members.length > MAX_CENSUS_ROWS) {
    return NextResponse.json({ error: `Census larger than ${MAX_CENSUS_ROWS} rows is not supported by the budget search.` }, { status: 413 });
  }
  if (!basis || !BASES.includes(basis)) {
    return NextResponse.json({ error: `basis must be one of ${BASES.join(', ')}` }, { status: 400 });
  }
  if (typeof targetAED !== 'number' || !Number.isFinite(targetAED) || targetAED <= 0) {
    return NextResponse.json({ error: 'targetAED must be a positive number on the chosen basis' }, { status: 400 });
  }

  const result = searchBudgetTarget(members, config, basis, targetAED);
  return NextResponse.json({
    ...result,
    note: 'Every option is priced by the shipped compliance and rating engines; the coverage index is a published points model, not an actuarial risk score.',
  });
}
