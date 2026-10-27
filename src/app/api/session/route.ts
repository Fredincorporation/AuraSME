import { NextRequest, NextResponse, connection } from 'next/server';
import { guard } from '@/lib/apiGuard';
import { loadWorkspace, saveWorkspace, appendAudit, workspaceBackend } from '@/lib/workspaceStore';
import type { AuditEntry, WorkspaceSnapshot } from '@/types/quote';

// Per-broker durable workspace. GET restores the signed-in broker's resumable session (so a
// cache clear, device switch, or fresh browser picks up where they left off); POST persists the
// debounced snapshot and appends the audit tail. Identity comes only from the verified bearer
// token in `guard`, never from the request body. `connection()` keeps this dynamic under
// cacheComponents — the response depends on the caller.
export async function GET(request: NextRequest) {
  await connection();
  const { userId, denied } = await guard(request, { limit: 120 });
  if (denied) return denied;

  const { snapshot, audit, updatedAt } = await loadWorkspace(userId);
  return NextResponse.json({ snapshot, audit, updatedAt, backend: workspaceBackend() });
}

export async function POST(request: NextRequest) {
  const { userId, denied } = await guard(request, { limit: 120 });
  if (denied) return denied;

  const body = (await request.json()) as { snapshot?: WorkspaceSnapshot; audit?: AuditEntry[] };
  if (!body.snapshot) {
    return NextResponse.json({ error: 'Body requires { snapshot: WorkspaceSnapshot, audit?: AuditEntry[] }' }, { status: 400 });
  }

  const saved = await saveWorkspace(userId, body.snapshot);
  const audited = body.audit?.length ? await appendAudit(userId, body.audit) : { persisted: saved.persisted, written: 0 };
  return NextResponse.json({
    ok: true,
    persisted: saved.persisted,
    auditWritten: audited.written,
    syncedAt: new Date().toISOString(),
    backend: workspaceBackend(),
  });
}
