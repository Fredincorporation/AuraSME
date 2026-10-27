'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useQuoteStore } from '@/store/useQuoteStore';
import { apiFetch } from '@/lib/apiClient';
import { WorkflowStepper } from '@/components/WorkflowStepper';
import {
  ShieldCheck,
  Download,
  Lock,
  GitCompare,
  Info,
  Database,
  Cpu,
  KeyRound,
  FileSignature,
} from 'lucide-react';

interface GovernanceControlView {
  id: string;
  ok: boolean;
  key: string;
  params: Record<string, string | number>;
}
interface GovernanceView {
  controls: GovernanceControlView[];
  aiProvider: string;
  piiLeavesServer: boolean;
  persistenceBackend: string;
}

const CONTROL_ICON: Record<string, React.ReactNode> = {
  'pii-processing': <Database className="w-4 h-4" />,
  'llm-disclosure': <Cpu className="w-4 h-4" />,
  'secret-scope': <KeyRound className="w-4 h-4" />,
  'storage-residency': <Database className="w-4 h-4" />,
  consent: <FileSignature className="w-4 h-4" />,
};

export default function QuoteSummaryPage() {
  const t = useTranslations('Summary');
  const tc = useTranslations('Compliance');
  const tg = useTranslations('Governance');
  const { company, census, activeConfig, complianceReport, currentRating, setUaePassModalOpen, createNewVersion, versions, lastParsedAt } = useQuoteStore();

  const [governance, setGovernance] = React.useState<GovernanceView | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    apiFetch('/api/governance')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.controls)) setGovernance(data as GovernanceView);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const pricing = currentRating;
  const issued = versions.length ? new Date(versions[versions.length - 1].createdAt) : lastParsedAt ? new Date(lastParsedAt) : null;
  const expires = issued ? new Date(issued.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
  const excludedNames = census.filter((m) => m.underwritingStatus === 'underwriter-desk' || pricing.members.every((r) => r.memberId !== m.id)).map((m) => m.name);

  if (pricing.ratedLives === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <WorkflowStepper current="summary" />
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center space-y-3">
          <Info className="w-10 h-10 text-slate-300 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">{t('noRating')}</h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto">{t('noRatingBody')}</p>
          <Link href="/census" className="inline-block mt-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-bold">
            {t('goCensus')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-28">
      <WorkflowStepper current="summary" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">{`${t('crumbQuotes')} > ${company.companyName || 'SME'} >`}</span>
            <span className="text-emerald-600 font-bold">{t('liveQuoteTitle')}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{t('title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('subtitle')}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/lifecycle" className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold flex items-center gap-1.5">
            <GitCompare className="w-4 h-4 text-slate-500" />
            {t('versionDiff')}
          </Link>
          <button onClick={() => window.print()} className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold flex items-center gap-1.5">
            <Download className="w-4 h-4 text-slate-500" />
            {t('officialPdf')}
          </button>
          <button
            onClick={() => {
              if (versions.length === 0) createNewVersion('Final offer for bind');
              setUaePassModalOpen(true);
            }}
            className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            {t('bindViaUaePass')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand text-white flex items-center justify-center font-bold text-xl">C</div>
            <div>
              <span className="font-bold text-base text-slate-900">{t('brandName')}</span>
              <p className="text-sm text-slate-500">{t('brandSub')}</p>
            </div>
          </div>
          <div className="sm:text-end space-y-0.5 text-sm text-slate-600">
            <div>{t('quoteRef')} <strong className="text-slate-900 font-mono">AURA-{issued?.getFullYear() ?? 'DRAFT'}-{String(versions.length || 1).padStart(4, '0')}</strong></div>
            <div>
              {issued && expires ? (
                <>{t('issuedLabel')}: {issued.toLocaleDateString()} · {t('expiresLabel')} ({expires.toLocaleDateString()})</>
              ) : (
                <>{t('draftStamp')}</>
              )}
            </div>
            <div className="text-emerald-600 font-semibold flex items-center sm:justify-end gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {complianceReport.ok ? t('complianceOk') : t('compliancePending')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 text-sm">
          <div>
            <span className="text-slate-400 font-semibold uppercase text-xs block">{t('clientSme')}</span>
            <span className="font-bold text-slate-900 block mt-0.5">{company.companyName || '—'}</span>
            <span className="text-slate-500">{t('licenseLabel', { license: company.tradeLicense || '—', emirate: company.emirate })}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase text-xs block">{t('insuredPop')}</span>
            <span className="font-bold text-slate-900 block mt-0.5">{t('ratedLives', { count: pricing.ratedLives })}</span>
            <span className="text-slate-500">{t('pendingUw', { count: pricing.excludedLives })}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase text-xs block">{t('selectedNetwork')}</span>
            <span className="font-bold text-brand block mt-0.5">{activeConfig.networkTier === 'Essential' ? t('tierEssential') : activeConfig.networkTier === 'Comprehensive' ? t('tierComprehensive') : t('tierPremier')}</span>
            <span className="text-slate-500">{t('networkValue', { coPay: activeConfig.coPay, rx: activeConfig.pharmacyLimit.toLocaleString() })}</span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-bold text-base text-slate-900 uppercase tracking-wider">{t('benefitSchedule')}</h3>
          <table className="w-full text-start text-sm border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100/80 text-slate-700 font-bold">
              <tr>
                <th className="py-2.5 px-3">{t('thCategory')}</th>
                <th className="py-2.5 px-3">{t('thStandard')}</th>
                <th className="py-2.5 px-3">{t('thProvision')}</th>
                <th className="py-2.5 px-3 text-end">{t('thStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complianceReport.findings.map((f) => (
                <tr key={f.ruleId}>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{tc(`rules.${f.ruleId}.label`)}</td>
                  <td className="py-2.5 px-3 text-slate-500">{tc(`rules.${f.ruleId}.citation`)}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">{tc(`detail.${f.detailKey}`, f.detailParams)}</td>
                  <td className={`py-2.5 px-3 text-end font-bold ${f.ok ? 'text-emerald-600' : 'text-red-600'}`}>{f.ok ? (f.autoFixed ? t('stAutoAligned') : t('stCompliant')) : t('stViolation')}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-800">{t('supplementalRiders')}</td>
                <td className="py-2.5 px-3 text-slate-500">{t('optional')}</td>
                <td className="py-2.5 px-3 font-medium text-slate-900">
                  {[activeConfig.includeDental && t('riderDental'), activeConfig.includeOptical && t('riderOptical'), activeConfig.wellnessRider && t('riderWellness')].filter(Boolean).join(' • ') || t('noneSelected')}
                </td>
                <td className="py-2.5 px-3 text-end text-emerald-600 font-bold">{t('active')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 space-y-2">
          <div className="grid grid-cols-2 text-sm">
            <span className="text-slate-600">{t('netAnnual')}</span>
            <span className="text-end font-semibold">AED {Math.round(pricing.netAnnual).toLocaleString()}</span>
            <span className="text-slate-600">{t('vatLine')}</span>
            <span className="text-end font-semibold">AED {Math.round(pricing.vatAED).toLocaleString()}</span>
            <span className="text-slate-600">{t('feeLine')}</span>
            <span className="text-end font-semibold">AED {pricing.policyFeeAED.toLocaleString()}</span>
          </div>
          <div className="flex items-end justify-between border-t border-blue-200 pt-3 mt-2">
            <div>
              <span className="text-xs uppercase font-bold text-brand tracking-wider block">{t('totalLine')}</span>
              <div className="text-3xl font-extrabold text-slate-900">
                AED {Math.round(pricing.annualTotalAED).toLocaleString()}
                <span className="text-sm font-normal text-slate-500"> / {t('annual')}</span>
              </div>
            </div>
            <span className="text-sm text-slate-600">{t('ratedTimesTier', { count: pricing.ratedLives, tier: activeConfig.networkTier })}</span>
          </div>
        </div>

        {excludedNames.length > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
            {t('breakdownExcluded', { count: excludedNames.length, names: excludedNames.join(', ') })}
          </p>
        )}

        <div className="space-y-2">
          <h3 className="font-bold text-base text-slate-900 uppercase tracking-wider">{t('breakdownTitle')}</h3>
          {pricing.members.map((m) => (
            <div key={m.memberId} className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-slate-100 pb-1.5">
              <div>
                <span className="font-semibold text-slate-800">{m.name}</span>
                <span className="text-xs text-slate-400 ms-2">{m.components.join(' · ')}</span>
              </div>
              <span className="font-mono text-slate-700">{t('perMonth', { amount: m.monthly.toFixed(2) })}</span>
            </div>
          ))}
        </div>

        <GovernancePanel governance={governance} tg={tg} />
      </div>
    </div>
  );
}

function GovernancePanel({ governance, tg }: { governance: GovernanceView | null; tg: ReturnType<typeof useTranslations> }) {
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-base text-slate-900 uppercase tracking-wider">{tg('title')}</h3>
      <p className="text-caption text-slate-500">{tg('intro')}</p>
      {!governance ? (
        <p className="text-xs text-slate-400">{tg('loading')}</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {governance.controls.map((c) => (
            <li key={c.id} className={`flex items-start gap-3 p-3 rounded-xl border ${c.ok ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <span className={`mt-0.5 ${c.ok ? 'text-emerald-600' : 'text-amber-600'}`}>{CONTROL_ICON[c.id] ?? <ShieldCheck className="w-4 h-4" />}</span>
              <div className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">{tg(`control.${c.id}`)}</span>
                <span className="block text-xs text-slate-600">{tg(`detail.${c.key}`, c.params)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
