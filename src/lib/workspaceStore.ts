import 'server-only';
import { getSupabaseAdmin, persistenceEnabled } from './supabase';
import type { AuditEntry, WorkspaceSnapshot } from '@/types/quote';

// Server-side, per-broker durable workspace. Writes go through the service-role client (RLS is
// bypassed there), so the ONLY scoping is the caller-supplied `userId`, which the route derives
// from the verified bearer token. The browser's sessionStorage store is a local cache of this.

export interface LoadedWorkspace {
  snapshot: WorkspaceSnapshot | null;
  audit: AuditEntry[];
  updatedAt: string | null;
}

const memoryWorkspaces = new Map<string, { state: WorkspaceSnapshot; audit: AuditEntry[]; updatedAt: string }>();

// Workspaces are keyed to a Supabase auth user (a UUID). The open demo / e2e run reaches routes
// without a token, where `guard` yields a non-UUID identity ('anonymous'); that must stay on the
// ephemeral in-memory path rather than hitting a UUID-typed column.
function isUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}

function rowToAudit(row: Record<string, unknown>): AuditEntry {
  const params = (row.params ?? undefined) as Record<string, string | number> | undefined;
  return {
    at: String(row.at ?? ''),
    actor: String(row.actor ?? ''),
    action: String(row.action ?? ''),
    detail: String(row.detail ?? ''),
    actorKey: row.actor_key ? String(row.actor_key) : undefined,
    i18nKey: row.i18n_key ? String(row.i18n_key) : undefined,
    params,
  };
}

export async function loadWorkspace(userId: string): Promise<LoadedWorkspace> {
  const client = getSupabaseAdmin();
  if (!client || !isUuid(userId)) {
    const mem = memoryWorkspaces.get(userId);
    return mem ? { snapshot: mem.state, audit: mem.audit, updatedAt: mem.updatedAt } : { snapshot: null, audit: [], updatedAt: null };
  }

  const { data: ws } = await client
    .from('workspaces')
    .select('state,updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: events } = await client
    .from('audit_events')
    .select('at,actor,action,detail,actor_key,i18n_key,params')
    .eq('user_id', userId)
    .order('at', { ascending: true })
    .limit(500);

  const snapshot = (ws?.state as WorkspaceSnapshot) ?? null;
  const audit = ((events ?? []) as Record<string, unknown>[]).map(rowToAudit);
  return { snapshot, audit, updatedAt: ws?.updated_at ? String(ws.updated_at) : null };
}

// Replaces the broker's whole snapshot atomically. The client sends a debounced full state, so
// a last-writer-wins upsert is correct for a single broker editing one workspace.
export async function saveWorkspace(userId: string, snapshot: WorkspaceSnapshot): Promise<{ persisted: 'supabase' | 'memory' }> {
  const now = new Date().toISOString();
  const client = getSupabaseAdmin();
  if (!client || !isUuid(userId)) {
    const mem = memoryWorkspaces.get(userId);
    memoryWorkspaces.set(userId, { state: snapshot, audit: mem?.audit ?? [], updatedAt: now });
    return { persisted: 'memory' };
  }

  await client.from('workspaces').upsert(
    {
      user_id: userId,
      quote_number: snapshot.activeQuoteNumber ?? null,
      state: snapshot as unknown as Record<string, unknown>,
      updated_at: now,
    },
    { onConflict: 'user_id' }
  );
  return { persisted: 'supabase' };
}

// Append-only. ON CONFLICT (user_id, at) DO NOTHING so re-sending the browser's audit tail on
// every sync never duplicates rows and the trail stays immutable.
export async function appendAudit(userId: string, entries: AuditEntry[]): Promise<{ persisted: 'supabase' | 'memory'; written: number }> {
  const client = getSupabaseAdmin();
  if (!client || !isUuid(userId)) {
    const mem = memoryWorkspaces.get(userId) ?? { state: {} as WorkspaceSnapshot, audit: [], updatedAt: new Date().toISOString() };
    const seen = new Set(mem.audit.map((a) => a.at));
    const added = entries.filter((e) => e.at && !seen.has(e.at));
    memoryWorkspaces.set(userId, { ...mem, audit: [...mem.audit, ...added] });
    return { persisted: 'memory', written: added.length };
  }

  const rows = entries
    .filter((e) => e.at)
    .map((e) => ({
      user_id: userId,
      at: e.at,
      actor: e.actor,
      action: e.action,
      detail: e.detail ?? '',
      actor_key: e.actorKey ?? null,
      i18n_key: e.i18nKey ?? null,
      params: e.params ?? null,
    }));
  if (!rows.length) return { persisted: 'supabase', written: 0 };

  const { data, error } = await client
    .from('audit_events')
      .upsert(rows, { onConflict: 'user_id,at', ignoreDuplicates: true })
      .select('id');
  if (error) return { persisted: 'supabase', written: 0 };
  return { persisted: 'supabase', written: data?.length ?? 0 };
}

export function workspaceBackend(): 'supabase' | 'memory' {
  return persistenceEnabled() && getSupabaseAdmin() ? 'supabase' : 'memory';
}
