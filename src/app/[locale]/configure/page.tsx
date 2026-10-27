'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useQuoteStore } from '@/store/useQuoteStore';
import { WorkflowStepper } from '@/components/WorkflowStepper';
import { BudgetTargetPanel } from '@/components/BudgetTargetPanel';
import type { NetworkTier, CoPayRate } from '@/types/quote';
import {
  ShieldCheck,
  ShieldAlert,
  Building2,
  ArrowRight,
  Layers,
  Info,
} from 'lucide-react';

export default function ConfigurePage() {
  const t = useTranslations('Configure');
  const ts = useTranslations('Summary');
  const tc = useTranslations('Compliance');
  const { company, census, activeConfig, updateConfig, complianceReport, currentRating, createNewVersion } = useQuoteStore();
  const pricing = currentRating;
  const hasCensus = census.length > 0;

  if (!hasCensus) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <WorkflowStepper current="configure" />
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center space-y-3">
          <Info className="w-10 h-10 text-slate-300 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">{t('noCensus')}</h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">{t('noCensusBody')}</p>
          <Link href="/census" className="inline-block mt-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-bold">
            {t('goCensus')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-28">
      <WorkflowStepper current="configure" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-brand font-bold uppercase text-xs">{t('liveReRate')}</span>
            <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-xs ${complianceReport.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
              {complianceReport.findings.length} {t('complianceFindings')}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{t('title')}</h1>
          <p className="text-sm text-slate-500 max-w-2xl mt-0.5">{t('subtitle')}</p>
        </div>

        <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900">{company.companyName || t('liveReRate')}</div>
            <div className="text-xs text-slate-500">{t('ratedLives', { rated: currentRating.ratedLives, excluded: currentRating.excludedLives })}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <BudgetTargetPanel />
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">{t('networkTier')}</h3>
                <p className="text-sm text-slate-500">{t('networkTierDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['Essential', 'Comprehensive', 'Premier Global'] as NetworkTier[]).map((tier) => {
                const isSelected = activeConfig.networkTier === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => updateConfig({ networkTier: tier })}
                    className={`p-3 rounded-xl border text-center transition-all ${isSelected ? 'border-brand bg-blue-50/50 text-brand font-bold ring-1 ring-brand' : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'}`}
                  >
                    <div className="text-sm">{tier === 'Essential' ? t('tierEssential') : tier === 'Comprehensive' ? t('tierComprehensive') : t('tierPremier')}</div>
                    <div className="text-xs text-slate-400 mt-1">{tier === 'Essential' ? t('tierDescEssential') : tier === 'Comprehensive' ? t('tierDescComprehensive') : t('tierDescPremier')}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">{t('coPay')}</h3>
                <p className="text-sm text-slate-500">{t('coPayDesc')}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([0, 10, 15, 20] as CoPayRate[]).map((rate) => {
                const isSelected = activeConfig.coPay === rate;
                return (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => updateConfig({ coPay: rate })}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${isSelected ? 'border-brand bg-brand text-white font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm'}`}
                  >
                    {t('coPayBtn', { rate })}
                  </button>
                );
              })}
            </div>

            <div className={`p-3 rounded-xl flex items-start gap-2.5 text-sm border ${complianceReport.ok ? 'bg-emerald-50/80 border-emerald-200/70 text-emerald-900' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {complianceReport.ok ? <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" /> : <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />}
              <div className="space-y-0.5">
                <strong>{t('complianceFindings')}:</strong>
                {complianceReport.findings.map((f) => (
                  <p key={f.ruleId} className={f.ok ? '' : 'text-red-700 font-semibold'}>
                    {f.ok ? '✓' : '✗'} {tc(`rules.${f.ruleId}.label`)} — {tc(`detail.${f.detailKey}`, f.detailParams)} <span className="text-xs opacity-70">({tc(`rules.${f.ruleId}.citation`)})</span>
                    {f.autoFixed && <span className="ms-1 text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">{t('autoAligned')}</span>}
                  </p>
                ))}
                {complianceReport.referrals.length > 0 && (
                  <p className="text-xs pt-1 border-t border-inherit opacity-80">
                    → {t('referralsNote', { count: complianceReport.referrals.length })}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900">{t('riders')}</h3>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex justify-between">
                <span>{t('pharmacy')}</span>
                <span className="font-bold text-brand">AED {activeConfig.pharmacyLimit.toLocaleString()}</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1500, 3000, 5000, 10000].map((limit) => (
                  <button key={limit} type="button" onClick={() => updateConfig({ pharmacyLimit: limit })} className={`py-1.5 rounded-lg border text-sm font-semibold ${activeConfig.pharmacyLimit === limit ? 'border-brand bg-blue-50 text-brand' : 'border-slate-200 text-slate-600'}`}>
                    AED {limit >= 1000 ? `${limit / 1000}k` : limit}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {([
                ['includeDental', t('riderDentalLabel'), t('riderDentalNote')],
                ['includeMaternity', t('riderMaternityLabel'), t('riderMaternityNote')],
                ['includeOptical', t('riderOpticalLabel'), t('riderOpticalNote')],
                ['wellnessRider', t('riderWellnessLabel'), t('riderWellnessNote')],
              ] as const).map(([key, label, note]) => (
                <label key={key} className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" checked={activeConfig[key]} onChange={(e) => updateConfig({ [key]: e.target.checked })} className="rounded text-brand focus:ring-brand" />
                  <div>
                    <div className="text-sm font-bold text-slate-900">{label}</div>
                    <div className="text-xs text-slate-500">{note}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#004a77] text-white rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-bold uppercase tracking-wider text-blue-200">{t('liveReRate')}</span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {t('subSecond')}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-sm text-slate-300">
                <span>{t('netPremium')}</span>
                <span>AED {Math.round(pricing.netAnnual).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-300">
                <span>{t('vat')}</span>
                <span>AED {Math.round(pricing.vatAED).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-300">
                <span>{t('policyFee')}</span>
                <span>AED {pricing.policyFeeAED.toLocaleString()}</span>
              </div>
              <div className="pt-3 mt-2 border-t border-white/10">
                <span className="text-sm text-slate-300 block">{t('totalPayable')}</span>
                <div className="text-3xl font-extrabold tracking-tight text-white mt-1">
                  AED {Math.round(pricing.annualTotalAED).toLocaleString()}
                </div>
                <div className="text-sm text-blue-200 mt-1">
                  {t('perEmployeeMonth', { amount: Math.round(pricing.monthlyPerEmployeeAED).toLocaleString(), rated: pricing.ratedLives })}
                </div>
              </div>
            </div>

            <button
              onClick={() => createNewVersion('Adjusted plan levers during live negotiation')}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-blue-300" />
              {t('snapshot')}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-2 text-sm">
            <h4 className="font-bold text-slate-900">{ts('breakdownTitle')}</h4>
            {pricing.members.slice(0, 6).map((m) => (
              <div key={m.memberId} className="flex justify-between border-b border-slate-100 pb-1 text-xs">
                <span className="font-semibold text-slate-800">{m.name} <span className="text-slate-400">{t('perAge', { age: m.age })}</span></span>
                <span className="font-mono">{t('perMonth', { amount: m.monthly.toFixed(0) })}</span>
              </div>
            ))}
            {pricing.members.length > 6 && <p className="text-xs text-slate-400">{t('moreLives', { count: pricing.members.length - 6 })}</p>}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-4 sm:px-6 lg:px-8 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-xs uppercase font-bold text-slate-400 block">{t('totalPayable')}</span>
              <span className="text-lg font-bold text-slate-900">
                AED {Math.round(pricing.annualTotalAED).toLocaleString()} <span className="text-sm text-slate-500 font-normal">{t('perYr')}</span>
              </span>
            </div>
            <div className="hidden md:block h-8 w-px bg-slate-200" />
            <div className="hidden md:block">
              <span className="text-xs uppercase font-bold text-slate-400 block">{t('planClass')}</span>
              <span className="text-sm font-semibold text-slate-800">{t('planClassValue', { tier: activeConfig.networkTier === 'Essential' ? t('tierEssential') : activeConfig.networkTier === 'Comprehensive' ? t('tierComprehensive') : t('tierPremier'), coPay: activeConfig.coPay })}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/lifecycle" className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm">{t('compareIters')}</Link>
            <button
              onClick={() => createNewVersion('Active offer ready for review')}
              className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-sm flex items-center gap-2"
            >
              {t('snapshot')}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
