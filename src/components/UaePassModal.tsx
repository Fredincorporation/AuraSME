'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuoteStore } from '@/store/useQuoteStore';
import { ShieldCheck, CheckCircle2, Lock, ArrowRight, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export const UaePassModal = () => {
  const t = useTranslations('Bind');
  const { isUaePassModalOpen, setUaePassModalOpen, company, activeConfig, versions, currentVersionIndex, markBound } = useQuoteStore();
  const [step, setStep] = useState<'auth' | 'signing' | 'completed'>('auth');

  const activeVersion = versions[currentVersionIndex] ?? versions[versions.length - 1];

  if (!isUaePassModalOpen) return null;

  const handleAuth = () => {
    setStep('signing');
    setTimeout(() => {
      setStep('completed');
      if (activeVersion) {
        const year = new Date().getFullYear();
        const policyNumber = activeVersion.policyNumber ?? `CIG-${year}-POL-${String(activeVersion.versionNumber).padStart(5, '0')}`;
        markBound(activeVersion.versionId, policyNumber);
      }
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {
        // no-op
      }
    }, 2000);
  };

  const handleClose = () => {
    setStep('auth');
    setUaePassModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-red-700 via-emerald-800 to-black p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center font-black text-sm">
              UAE
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide">UAE PASS | الهوية الرقمية</span>
              <p className="text-micro text-white/80">{t('brandTagline')}</p>
            </div>
          </div>
          <span className="text-micro bg-white/20 px-2 py-0.5 rounded-full font-semibold">
            {t('certifiedSignatory')}
          </span>
        </div>

        <div className="p-6">
          {step === 'auth' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900">{t('uaePassTitle')}</h3>
                <p className="text-xs text-slate-500">
                  {t('bindForCompany', { company: company.companyName })}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{t('signatory')}:</span>
                  <span className="font-semibold text-slate-900">{company.hrContactName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t('tradeLicense')}:</span>
                  <span className="font-semibold text-slate-900">{company.tradeLicense}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t('planTier')}:</span>
                  <span className="font-semibold text-slate-900">{activeConfig.networkTier}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t('coPay')}:</span>
                  <span className="font-semibold text-slate-900">{activeConfig.coPay}%</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-blue-50 text-brand rounded-xl text-xs">
                <Lock className="w-4 h-4 shrink-0" />
                <span>{t('simulatedNote')}</span>
              </div>

              <button
                onClick={handleAuth}
                className="w-full py-3 bg-brand hover:bg-brand-dark text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <span>{t('confirm')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          )}

          {step === 'signing' && (
            <div className="py-8 flex flex-col items-center text-center space-y-3">
              <Loader2 className="w-10 h-10 text-brand animate-spin" />
              <h4 className="font-bold text-sm text-slate-900">{t('verifying')}</h4>
              <p className="text-xs text-slate-500 max-w-xs">{t('verifyingBody')}</p>
            </div>
          )}

          {step === 'completed' && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-slate-900">{t('bound')}</h3>
                <p className="text-xs text-slate-500">{t('boundBody')}</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-start text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-emerald-800">{t('policyNumber')}:</span>
                  <span className="font-mono font-bold text-emerald-950">{activeVersion?.policyNumber ?? `CIG-${new Date().getFullYear()}-POL-${String(activeVersion?.versionNumber ?? 0).padStart(5, '0')}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-800">{t('effectiveDate')}:</span>
                  <span className="font-semibold text-emerald-950">{t('effectiveValue')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-800">{t('quoteRef')}:</span>
                  <span className="font-mono font-semibold text-emerald-950">{activeVersion?.quoteNumber ?? t('quotePending')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-800">{t('salesforceSync')}:</span>
                  <span className="font-semibold text-emerald-950">{t('closedWon')} {activeVersion?.salesforceAdapter === 'live' ? activeVersion?.salesforceOppId : `(${activeVersion?.salesforceOppId ?? '—'})`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-800">{t('paymentLabel')}:</span>
                  <span className="font-semibold text-emerald-950">{t('paymentIntent', { adapter: activeVersion?.salesforceAdapter === 'live' ? 'live' : 'mock' })}</span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                {t('backToDashboard')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
