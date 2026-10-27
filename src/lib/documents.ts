import type { CensusMember, SupportDocument, SupportDocType } from '@/types/quote';

// Supporting-document intake. Classification is by filename + MIME only and member linkage is
// by an Emirates ID or a recognizable name in the filename — there is no OCR and no reading of
// file content in this build, so the engine never claims to have opened a document.

const TYPE_KEYWORDS: [SupportDocType, string[]][] = [
  ['medical-declaration', ['medical', 'declaration', 'health', 'disclosure', 'paramedical', 'morphological']],
  ['eid-copy', ['emirates', 'eid', 'cnic', 'identity', 'id copy', 'id-copy']],
  ['salary-proof', ['salary', 'payroll', 'wps', 'income', 'employment', 'co-e', 'coe']],
  ['visa-copy', ['visa', 'entry permit', 'residence']],
];

const REQUIRED_FOR_DESK: SupportDocType[] = ['medical-declaration'];

export function classifyDocument(fileName: string, mime?: string): SupportDocType {
  const hay = `${fileName} ${mime ?? ''}`.toLowerCase();
  for (const [type, keywords] of TYPE_KEYWORDS) {
    if (keywords.some((k) => hay.includes(k))) return type;
  }
  return 'other';
}

export function matchMember(fileName: string, members: CensusMember[]): CensusMember | null {
  const digits = fileName.replace(/\D/g, '');
  for (const m of members) {
    const eid = (m.emiratesId ?? '').replace(/\D/g, '');
    if (eid.length === 15 && digits.includes(eid)) return m;
  }
  const lower = fileName.toLowerCase();
  for (const m of members) {
    const tokens = m.name.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
    if (tokens.length && tokens.every((tok) => lower.includes(tok))) return m;
  }
  return null;
}

export interface IncomingDoc {
  fileName: string;
  sizeBytes: number;
  mime?: string;
}

export function buildDocuments(incoming: IncomingDoc[], members: CensusMember[]): SupportDocument[] {
  return incoming.map((f, i) => {
    const type = classifyDocument(f.fileName, f.mime);
    const matched = matchMember(f.fileName, members);
    return {
      id: `DOC-${Date.now().toString(36)}-${i}`,
      fileName: f.fileName,
      type,
      memberId: matched?.id,
      memberName: matched?.name,
      status: matched ? 'linked' : 'unmatched',
      receivedAt: new Date().toISOString(),
      sizeBytes: f.sizeBytes,
    } satisfies SupportDocument;
  });
}

export interface CompletenessRow {
  memberId: string;
  memberName: string;
  underwritingStatus: CensusMember['underwritingStatus'];
  requiredType: SupportDocType;
  satisfied: boolean;
}

// Every life held at the underwriter desk (or flagged) needs a supporting declaration before
// the case can be cleared. The register reports which of those are present in the ingested set.
export function completenessQueue(members: CensusMember[], documents: SupportDocument[]): CompletenessRow[] {
  const needing = members.filter((m) => m.underwritingStatus === 'underwriter-desk' || m.underwritingStatus === 'flagged-review');
  return needing.map((m) => {
    const requiredType = REQUIRED_FOR_DESK[0];
    const satisfied = documents.some((d) => d.memberId === m.id && d.type === requiredType);
    return { memberId: m.id, memberName: m.name, underwritingStatus: m.underwritingStatus, requiredType, satisfied };
  });
}

export function docTypeLabelKey(type: SupportDocType): string {
  return `type.${type}`;
}
