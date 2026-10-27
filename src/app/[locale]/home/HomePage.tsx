'use client';

import React, { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  ArrowRight,
  CheckCircle2,
  CloudSync,
  Languages,
  TrendingUp,
  FileSpreadsheet,
  SlidersHorizontal,
  FileCheck2,
  Sparkles,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import type { DemoScenario } from '@/lib/demo/scenario';
import type { NetworkTier } from '@/types/quote';

const CO_PAY_PERCENT = 10;

const STEP_KEYS = [
  'census',
  'censusDesc',
  'levers',
  'leversDesc',
  'compliance',
  'complianceDesc',
  'bind',
  'bindDesc',
] as const;

export const HomePage = ({ scenario }: { scenario: DemoScenario }) => {
  const t = useTranslations('Home');
  const td = useTranslations('Dashboard');
  const locale = useLocale();
  const aed = (value: number) => Math.round(value).toLocaleString(locale);
  const [activeTier, setActiveTier] = useState<NetworkTier>('Comprehensive');
  const pricing = scenario.tiers.find((tier) => tier.tier === activeTier) ?? scenario.tiers[1];
  const tierLabel = (tier: NetworkTier) =>
    tier === 'Essential' ? td('tierEssential') : tier === 'Premier Global' ? td('tierPremier') : td('tierComprehensive');

  return (
    <div className="relative w-full overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-32 start-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-gradient-to-b from-brand/10 via-sky-100/40 to-transparent blur-3xl pointer-events-none rounded-full -z-10" />
      <div className="absolute top-80 end-0 w-96 h-96 bg-brand-accent/5 blur-3xl pointer-events-none rounded-full -z-10" />

      {/* ── HERO ───────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col items-start gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-subtle text-slate-800 text-xs shadow-layer-1">
              <span className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
              <span className="font-bold text-brand uppercase tracking-wide text-caption">
                {t('eyebrow')}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-ink-muted font-medium text-caption">{t('engine')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink tracking-tight leading-[1.15]">
              {t.rich('headline', {
                highlight: (chunks) => <span className="text-brand">{chunks}</span>,
              })}
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              {t('subtitle')}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 w-full sm:w-auto">
              <Link
                href="/company"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-brand text-white text-xs font-bold shadow-layer-2 hover:bg-brand-dark transition-colors group"
              >
                <span>{t('ctaPrimary')}</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                  aria-hidden
                />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-surface text-slate-800 hover:bg-canvas text-xs font-bold border-border shadow-layer-1 transition-colors"
              >
                <TrendingUp className="w-4 h-4 text-brand" aria-hidden />
                <span>{t('ctaSecondary')}</span>
              </Link>
            </div>

            {/* Trust badges */}
            <ul className="pt-4 flex flex-wrap items-center gap-y-3 gap-x-6 text-slate-600 text-xs">
              {[
                { icon: CheckCircle2, cls: 'text-brand-success', label: t('trust.dha') },
                { icon: CheckCircle2, cls: 'text-brand-success', label: t('trust.doh') },
                { icon: CloudSync, cls: 'text-brand', label: t('trust.salesforce') },
                { icon: Languages, cls: 'text-brand-accent', label: t('trust.bilingual') },
              ].map(({ icon: Icon, cls, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${cls}`} aria-hidden />
                  <span className="font-semibold uppercase tracking-wider text-caption">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Sample roster rated by the engine */}
          <div className="lg:col-span-5 relative">
            <div className="w-full bg-surface rounded-xl border-border shadow-layer-3 overflow-hidden p-6 sm:p-7 flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3 pb-3 bg-canvas -mx-7 -mt-7 px-7 pt-4 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-caption font-bold text-slate-600 tracking-wider uppercase ms-2">
                    {t('mock.pipeline')}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-success/10 text-brand-success text-micro font-bold uppercase border-brand-success/30 whitespace-nowrap">
                  {t('mock.engineTime', { ms: scenario.engineRunMs })}
                </span>
              </div>

              {/* Step 1 — census */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-lg bg-canvas border-border">
                <div className="w-9 h-9 rounded-lg bg-brand-success/10 text-brand-success flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" aria-hidden />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink">{t('mock.step1')}</span>
                    <span className="text-caption font-bold text-brand-success whitespace-nowrap">
                      {t('mock.step1Status', { quality: scenario.qualityAfterFix })}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {t('mock.step1Meta', {
                      rows: scenario.rosterRows,
                      issues: scenario.issuesFound,
                      fixes: scenario.autoFixesApplied,
                    })}
                  </p>
                </div>
              </div>

              {/* Step 2 — tier switcher */}
              <div className="flex flex-col gap-2.5 p-3.5 rounded-lg bg-canvas border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">{t('mock.step2')}</span>
                  <span className="text-xs text-brand font-bold">{tierLabel(pricing.tier)}</span>
                </div>
                <div
                  role="group"
                  aria-label={t('mock.step2')}
                  className="grid grid-cols-3 gap-1.5 p-1 bg-surface rounded-lg text-center border-border"
                >
                  {scenario.tiers.map((tier) => (
                    <button
                      key={tier.tier}
                      type="button"
                      aria-pressed={tier.tier === activeTier}
                      onClick={() => setActiveTier(tier.tier)}
                      className={`py-1.5 rounded-md text-xs font-bold transition-colors ${
                        tier.tier === activeTier
                          ? 'bg-brand text-white shadow-layer-1'
                          : 'text-slate-600 hover:text-ink'
                      }`}
                    >
                      {tierLabel(tier.tier)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-ink-muted">{t('mock.copay')}</span>
                  <span className="font-bold text-slate-800">{t('mock.copayValue', { copay: CO_PAY_PERCENT })}</span>
                </div>
              </div>

              {/* Step 3 — rated premium */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-brand-dark to-brand text-white flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-micro text-blue-100 uppercase tracking-wider font-bold">
                    {t('mock.premium')}
                  </span>
                  <span className="text-micro bg-white/20 px-2 py-0.5 rounded-full font-bold">
                    {t('mock.vat')}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight" data-numeric>
                    {t('mock.currency')} {aed(pricing.annualTotalAED)}
                  </span>
                  <span className="text-xs text-blue-100">/ {t('mock.year')}</span>
                </div>
                <div className="flex items-center justify-between text-blue-100 text-xs pt-1 border-t border-white/20">
                  <span data-numeric>
                    {t('mock.currency')} {pricing.monthlyPerEmployeeAED.toFixed(2)} / {t('mock.perEmpMonth')}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-300 text-caption font-bold">
                    <Zap className="w-3.5 h-3.5" aria-hidden />
                    {t('mock.bindReadiness', { rated: pricing.ratedLives, referred: pricing.excludedLives })}
                  </span>
                </div>
              </div>

              <Link
                href="/census"
                className="w-full py-2.5 bg-ink hover:bg-slate-800 text-white rounded-lg text-xs font-bold text-center transition-colors"
              >
                {t('mock.explore')}
              </Link>
              <p className="text-micro text-ink-muted text-center">{t('mock.sampleNote')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MEASURED STRIP ─────────────────── */}
      <section className="bg-surface border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: `${pricing.ratedLives} / ${scenario.members}`, label: t('stats.lives') },
              { value: `${scenario.qualityBeforeFix}%`, label: t('stats.firstPass') },
              { value: `${scenario.qualityAfterFix}%`, label: t('stats.afterFix') },
              { value: `AED ${aed(pricing.annualTotalAED)}`, label: t('stats.premium', { tier: tierLabel(pricing.tier) }) },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <dd className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight" data-numeric>
                  {value}
                </dd>
                <dt className="text-caption font-semibold uppercase tracking-wider text-ink-muted mt-1">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
          <p className="text-center text-caption text-ink-muted mt-6 max-w-3xl mx-auto">
            {t('stats.source', { rules: scenario.complianceRules })}
          </p>
        </div>
      </section>

      {/* ── PILLARS ────────────────────────── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-bold text-brand uppercase tracking-wider">
              {t('pillars.eyebrow')}
            </span>
            <h2 className="text-3xl font-bold text-ink tracking-tight">{t('pillars.title')}</h2>
            <p className="text-sm text-ink-muted">{t('pillars.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: FileSpreadsheet, tint: 'bg-brand/10 text-brand', key: 'census' },
              { icon: SlidersHorizontal, tint: 'bg-brand-success/10 text-brand-success', key: 'levers' },
              { icon: FileCheck2, tint: 'bg-purple-100 text-purple-700', key: 'lifecycle' },
            ].map(({ icon: Icon, tint, key }) => (
              <article
                key={key}
                className="p-6 rounded-xl bg-canvas border-border space-y-3 hover:shadow-layer-2 transition-shadow"
              >
                <div className={`w-12 h-12 rounded-lg ${tint} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" aria-hidden />
                </div>
                <h3 className="font-bold text-base text-ink">{t(`pillars.${key}.title`)}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{t(`pillars.${key}.body`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUR STEPS + QUOTE PREVIEW ─────── */}
      <section className="bg-surface border-y border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold text-brand uppercase tracking-wider">
                {t('steps.eyebrow')}
              </span>
              <h2 className="text-3xl font-bold text-ink tracking-tight">{t('steps.title')}</h2>
            </div>

            <ol className="space-y-5">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="flex items-start gap-3.5">
                  <span
                    className="w-7 h-7 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                    data-numeric
                  >
                    {i + 1}
                  </span>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-ink">{t(`steps.${STEP_KEYS[i * 2]}`)}</h3>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      {t(`steps.${STEP_KEYS[i * 2 + 1]}`)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Rated quote preview */}
          <div className="lg:col-span-6">
            <div className="bg-canvas rounded-xl border-border shadow-layer-2 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-surface">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-ink truncate">{t('preview.company')}</div>
                    <div className="text-caption text-ink-muted truncate">
                      {t('preview.location', { principals: scenario.principals, dependants: scenario.dependants })}
                    </div>
                  </div>
                </div>
                <span className="text-micro font-bold uppercase px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent border-brand-accent/30 whitespace-nowrap">
                  {t('preview.sample')}
                </span>
              </div>

              <dl className="divide-y divide-border text-xs">
                {[
                  { label: t('preview.network'), value: tierLabel(pricing.tier) },
                  { label: t('preview.pharmacy'), value: t('preview.pharmacyValue') },
                  { label: t('preview.territory'), value: t('preview.territoryValue') },
                  { label: t('preview.wellness'), value: t('preview.wellnessValue') },
                  { label: t('preview.referrals'), value: t('preview.referralValue', { referred: pricing.excludedLives, flagged: scenario.flaggedAfterFix }) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-4 px-5 py-3">
                    <dt className="text-ink-muted">{label}</dt>
                    <dd className="font-semibold text-ink text-end">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="px-5 py-4 bg-surface border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-micro uppercase font-bold text-ink-muted block">
                    {t('preview.indicativeCost')}
                  </span>
                  <span className="text-lg font-extrabold text-ink" data-numeric>
                    AED {aed(pricing.annualTotalAED)}
                  </span>
                </div>
                <Link
                  href="/configure"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-xs font-bold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden />
                  <span>{t('preview.customize')}</span>
                </Link>
              </div>
            </div>

            {/* Targets from the challenge brief, kept separate from measured output */}
            <div className="mt-4 p-4 rounded-lg bg-canvas border-border space-y-2">
              <span className="text-micro font-bold uppercase tracking-wider text-brand">{t('targets.eyebrow')}</span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <li className="text-caption text-ink flex items-start gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" aria-hidden />
                  {t('targets.turnaround')}
                </li>
                <li className="text-caption text-ink flex items-start gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" aria-hidden />
                  {t('targets.manualCases')}
                </li>
              </ul>
              <p className="text-micro text-ink-muted">{t('targets.note')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CLOSING CTA ────────────────────── */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            {t('closing.title')}
          </h2>
          <p className="text-sm text-ink-muted max-w-2xl mx-auto">{t('closing.body')}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link
              href="/company"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-layer-2 transition-colors"
            >
              <span>{t('ctaPrimary')}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
            </Link>
            <Link
              href="/lifecycle"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-surface border-border text-slate-800 hover:bg-canvas text-xs font-bold transition-colors"
            >
              <span>{t('closing.secondary')}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
