import { NextRequest, NextResponse } from 'next/server';
import { guard } from '@/lib/apiGuard';
import { buildDocuments, completenessQueue, type IncomingDoc } from '@/lib/documents';
import type { CensusMember } from '@/types/quote';

// API-first parity with the in-browser document intake: pass the file manifest (names, sizes,
// MIME) and the census, and get back classified + member-linked documents plus the completeness
// queue. No file bytes are interpreted — classification is filename/MIME only.
export async function POST(request: NextRequest) {
  const { denied } = await guard(request, { limit: 60 });
  if (denied) return denied;

  const body = (await request.json()) as { files?: IncomingDoc[]; members?: CensusMember[] };
  const files = Array.isArray(body.files) ? body.files : [];
  const members = Array.isArray(body.members) ? body.members : [];
  if (files.length === 0) {
    return NextResponse.json({ error: 'Body requires { files: IncomingDoc[], members: CensusMember[] }' }, { status: 400 });
  }

  const documents = buildDocuments(files, members);
  return NextResponse.json({
    documents,
    completeness: completenessQueue(members, documents),
    linked: documents.filter((d) => d.status === 'linked').length,
    unmatched: documents.filter((d) => d.status === 'unmatched').length,
  });
}
