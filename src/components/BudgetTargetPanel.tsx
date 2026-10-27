'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuoteStore } from '@/store/useQuoteStore';
import {
  BUDGET_GRID_SIZE,
  planKey,
  searchBudgetTarget,
  type BudgetBasis,
  type BudgetOption,
  type BudgetSearchResult,
} from '@/lib/rating/budget';
import { Check, ChevronDown, Info, Search, ShieldCheck, Target, X } from 'lucide-react';

const BASES: BudgetBasis[] = ['monthlyTotal', 'perEmployeeMonth', 'annualTotal'];
const BASIS_LABEL: Record<BudgetBasis, string> = {
  monthlyTotal: 'basisMonthlyTotal',
  perEmployeeMonth: 'basisPerEmployee',
  annualTotal: 'basisAnnualTotal',
};
const STRATEGY_LABEL: Record<BudgetOption['strategy'], string> = {
  maxCoverage: 'strategyMaxCoverage',
  balanced: 'strategyBalanced',
  lowestCost: 'strategyLowestCost',
};

const fmt = (n: number) => Math.round(n).toLocaleString();

function amountOf(
  prices: { monthlyTotalAED: number; perEmployeeMonthAED: number; annualTotalAED: number },
  basis: BudgetBasis
) {
  if (basis === 'annualTotal') return prices.annualTotalAED;
  if (basis === 'perEmployeeMonth') return prices.perEmployeeMonthAED;
  return prices.monthlyTotalAED;
}

