import * as XLSX from 'xlsx';
import type { CensusIssue, CensusMember, IssueCode } from '@/types/quote';

type SalaryBand = CensusMember['salaryBand'];
type Relationship = CensusMember['relationship'];
type Jurisdiction = CensusMember['jurisdiction'];

// Ingestion APIs price the roster directly from request bodies, so they need a ceiling.
export const MAX_CENSUS_ROWS = 2000;

const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'full name', 'employee name', 'fullname', 'employee', 'staff name', 'no', 's.no', 'sr no'],
  emiratesId: ['emirates id', 'eid', 'emiratesid', 'id', 'national id', 'emirates id no', 'uid'],
  dob: ['dob', 'date of birth', 'birth date', 'birthdate', 'dateofbirth'],
  gender: ['gender', 'sex', 'type'],
  relationship: ['relationship', 'relation', 'type of member', 'member type', 'category', 'class'],
  salary: ['salary', 'monthly salary', 'basic salary', 'gross salary', 'wage', 'pay'],
  nationality: ['nationality', 'nationality emirate', 'country'],
};

const RELATIONSHIP_MAP: Record<string, Relationship> = {
  principal: 'Principal', employee: 'Principal', emp: 'Principal', staff: 'Principal', self: 'Principal', '1': 'Principal',
  spouse: 'Spouse', wife: 'Spouse', husband: 'Spouse', partner: 'Spouse', '2': 'Spouse',
  child: 'Child', children: 'Child', son: 'Child', daughter: 'Child', kid: 'Child', minor: 'Child', '3': 'Child',
};

const JURISDICTION_MAP: Record<string, Jurisdiction> = {
  dubai: 'Dubai (DHA)', dha: 'Dubai (DHA)',
  'abu dhabi': 'Abu Dhabi (DOH)', abudhabi: 'Abu Dhabi (DOH)', doh: 'Abu Dhabi (DOH)', adh: 'Abu Dhabi (DOH)',
  sharjah: 'Northern Emirates (MOHAP)', mohap: 'Northern Emirates (MOHAP)', ajman: 'Northern Emirates (MOHAP)',
  rasalkhaimah: 'Northern Emirates (MOHAP)', Fujairah: 'Northern Emirates (MOHAP)', uaq: 'Northern Emirates (MOHAP)',
};

function normalizeKey(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[_\-.]/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapHeaders(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const [rawKey, value] of Object.entries(row)) {
      const nk = normalizeKey(rawKey);
      if (aliases.some((alias) => nk === alias || nk.includes(alias))) {
        if (out[canonical] === undefined || out[canonical] === '') out[canonical] = value;
      }
    }
  }
  return out;
}

export function deriveDobYearFromEid(eid?: string): number | null {
  if (!eid) return null;
  const digits = eid.replace(/\D/g, '');
  if (digits.length !== 15 || !digits.startsWith('784')) return null;
  const year = Number(digits.slice(3, 7));
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear) return null;
  return year;
}

export function parseEid(eid: string): { valid: boolean; dob?: string; gender?: 'M' | 'F' } {
  const digits = eid.replace(/\D/g, '');
  if (digits.length !== 15 || !digits.startsWith('784')) return { valid: false };
  const year = Number(digits.slice(3, 7));
  const genderDigit = Number(digits[11]);
  if (year < 1900 || year > new Date().getFullYear()) return { valid: false };
  const month = Number(digits.slice(7, 9));
  const day = Number(digits.slice(9, 11));
  const dob =
    month >= 1 && month <= 12 && day >= 1 && day <= 31
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : `${year}-01-01`;
  return { valid: true, dob, gender: genderDigit % 2 === 1 ? 'M' : 'F' };
}

