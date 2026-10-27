import { NextRequest, NextResponse } from 'next/server';
import { censusStats } from '@/lib/census/engine';
import { searchBudgetTarget, type BudgetBasis } from '@/lib/rating/budget';
import { guard } from '@/lib/apiGuard';
import type { CensusMember, PlanBenefitConfig } from '@/types/quote';

type Lang = 'en' | 'ar';

// networkTier is a data enum the rating engine keys off; only the display token is localized.
const TIER_LABEL: Record<Lang, Record<string, string>> = {
  en: { Essential: 'Essential', Comprehensive: 'Comprehensive', 'Premier Global': 'Premier Global' },
  ar: { Essential: 'الأساسية', Comprehensive: 'الشاملة', 'Premier Global': 'بريميير العالمية' },
};

function analyze(members: CensusMember[]) {
  const stats = censusStats(members);
  const autoFixable = members.flatMap((m) =>
    m.censusIssues
      .filter((i) => i.autoFixable)
      .map((i) => ({ memberId: m.id, name: m.name, code: i.code, severity: i.severity, fix: i.fix ?? i.message }))
  );
  const blocking = members.flatMap((m) =>
    m.censusIssues.filter((i) => i.severity === 'blocking' && !i.autoFixable).map((i) => ({ memberId: m.id, name: m.name, message: i.message }))
  );
  return { stats, autoFixable, blocking };
}

async function groqMessage(prompt: string, context: string, lang: Lang): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
  const maxTokens = Number(process.env.GROQ_MAX_TOKENS ?? 300);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `You are a UAE group-health census reconciliation copilot for an SME quoting engine. Be concise, factual, reference only the data given. Never invent member data. Always reply in ${lang === 'ar' ? 'Arabic' : 'English'}.`,
          },
          { role: 'user', content: `Census context:\n${context}\n\nInstruction: ${prompt}` },
        ],
      }),
      signal: controller.signal,
    });
    // On any upstream failure return null so the caller falls back to the deterministic
    // rule engine — never surface the API key, the raw prompt, or a thrown error to the UI.
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function localCommand(message: string, result: ReturnType<typeof analyze>, lang: Lang): string | null {
  const lower = message.toLowerCase();
  const ar = lang === 'ar';
  const s = result.stats;

  if (/^(status|الحالة)/.test(lower) || lower.includes('status')) {
    return ar
      ? `الحالة: ${s.total} عضوًا (${s.principals} رئيسيًا + ${s.dependants} تابعًا) — ${s.cleared} مقبولًا تلقائيًا، ${s.flagged} معلَّمًا، ${s.underwriter} في مكتب الاكتتاب. درجة الجودة ${s.quality}%.`
      : `Status: ${s.total} members (${s.principals} principals + ${s.dependants} dependants) — ${s.cleared} auto-cleared, ${s.flagged} flagged, ${s.underwriter} at the underwriter desk. Quality score ${s.quality}%.`;
  }

  if (lower.includes('issue') || lower.includes('مشكلة') || lower.includes('مشاكل')) {
    if (!result.autoFixable.length && !result.blocking.length) return ar ? 'لا توجد مشاكل مفتوحة في التعداد الحالي.' : 'No open issues in the current census.';
    const repairs = result.autoFixable.filter((a) => a.severity !== 'info').length;
    const auto = result.autoFixable.map((a) => `${a.name}: ${a.fix}`).join(' | ') || (ar ? 'لا شيء' : 'none');
    const blocked = result.blocking.map((b) => `${b.name}: ${b.message}`).join(' | ') || (ar ? 'لا شيء' : 'none');
    return ar
      ? `قابلة للإصلاح التلقائي (${repairs} من ${s.issueCount} مشكلة معلَّمة): ${auto}. تحتاج تدخّلًا بشريًا (${result.blocking.length}): ${blocked}.`
      : `Auto-fixable (${repairs} of ${s.issueCount} flagged issues): ${auto}. Needs human input (${result.blocking.length}): ${blocked}.`;
  }

  // Without a Groq key every free-text question used to dead-end in "unsupported command".
  if (/how (many|much|clean|good|well)|\bquality\b|who is|who's|which member|كم عدد|كم\b/.test(lower)) {
    const names = result.blocking.map((b) => b.name);
    if (/underwrit|desk|medical/.test(lower)) {
      if (ar) {
        const desk = s.underwriter ? ` ${s.underwriter} حالة في مكتب الاكتتاب الطبي ومُستثناة من القسط المُسعَّر.` : ' لا توجد أي حالة في مكتب الاكتتاب الطبي الآن.';
        return `${names.length ? `تحتاج تدخّلًا بشريًا: ${names.join('، ')}.` : ''}${desk}`.trim();
      }
      const desk = s.underwriter ? ` ${s.underwriter} life(s) sit at the medical underwriter desk and are excluded from the rated premium.` : ' No life is at the medical underwriter desk right now.';
      return `${names.length ? `Needs human input: ${names.join(', ')}.` : ''}${desk}`.trim();
    }
    if (/human|review|manual|flag|escalat/.test(lower)) {
      const nameList = names.length && names.length <= 6 ? (ar ? `: ${names.join('، ')}` : `: ${names.join(', ')}`) : '';
      return ar
        ? `${s.flagged} عضوًا بحاجة لمراجعة بشرية${nameList}. ${s.total - s.flagged - s.underwriter} نظيفة بما يكفي للتسعير المباشر.`
        : `${s.flagged} member(s) need human review${nameList}. ${s.total - s.flagged - s.underwriter} are clean enough to straight-through price.`;
    }
    if (/dependant|spouse|child|wife|family|ابن|زوجة/.test(lower)) {
      return ar ? `${s.dependants} تابعًا مُغطّون بجانب ${s.principals} رئيسيًا.` : `${s.dependants} dependants are covered alongside ${s.principals} principals.`;
    }
    if (/principal|employee|staff|موظف/.test(lower)) {
      return ar ? `${s.principals} رئيسيًا من ${s.total} سجلًا.` : `${s.principals} principals out of ${s.total} records.`;
    }
    if (/clean|quality|valid|accura/.test(lower)) {
      return ar ? `جودة التعداد ${s.quality}% — ${s.cleared} من ${s.total} سجلًا اجتازت التحقق دون تدخّل.` : `Census quality is ${s.quality}% — ${s.cleared} of ${s.total} records cleared validation without intervention.`;
    }
    return ar
      ? `الأعداد: ${s.total} عضوًا، ${s.principals} رئيسيًا، ${s.dependants} تابعًا، ${s.issueCount} مشكلة معلَّمة، الجودة ${s.quality}%.`
      : `Counts: ${s.total} members, ${s.principals} principals, ${s.dependants} dependants, ${s.issueCount} flagged issues, ${s.quality}% quality.`;
  }
  return null;
}

