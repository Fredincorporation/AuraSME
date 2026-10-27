import { NextRequest, NextResponse } from 'next/server';
import { rateCensus } from '@/lib/rating/engine';
import { evaluateCompliance } from '@/lib/compliance/rules';
import { guard } from '@/lib/apiGuard';
import type { CensusMember, PlanBenefitConfig } from '@/types/quote';

export async function POST(request: NextRequest) {
  const { denied } = await guard(request, { limit: 120 });
  if (denied) return denied;
  const body = (await request.json()) as { members?: CensusMember[]; config?: PlanBenefitConfig };
  if (!body.members || !body.config) {
    return NextResponse.json({ error: 'Body requires { members: CensusMember[], config: PlanBenefitConfig }' }, { status: 400 });
  }
  const report = evaluateCompliance(body.config, body.members);
  const rating = rateCensus(body.members, report.config);
  return NextResponse.json({
    compliance: report,
    appliedConfig: report.config,
    rating: { ...rating, members: rating.members.map((m) => ({ ...m, annual: Math.round(m.annual), monthly: Math.round(m.monthly * 100) / 100 })) },
  });
}
