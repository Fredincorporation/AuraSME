import { NextRequest, NextResponse } from 'next/server';
import { dedupeMembers, parseCensusWorkbook } from '@/lib/census/engine';
import { guard } from '@/lib/apiGuard';

export async function POST(request: NextRequest) {
  const { denied } = await guard(request, { limit: 60 });
  if (denied) return denied;
  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }
  const buffer = await file.arrayBuffer();
  try {
    const result = parseCensusWorkbook(buffer);
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Workbook has no data rows. Supported: .xlsx, .xls, .csv' }, { status: 422 });
    }
    // Duplicate detection lives here so the API returns the same members the UI shows.
    return NextResponse.json({ ...result, members: dedupeMembers(result.members) });
  } catch {
    return NextResponse.json({ error: 'Unreadable workbook. Supported: .xlsx, .xls, .csv' }, { status: 422 });
  }
}
