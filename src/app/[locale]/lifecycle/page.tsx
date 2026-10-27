'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useQuoteStore } from '@/store/useQuoteStore';
import { WorkflowStepper } from '@/components/WorkflowStepper';
import { GitCompare, Plus, CheckCircle2, Calendar, RefreshCw, Info, Lock, Repeat } from 'lucide-react';

export default function LifecyclePage() {
  const t = useTranslations('Lifecycle');
  const { company, versions, currentVersionIndex, switchVersion, createNewVersion, census, currentRating, generateRenewal, setUaePassModalOpen } = useQuoteStore();

  const activeVersion = versions[currentVersionIndex] ?? versions[versions.length - 1];
  const expires = activeVersion ? new Date(new Date(activeVersion.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) : null;
  const isBound = activeVersion?.status === 'bound';

  const syncStatus = activeVersion?.salesforceSyncStatus;
  const syncCopy =
    syncStatus === 'synced' ? t('syncSynced')
      : syncStatus === 'mock-payload' ? t('syncMock')
        : syncStatus === 'error' ? t('syncError')
          : syncStatus === 'pending' ? t('syncPending')
            : t('syncIdle');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <WorkflowStepper current="configure" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>{`${t('crumbQuotes')} > ${company.companyName || 'SME'} >`}</span>
            <span className="text-brand font-bold">{t('diffMatrix')}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
            {activeVersion && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-bold">
                {t('active', { version: activeVersion.versionId })}
              </span>
            )}
            {activeVersion?.policyNumber && (
              <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-sm font-bold font-mono">
                {activeVersion.policyNumber}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5 max-w-2xl">{t('subtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={generateRenewal}
            disabled={versions.length === 0}
            className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 ${versions.length === 0 ? 'bg-slate-200 text-slate-400' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            <Repeat className="w-4 h-4" />
            {t('renew')}
          </button>
          <button
            onClick={() => setUaePassModalOpen(true)}
            disabled={versions.length === 0 || isBound}
            className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 ${versions.length === 0 || isBound ? 'bg-slate-200 text-slate-400' : 'bg-emerald-700 hover:bg-emerald-800 text-white'}`}
          >
            <Lock className="w-3.5 h-3.5" />
            {isBound ? t('issued') : t('issue')}
          </button>
          <button
            onClick={() => createNewVersion('Mid-term adjustment against current census')}
            disabled={currentRating.ratedLives === 0}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 ${currentRating.ratedLives === 0 ? 'bg-slate-200 text-slate-400' : 'bg-brand hover:bg-brand-dark text-white'}`}
          >
            <Plus className="w-4 h-4" />
            {t('newIteration')}
          </button>
        </div>
      </div>

      {versions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center space-y-3">
          <Info className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">{t('emptyTitle')}</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">{t('emptyBody')}</p>
          <Link href="/configure" className="inline-block mt-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-bold">{t('diffMatrix')}</Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block">{t('history')}</span>
                <span className="text-base font-bold text-slate-900">{versions.length}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand flex items-center justify-center font-bold text-sm">{versions.length}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block">{t('population')}</span>
                <span className="text-base font-bold text-slate-900">{t('censusRated', { census: census.length, rated: currentRating.ratedLives })}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">{currentRating.ratedLives}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block">{t('sync')}</span>
                <span className={`text-sm font-bold flex items-center gap-1 ${syncStatus === 'synced' ? 'text-emerald-600' : syncStatus === 'mock-payload' ? 'text-amber-600' : syncStatus === 'error' ? 'text-red-600' : 'text-slate-500'}`}>
                  <RefreshCw className="w-3.5 h-3.5" /> {syncCopy}
                </span>
                {activeVersion?.salesforceOppId && (
                  <span className="text-caption text-slate-400 font-mono block">
                    {activeVersion.salesforceAdapter === 'live' ? activeVersion.salesforceOppId : t('generatedId', { id: activeVersion.salesforceOppId })}
                  </span>
                )}
                <span className="text-caption text-slate-400 block">
                  {activeVersion ? t('adapterLine', { adapter: activeVersion.salesforceAdapter, store: activeVersion.persistence }) : t('snapshotToSync')}
                </span>
              </div>
              <CheckCircle2 className={`w-5 h-5 ${syncStatus === 'synced' ? 'text-emerald-600' : syncStatus === 'mock-payload' ? 'text-amber-500' : syncStatus === 'error' ? 'text-red-500' : 'text-slate-300'}`} />
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 block">{t('expiryLabel')}</span>
                <span className="text-base font-bold text-slate-900">{expires ? expires.toLocaleDateString() : '—'}</span>
              </div>
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-brand" />
                <h3 className="font-bold text-base text-slate-900">{t('diffMatrix')}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {versions.map((ver, idx) => {
                const isSelected = idx === currentVersionIndex;
                const base = versions[versions.length - 1];
                const premiumDelta = ver.annualTotalAED - base.annualTotalAED;
                const livesDelta = ver.totalLives - base.totalLives;
                const configDeltas = (['networkTier', 'coPay', 'pharmacyLimit', 'includeDental', 'includeMaternity'] as const)
                  .filter((k) => String(ver.config[k]) !== String(base.config[k]))
                  .map((k) => `${k}: ${base.config[k]} → ${ver.config[k]}`);
                return (
                  <div key={ver.versionId} onClick={() => switchVersion(idx)} className={`p-5 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'border-brand bg-blue-50/20 shadow-md ring-2 ring-brand/40' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${isSelected ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'}`}>{ver.versionId}</span>
                      <span className="text-xs text-slate-400">{new Date(ver.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xl font-bold text-slate-900">AED {ver.annualTotalAED.toLocaleString()}</div>
                    <div className="text-sm text-slate-500 mt-0.5">{t('perMemberMo', { amount: ver.monthlyPerEmployeeAED })}</div>

                    {isSelected ? (
                      <div className="mt-3 text-xs space-y-1 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                        {premiumDelta !== 0 && <p className="font-bold text-emerald-800">{t('deltaVs', { version: base.versionNumber })}: {premiumDelta > 0 ? '+' : ''}AED {premiumDelta.toLocaleString()}</p>}
                        {livesDelta !== 0 && <p className="text-emerald-700">{t('livesDelta', { count: livesDelta })}</p>}
                        {configDeltas.map((d) => <p key={d} className="text-emerald-700">{d}</p>)}
                        {premiumDelta === 0 && livesDelta === 0 && configDeltas.length === 0 && <p className="text-emerald-700">{t('identical')}</p>}
                      </div>
                    ) : (
                      <button className="w-full mt-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center justify-center gap-1">
                        <RefreshCw className="w-3 h-3" /> {t('switchVersion')}
                      </button>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-slate-400">{t('lblTier')}</span><span className="font-semibold text-slate-800">{ver.config.networkTier}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{t('lblCoPay')}</span><span className="font-semibold text-slate-800">{ver.config.coPay}%</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{t('lblRx')}</span><span className="font-semibold text-slate-800">AED {ver.config.pharmacyLimit.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{t('lblVatFee')}</span><span className="font-semibold text-slate-800">AED {ver.vatAED.toLocaleString()} / {ver.policyFeeAED}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{t('lblLives')}</span><span className="font-semibold text-slate-800">{ver.totalLives}</span></div>
                    </div>
                    <div className="mt-3 p-2 bg-slate-50 rounded-lg text-xs text-slate-600 italic">&ldquo;{ver.notes}&rdquo;</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