export const BudgetTargetPanel = () => {
  const t = useTranslations('Configure');
  const { census, activeConfig, currentRating, updateConfig, pushAudit } = useQuoteStore();

  const [open, setOpen] = useState(false);
  const [basis, setBasis] = useState<BudgetBasis>('monthlyTotal');
  const [target, setTarget] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<BudgetSearchResult | null>(null);

  const livePrices = {
    monthlyTotalAED: currentRating.annualTotalAED / 12,
    perEmployeeMonthAED: currentRating.monthlyPerEmployeeAED,
    annualTotalAED: currentRating.annualTotalAED,
  };
  const activeKey = planKey(activeConfig);
  const searched = new Set(result ? [result.current.key, ...result.options.map((o) => o.key)] : []);
  const drifted = !!result && !searched.has(activeKey);

  function runSearch() {
    const value = Number(target);
    if (!Number.isFinite(value) || value <= 0) {
      setInvalid(true);
      setResult(null);
      return;
    }
    setInvalid(false);
    setPending(true);
    // Yield one frame so the pending state paints before the grid blocks the thread.
    window.setTimeout(() => {
      setResult(searchBudgetTarget(census, activeConfig, basis, value));
      setPending(false);
    }, 0);
  }

  function apply(option: BudgetOption) {
    updateConfig(option.config);
    pushAudit(
      'Budget Solver',
      `Applied ${t(STRATEGY_LABEL[option.strategy])}`,
      `${t(BASIS_LABEL[basis])} AED ${fmt(amountOf(option, basis))} against ceiling AED ${fmt(result?.targetAED ?? 0)}`,
      {
        actorKey: 'budgetSolver',
        key: 'budgetApplied',
        params: {
          strategy: t(STRATEGY_LABEL[option.strategy]),
          basis: t(BASIS_LABEL[basis]),
          amount: fmt(amountOf(option, basis)),
          ceiling: fmt(result?.targetAED ?? 0),
        },
      }
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center gap-3 text-start hover:border-brand/60 transition-colors"
      >
        <span className="w-9 h-9 rounded-xl bg-blue-50 text-brand flex items-center justify-center shrink-0">
          <Target className="w-5 h-5" />
        </span>
        <span className="flex-1">
          <span className="block font-bold text-sm text-slate-900">{t('budgetToggle')}</span>
          <span className="block text-xs text-slate-500">{t('budgetSub')}</span>
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-brand/30 p-5 shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-blue-50 text-brand flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-base text-slate-900">{t('budgetTitle')}</h3>
            <p className="text-sm text-slate-500 max-w-xl">{t('budgetSub')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 shrink-0"
          title={t('budgetClose')}
          aria-label={t('budgetClose')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <span className="text-sm font-semibold text-slate-700 block mb-1.5">{t('budgetBasis')}</span>
          <div className="grid grid-cols-3 gap-1.5">
            {BASES.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBasis(b)}
                className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-colors ${
                  basis === b ? 'border-brand bg-blue-50 text-brand' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t(BASIS_LABEL[b])}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="budget-ceiling" className="text-sm font-semibold text-slate-700 block mb-1.5">
            {t('budgetTarget')}
          </label>
          <div className="flex gap-2">
            <input
              id="budget-ceiling"
              type="number"
              min={1}
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:border-brand focus:ring-1 focus:ring-brand outline-none"
            />
            <button
              type="button"
              onClick={runSearch}
              disabled={pending}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-bold flex items-center gap-1.5 whitespace-nowrap"
            >
              {pending ? <Info className="w-4 h-4 animate-pulse" /> : <Search className="w-4 h-4" />}
              {pending ? t('budgetSearching', { grid: BUDGET_GRID_SIZE }) : t('budgetSearch')}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{t('budgetCurrent', { amount: fmt(amountOf(livePrices, basis)) })}</p>
        </div>
      </div>

      {invalid && <p className="text-xs font-semibold text-red-700 bg-red-50 rounded-xl px-3 py-2">{t('budgetInvalid')}</p>}
      {drifted && (
        <p className="text-xs font-semibold text-amber-800 bg-amber-50 rounded-xl px-3 py-2 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0" />
          {t('liveReRate')}
        </p>
      )}

      {result && !invalid && (
        <div className="space-y-3">
          {result.shortfall ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
              <h4 className="font-bold text-sm text-amber-900">{t('budgetShortfallTitle')}</h4>
              <p className="text-sm text-amber-800">
                {t('budgetShortfallBody', {
                  amount: fmt(amountOf(result.shortfall.cheapest, result.basis)),
                  gap: fmt(result.shortfall.gapAED),
                  excluded: result.shortfall.cheapest.excludedLives,
                })}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">{t('budgetFits', { fit: result.withinBudget, distinct: result.distinctPlans })}</p>
                <p className="text-xs text-slate-400">{t('budgetCompute', { grid: result.gridEvaluated, distinct: result.distinctPlans, ms: result.elapsedMs })}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {result.options.map((option) => {
                  const isActive = option.key === activeKey;
                  const delta = option.deltaVsCurrent.priceAED;
                  return (
                    <div
                      key={option.key}
                      className={`rounded-xl border p-4 space-y-3 flex flex-col ${isActive ? 'border-brand bg-blue-50/40 ring-1 ring-brand' : 'border-slate-200'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-brand">{t(STRATEGY_LABEL[option.strategy])}</span>
                        {isActive && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            {t('budgetActive')}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-xl font-extrabold text-slate-900 tracking-tight">AED {fmt(amountOf(option, result.basis))}</div>
                        <div className="text-xs text-slate-500">
                          {t('basisAnnualTotal')}: AED {fmt(option.annualTotalAED)}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>{t('budgetCoverage')}</span>
                          <span className="font-bold text-slate-800">{option.coverageIndex}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-brand rounded-full" style={{ width: `${option.coverageIndex}%` }} />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {t('budgetVsCurrent', { sign: delta >= 0 ? '+' : '−', amount: fmt(Math.abs(delta)) })}
                          {' · '}
                          {t('budgetCoverageDelta', { sign: option.deltaVsCurrent.coverage >= 0 ? '+' : '−', delta: Math.abs(option.deltaVsCurrent.coverage) })}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100">{option.config.networkTier}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100">{t('copayChip', { rate: option.config.coPay })}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100">{t('pharmacyChip', { amount: option.config.pharmacyLimit.toLocaleString() })}</span>
                        {(['includeDental', 'includeMaternity', 'includeOptical', 'wellnessRider'] as const)
                          .filter((field) => option.config[field])
                          .map((field) => (
                            <span key={field} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                              {field === 'includeDental' ? t('riderDental') : field === 'includeMaternity' ? t('riderMaternity') : field === 'includeOptical' ? t('riderOptical') : t('riderWellness')}
                            </span>
                          ))}
                      </div>
                      {option.mandated.length > 0 && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 rounded-lg p-2 space-y-0.5">
                          <div className="font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            {t('budgetMandated')}
                          </div>
                          {option.mandated.map((m) => (
                            <p key={m.ruleId}>
                              {m.ruleId}: {m.detail}
                            </p>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => apply(option)}
                        disabled={isActive}
                        className={`mt-auto w-full py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 ${
                          isActive ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-brand hover:bg-brand-dark text-white'
                        }`}
                      >
                        {isActive ? <Check className="w-4 h-4" /> : null}
                        {isActive ? t('budgetApplied') : t('budgetApply')}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{t('budgetCoverageMethod')}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