const BASIS_COPY: Record<BudgetBasis, Record<Lang, string>> = {
  monthlyTotal: { en: 'monthly total premium', ar: 'إجمالي القسط الشهري' },
  perEmployeeMonth: { en: 'monthly cost per employee', ar: 'تكلفة كل موظف شهريًا' },
  annualTotal: { en: 'annual total premium', ar: 'إجمالي القسط السنوي' },
};

function parseBudgetRequest(message: string): { targetAED: number; basis: BudgetBasis } | null {
  const text = message.toLowerCase();
  if (!/budget|under|below|less than|no more than|at most|ceiling|cap\b|target|أقل من|بأقل من|تحت|في حدود|سقف|اهداف|هدف/.test(text)) return null;
  const numMatch = text.match(/(\d[\d,\s]*(?:\.\d+)?)\s*(k\b|ألف|الف|آلاف)?/);
  if (!numMatch) return null;
  let amount = Number(numMatch[1].replace(/[,\s]/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (/^k$|ألف|الف|آلاف/.test((numMatch[2] ?? '').trim())) amount *= 1000;
  let basis: BudgetBasis = 'monthlyTotal';
  if (/annual|per year|yearly|سنوي/.test(text)) basis = 'annualTotal';
  else if (/per (employee|staff|member|head|life)|لكل (موظف|فرد|مسؤول)/.test(text)) basis = 'perEmployeeMonth';
  return { targetAED: Math.round(amount), basis };
}

function budgetCommand(message: string, members: CensusMember[], config: PlanBenefitConfig | undefined, lang: Lang): string | null {
  if (members.length === 0 || !config) return null;
  const req = parseBudgetRequest(message);
  if (!req) return null;
  const ar = lang === 'ar';
  try {
    const res = searchBudgetTarget(members, config, req.basis, req.targetAED);
    const copy = BASIS_COPY[req.basis][lang];
    const money = (n: number) => (ar ? `${Math.round(n).toLocaleString('en-US')} درهم` : `AED ${Math.round(n).toLocaleString()}`);
    const valueOf = (o: (typeof res.options)[number]) =>
      req.basis === 'annualTotal' ? o.annualTotalAED : req.basis === 'perEmployeeMonth' ? o.perEmployeeMonthAED : o.monthlyTotalAED;

    if (res.shortfall) {
      const c = res.shortfall.cheapest;
      if (ar) {
        const excl = c.excludedLives ? ` ${c.excludedLives} حالة مُحتجزة للاكتتاب أو لبيانات ناقصة وخارجة عن هذا السعر.` : '';
        return `لا توجد خطة متوافقة تناسب سقف ${money(res.targetAED)} (${copy}). أرخص خطة مسموحة بالقواعد هي ${money(valueOf(c))} — أي بتجاوز قدره نحو ${money(res.shortfall.gapAED)} عن سقفك، ومع ذلك لا تتجاوز تغطيتها ${c.coverageIndex}/100.${excl} راجع العوامل في حلّال الميزانية داخل شاشة إعداد الخطة.`;
      }
      return `No compliant plan fits a ${money(res.targetAED)} ${copy}. The cheapest rule-allowed plan is ${money(valueOf(c))} — about ${money(res.shortfall.gapAED)} over your ceiling, and it still scores only ${c.coverageIndex}/100 on coverage. ${c.excludedLives ? `${c.excludedLives} life(s) are held for underwriting or missing data and are outside that price.` : ''} Review the levers on the Plan Configurator's budget solver.`;
    }

    const best = res.options.reduce((a, b) => (b.coverageIndex >= a.coverageIndex && valueOf(b) <= res.targetAED ? b : a), res.options[0]);
    const riders = `${best.config.includeDental ? (ar ? '، أسنان' : ', dental') : ''}${best.config.includeMaternity ? (ar ? '، أمومة' : ', maternity') : ''}`;
    if (ar) {
      const caveat = best.excludedLives ? ` ملاحظة: ${best.excludedLives} حالة في مكتب الاكتتاب أو بلا تاريخ ميلاد صالح، لذا ليست ضمن هذا القسط.` : '';
      return `ضمن سقف ${money(res.targetAED)} (${copy}) وجدت ${res.options.length} خطة متوافقة؛ ${res.withinBudget} من ${res.distinctPlans} تركيبة مسموحة بالقواعد تناسبه. أفضل تغطية هي ${money(valueOf(best))} بتغطية ${best.coverageIndex}/100 (${TIER_LABEL.ar[best.config.networkTier] ?? best.config.networkTier}، تحمل ${best.config.coPay}%، ${money(best.config.pharmacyLimit)} للأدوية${riders}).${caveat} افتح حلّال الميزانية في شاشة إعداد الخطة للمقارنة والتطبيق.`;
    }
    const caveat = best.excludedLives ? ` Note: ${best.excludedLives} life(s) sit at the underwriter desk or lack a usable DOB, so they are not in this premium.` : '';
    return `Within a ${money(res.targetAED)} ${copy} I found ${res.options.length} compliant plan(s); ${res.withinBudget} of ${res.distinctPlans} rule-allowed configurations fit. The best coverage is ${money(valueOf(best))} at ${best.coverageIndex}/100 (${best.config.networkTier}, ${best.config.coPay}% co-pay, ${money(best.config.pharmacyLimit)} pharmacy${riders}).${caveat} Open the budget solver on the Plan Configurator to compare and apply.`;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const { denied } = await guard(request, { limit: 60 });
  if (denied) return denied;
  const body = (await request.json()) as { message?: string; members?: CensusMember[]; config?: PlanBenefitConfig; locale?: string };
  const lang: Lang = body.locale === 'ar' ? 'ar' : 'en';
  const ar = lang === 'ar';
  const members = body.members ?? [];
  const result = analyze(members);
  const message = body.message?.trim();

  // Only non-info issues count in the headline so "auto-resolved" can never exceed what was flagged.
  const autoResolvable = result.autoFixable.filter((a) => a.severity !== 'info').length;
  const summary = message
    ? null
    : ar
      ? `حلّلت التعداد المرفوع (${result.stats.total} عضوًا). ${autoResolvable} من ${result.stats.issueCount} مشكلة معلَّمة قابلة للحل التلقائي من أنماط الهوية والإعلانات الراتبة؛ ${result.blocking.length} تحتاج تدخّلًا بشريًا${result.stats.underwriter ? `؛ ${result.stats.underwriter} حالة موجَّهة لمكتب الاكتتاب الطبي` : ''}.`
      : `I analyzed the uploaded census (${result.stats.total} members). ${autoResolvable} of the ${result.stats.issueCount} flagged issues can be auto-resolved from Emirates ID patterns and salary declarations; ${result.blocking.length} need human input${result.stats.underwriter ? `; ${result.stats.underwriter} life(s) routed to the medical underwriter desk` : ''}.`;

  const budgetReply = message ? budgetCommand(message, members, body.config, lang) : null;
  const deterministic = budgetReply ?? (message ? localCommand(message, result, lang) : null);
  const llmReply = message && !deterministic ? await groqMessage(message, JSON.stringify(result), lang) : null;

  return NextResponse.json({
    provider: llmReply ? `groq-${process.env.GROQ_MODEL ?? 'llama-3.3-70b'}` : 'rule-engine',
    reply:
      llmReply ??
      deterministic ??
      summary ??
      (ar
        ? 'أجيب فقط عن أسئلة التعداد من التحليل المباشر — جرّب "الحالة"، أو "اعرض المشاكل"، أو "من يحتاج مراجعة"، أو "اعرض تسعيرًا بأقل من 40 ألف"، أو "أصلح <الاسم>". تغييرات المنافع على شاشة إعداد الخطة.'
        : 'I only answer census questions from the live parse — try "status", "show issues", "who needs review", "quote me under 40k", or "fix <name>". Benefit changes are on the Plan Configurator screen.'),
    analysis: result,
  });
}