// Spreadsheets hand back midnight-local Date objects; UTC slicing would shift every
// roster DOB one day earlier east of Greenwich and silently change ages.
function toLocalIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDob(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date && !isNaN(value.getTime())) return toLocalIso(value);
  if (typeof value === 'number' && value > 1 && value < 60000) {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(value).trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const year = Number(m[1]) > 30 ? 1900 + Number(m[1]) : 2000 + Number(m[1]);
    return `${year}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return toLocalIso(parsed);
  return null;
}

export function ageFromDob(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function bandFromSalary(salary?: number): SalaryBand | null {
  if (salary === undefined || salary === null || isNaN(salary) || salary <= 0) return null;
  if (salary > 20000) return 'Band A (>AED 20k)';
  if (salary >= 10000) return 'Band B (AED 10-20k)';
  return 'Band C (<AED 10k/Basic)';
}

function normalizeBand(value: unknown, salary?: number): { band: SalaryBand | null; inferred: boolean } {
  const v = normalizeKey(value);
  const direct: Record<string, SalaryBand> = {
    a: 'Band A (>AED 20k)', 'band a': 'Band A (>AED 20k)', 'band a (>aed 20k)': 'Band A (>AED 20k)',
    b: 'Band B (AED 10-20k)', 'band b': 'Band B (AED 10-20k)', 'band b (aed 10 20k)': 'Band B (AED 10-20k)',
    c: 'Band C (<AED 10k/Basic)', 'band c': 'Band C (<AED 10k/Basic)', 'basic': 'Band C (<AED 10k/Basic)',
  };
  if (direct[v]) return { band: direct[v], inferred: false };
  return { band: bandFromSalary(salary), inferred: true };
}

export interface ParseResult {
  members: CensusMember[];
  unmappedColumns: string[];
  mappedColumns: Record<string, string>;
  rowCount: number;
}

export function parseCensusWorkbook(data: ArrayBuffer): ParseResult {
  const wb = XLSX.read(data, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const rawHeaders = rows.length ? Object.keys(rows[0]) : [];
  const mappedColumns: Record<string, string> = {};
  for (const raw of rawHeaders) {
    const hit = mapHeaders({ [raw]: 'x' });
    for (const canonical of Object.keys(hit)) {
      if (!mappedColumns[canonical]) mappedColumns[canonical] = raw;
    }
  }
  const unmappedColumns = rawHeaders.filter((h) => !Object.values(mappedColumns).includes(h));

  const members: CensusMember[] = rows.map((row, idx) => {
    const m = mapHeaders(row);
    const name = String(m.name ?? '').trim();
    const eidRaw = String(m.emiratesId ?? '').trim();
    const eid = eidRaw && eidRaw !== '0' ? eidRaw : '';
    const salaryNum = m.salary !== '' && !isNaN(Number(m.salary)) ? Number(m.salary) : undefined;
    const dob = parseDob(m.dob) ?? undefined;
    const relRaw = normalizeKey(m.relationship);
    const relationship = RELATIONSHIP_MAP[relRaw] ?? (relRaw.includes('princip') || relRaw.includes('employ') ? 'Principal' : undefined);
    const genderRaw = normalizeKey(m.gender);
    const gender: 'M' | 'F' | undefined = genderRaw.startsWith('m') || genderRaw === 'male' ? 'M' : genderRaw.startsWith('f') || genderRaw === 'female' ? 'F' : undefined;
    const jurRaw = normalizeKey(m.nationality);
    const jurisdiction: Jurisdiction = JURISDICTION_MAP[jurRaw] ?? 'Dubai (DHA)';
    const band = normalizeBand(m.salaryBand ?? relRaw, salaryNum);

    return validateMember({
      id: `MEM-${String(idx + 1).padStart(3, '0')}`,
      name: name || `Row ${idx + 1}`,
      emiratesId: eid,
      dob,
      gender: gender ?? 'M',
      relationship: relationship ?? 'Principal',
      salaryBand: band.band ?? 'Band C (<AED 10k/Basic)',
      monthlySalary: salaryNum,
      jurisdiction,
      riskCategory: 'low',
      underwritingStatus: 'auto-cleared',
      censusIssues: [],
      age: dob ? ageFromDob(dob) : 0,
      fixesApplied: [],
    }, { inferBand: band.inferred && salaryNum !== undefined, eidRaw });
  });

  const householdPrincipalBand = members.find((m) => m.relationship === 'Principal' && m.monthlySalary !== undefined)?.salaryBand;
  for (const m of members) {
    if (m.relationship !== 'Principal' && m.monthlySalary === undefined && householdPrincipalBand) {
      m.salaryBand = householdPrincipalBand;
      m.censusIssues = [
        ...m.censusIssues,
        {
          code: 'BAND_INFERRED_FROM_SALARY' as const,
          key: 'BAND_INHERITED',
          message: `No declared salary; salary band inherited from the household principal (${householdPrincipalBand})`,
          severity: 'info' as const,
          autoFixable: false,
        },
      ];
    }
  }

  return { members, unmappedColumns, mappedColumns, rowCount: rows.length };
}

export function validateMember(member: CensusMember, ctx?: { inferBand?: boolean; eidRaw?: string }): CensusMember {
  const issues: CensusIssue[] = [];
  const next = { ...member, censusIssues: [] as CensusIssue[] };
  const eidDigits = (member.emiratesId ?? '').replace(/\D/g, '');

  if (!member.dob) {
    const year = deriveDobYearFromEid(member.emiratesId);
    if (year) {
      issues.push({
        code: 'DERIVED_FROM_EID',
        message: `Date of birth missing; birth year ${year} detected in Emirates ID sequence`,
        severity: 'warning',
        autoFixable: true,
        fix: `Set DOB to ${year}-01-01 (year derived from EID 784-${year}-...)`,
        params: { year },
      });
      next.underwritingStatus = 'flagged-review';
    } else {
      issues.push({
        code: 'MISSING_DOB',
        message: 'Date of birth missing and not derivable from Emirates ID',
        severity: 'blocking',
        autoFixable: false,
      });
      next.underwritingStatus = 'flagged-review';
    }
  } else {
    const year = Number(member.dob.slice(0, 4));
    const age = ageFromDob(member.dob);
    if (isNaN(age) || age <= 0 || age > 100) {
      issues.push({ code: 'INVALID_DOB', message: `Parsed DOB gives implausible age (${isNaN(age) ? 'unreadable' : age})`, severity: 'blocking', autoFixable: false, params: { age: isNaN(age) ? 'unreadable' : age } });
      next.underwritingStatus = 'flagged-review';
    } else if (member.relationship === 'Child' && age > 25) {
      issues.push({ code: 'CHILD_OVER_AGE', message: `Dependant marked as Child at age ${age}; verify relationship`, severity: 'warning', autoFixable: false, params: { age } });
      next.underwritingStatus = 'flagged-review';
    }
    void year;
  }

  if (!member.emiratesId) {
    issues.push({
      code: 'MISSING_EID',
      message: 'No Emirates ID on record (new joiner, visa in processing?)',
      severity: 'warning',
      autoFixable: true,
      fix: 'Provisional bind with 30-day EID grace period',
    });
    if (next.underwritingStatus === 'auto-cleared') next.underwritingStatus = 'flagged-review';
  } else if (eidDigits.length !== 15 || !eidDigits.startsWith('784')) {
    issues.push({ code: 'EID_PATTERN_MISMATCH', key: 'EID_FORMAT', message: `Emirates ID "${ctx?.eidRaw ?? member.emiratesId}" does not match UAE format 784-YYYY-NNNNNNN-D`, severity: 'blocking', autoFixable: false, params: { eid: ctx?.eidRaw ?? member.emiratesId } });
    next.underwritingStatus = 'flagged-review';
  } else if (member.dob) {
    const parsed = parseEid(member.emiratesId);
    if (parsed.dob && parsed.dob.slice(0, 4) !== member.dob.slice(0, 4)) {
      issues.push({ code: 'EID_PATTERN_MISMATCH', key: 'EID_YEAR_CONFLICT', message: `EID birth year ${parsed.dob.slice(0, 4)} contradicts declared DOB ${member.dob}`, severity: 'warning', autoFixable: false, params: { eidYear: parsed.dob.slice(0, 4), dob: member.dob } });
      next.underwritingStatus = 'flagged-review';
    }
  }

  if (ctx?.inferBand) {
    issues.push({ code: 'BAND_INFERRED_FROM_SALARY', key: 'BAND_INFERRED', message: `Salary band absent; assigned ${next.salaryBand} from declared monthly salary`, severity: 'info', autoFixable: true, fix: `Confirm band ${next.salaryBand}` });
  }

  next.censusIssues = issues;
  if (!issues.some((i) => i.severity !== 'info') && next.underwritingStatus === 'flagged-review') {
    next.underwritingStatus = 'auto-cleared';
  }
  return next;
}

export function dedupeMembers(members: CensusMember[]): CensusMember[] {
  const seen = new Map<string, string>();
  return members.map((m) => {
    const digits = (m.emiratesId ?? '').replace(/\D/g, '');
    if (digits.length === 15) {
      const first = seen.get(digits);
      if (first) {
        // Already flagged (the API dedupes before the UI does) — don't stack a second issue.
        if (m.censusIssues.some((i) => i.code === 'DUPLICATE_EID')) return m;
        return {
          ...m,
          underwritingStatus: 'flagged-review' as const,
          censusIssues: [...m.censusIssues, {
            code: 'DUPLICATE_EID' as const,
            message: `Duplicate Emirates ID — same member already present on ${first}`,
            severity: 'blocking' as const,
            autoFixable: false,
            params: { first },
          }],
        };
      }
      seen.set(digits, m.id);
    }
    return m;
  });
}

export function applyAutoFix(member: CensusMember, code: IssueCode): CensusMember {
  const issue = member.censusIssues.find((i) => i.code === code);
  if (!issue) return member;
  let next: CensusMember = { ...member };
  if (code === 'DERIVED_FROM_EID') {
    const year = deriveDobYearFromEid(member.emiratesId)!;
    next = { ...next, dob: `${year}-01-01`, age: ageFromDob(`${year}-01-01`) };
  }
  if (code === 'MISSING_EID') {
    next = { ...next, underwritingStatus: 'flagged-review' };
  }
  next.fixesApplied = [...next.fixesApplied, `${issue.code}: ${issue.fix ?? issue.message}`];
  next.censusIssues = next.censusIssues.filter((i) => i.code !== code);
  if (!next.censusIssues.some((i) => i.severity !== 'info')) {
    next.underwritingStatus = 'auto-cleared';
  }
  return next;
}

export function buildSampleCensus(): ArrayBuffer {
  const rows = [
    { 'S.No': 1, 'Employee Name': 'Ahmed Al-Falasi', 'Date of Birth': '12/04/1988', Gender: 'M', Relationship: 'Employee', 'Emirates ID': '784-1988-1249120-1', 'Monthly Salary': 24000, Nationality: 'Dubai' },
    { 'S.No': 2, 'Employee Name': 'Fatima Al-Falasi', 'Date of Birth': '24 Sep 1991', Gender: 'F', Relationship: 'Spouse', 'Emirates ID': '784-1991-8849201-2', 'Monthly Salary': '', Nationality: 'Dubai' },
    { 'S.No': 3, 'Employee Name': 'Vikram Malhotra', 'Date of Birth': '1982-11-03', Gender: 'M', Relationship: 'employee', 'Emirates ID': '784-1982-4491028-3', 'Monthly Salary': 15500, Nationality: 'Dubai' },
    { 'S.No': 4, 'Employee Name': 'Zainab Qasim', 'Date of Birth': '', Gender: 'F', Relationship: 'Employee', 'Emirates ID': '784-1994-3382910-4', 'Monthly Salary': 13200, Nationality: 'Dubai' },
    { 'S.No': 5, 'Employee Name': 'Omar Farooq', 'Date of Birth': '', Gender: 'M', Relationship: 'Employee', 'Emirates ID': '784-1990-2291049-5', 'Monthly Salary': 8500, Nationality: 'Abu Dhabi' },
    { 'S.No': 6, 'Employee Name': 'Rashid Khan', 'Date of Birth': '18/02/1979', Gender: 'M', Relationship: 'Employee', 'Emirates ID': '784-1979-9940129-6', 'Monthly Salary': 7800, Nationality: 'Abu Dhabi' },
    { 'S.No': 7, 'Employee Name': 'Elena Rostova', 'Date of Birth': '14-Aug-89', Gender: 'F', Relationship: 'Employee', 'Emirates ID': '784-1989-5510294-7', 'Monthly Salary': 21000, Nationality: 'Dubai' },
    { 'S.No': 8, 'Employee Name': 'David Miller', 'Date of Birth': '30/06/1986', Gender: 'M', Relationship: 'Employee', 'Emirates ID': '', 'Monthly Salary': 17500, Nationality: 'Dubai' },
    { 'S.No': 9, 'Employee Name': 'Yara Haddad', 'Date of Birth': '05/11/2001', Gender: 'F', Relationship: 'Child', 'Emirates ID': '784-2001-1120345-2', 'Monthly Salary': '', Nationality: 'Sharjah' },
    { 'S.No': 10, 'Employee Name': 'Khalid Al-Suwaidi', 'Date of Birth': '22/01/1975', Gender: 'M', Relationship: 'Employee', 'Emirates ID': '784-1975-6650912-3', 'Monthly Salary': 31000, Nationality: 'Abu Dhabi' },
    { 'S.No': 11, 'Employee Name': 'Priya Nair', 'Date of Birth': '09/03/1990', Gender: 'f', Relationship: 'wife', 'Emirates ID': '784-1990-4471208-4', 'Monthly Salary': '', Nationality: 'Dubai' },
    { 'S.No': 12, 'Employee Name': 'Mohammed Aziz', 'Date of Birth': '1993-07-19', Gender: 'M', Relationship: 'Employee', 'Emirates ID': '784-1993-2210578-1', 'Monthly Salary': 9200, Nationality: 'Dubai' },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Census Q3');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as unknown as ArrayBuffer;
}

export function bandLabelKey(band: CensusMember['salaryBand']): string {
  if (band.startsWith('Band A')) return 'bandA';
  if (band.startsWith('Band B')) return 'bandB';
  return 'bandC';
}

export function relLabelKey(rel: CensusMember['relationship']): string {
  return rel === 'Principal' ? 'relPrincipal' : rel === 'Spouse' ? 'relSpouse' : 'relChild';
}

export function censusStats(members: CensusMember[]) {
  const principals = members.filter((m) => m.relationship === 'Principal').length;
  const dependants = members.length - principals;
  const flagged = members.filter((m) => m.underwritingStatus === 'flagged-review').length;
  const underwriter = members.filter((m) => m.underwritingStatus === 'underwriter-desk').length;
  const cleared = members.length - flagged - underwriter;
  const issueCount = members.reduce((sum, m) => sum + m.censusIssues.filter((i) => i.severity !== 'info').length, 0);
  // Info rows (e.g. the salary-band inference) are already applied during parsing, so
  // counting them would advertise a repair backlog that is larger than the issue count.
  const autoFixable = members.reduce((sum, m) => sum + m.censusIssues.filter((i) => i.autoFixable && i.severity !== 'info').length, 0);
  const quality = members.length ? Math.round((cleared / members.length) * 100) : 0;
  return { total: members.length, principals, dependants, flagged, underwriter, cleared, issueCount, autoFixable, quality };
}
