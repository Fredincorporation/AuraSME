'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useRouter } from '@/i18n/navigation';
import { useQuoteStore } from '@/store/useQuoteStore';
import { WorkflowStepper } from '@/components/WorkflowStepper';
import type { SMECompanyDetails } from '@/types/quote';
import {
  Building2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function Step1CompanyPage() {
  const t = useTranslations('Company');
  const router = useRouter();
  const { company, updateCompany, bookType, setBookType } = useQuoteStore();

  const [formData, setFormData] = useState({
    companyName: company.companyName,
    tradeLicense: company.tradeLicense,
    emirate: company.emirate,
    zoneType: company.zoneType,
    industry: company.industry,
    hrContactName: company.hrContactName,
    hrContactEmail: company.hrContactEmail,
    hrContactPhone: company.hrContactPhone,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompany(formData);
    router.push('/census');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-28">
      {/* Top Stepper */}
      <WorkflowStepper current="company" />

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {t('title')}
              </h1>
              <span className="px-2.5 py-1 bg-blue-50 text-brand text-caption font-bold rounded-full uppercase">
                {t('portalRef')}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {t('subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Book Type — SME group or a single-life Individual contract */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">{t('bookType')}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBookType('SME')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${bookType === 'SME' ? 'bg-brand text-white border-brand' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'}`}
                >
                  {t('bookSME')}
                </button>
                <button
                  type="button"
                  onClick={() => setBookType('Individual')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${bookType === 'Individual' ? 'bg-brand text-white border-brand' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'}`}
                >
                  {t('bookIndividual')}
                </button>
              </div>
              <p className="text-micro text-slate-400">
                {bookType === 'Individual' ? t('bookIndividualHint') : t('bookSMEHint')}
              </p>
            </div>

            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800">{t('companyName')}</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand"
                  required
                />
                <Building2 className="w-4 h-4 text-slate-400 absolute end-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Trade License */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">{t('tradeLicense')}</label>
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-micro font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {t('verifiedWithDed')}
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={formData.tradeLicense}
                  onChange={(e) => setFormData({ ...formData, tradeLicense: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-4 py-3 rounded-xl border border-slate-200 uppercase font-mono font-semibold focus:outline-hidden focus:border-brand"
                  required
                />
              </div>
            </div>

            {/* Emirate & Zone Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">{t('emirate')}</label>
                <select
                  value={formData.emirate}
                  onChange={(e) =>
                    setFormData({ ...formData, emirate: e.target.value as SMECompanyDetails['emirate'] })
                  }
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand"
                >
                  <option value="Dubai">{t('emirateDubai')}</option>
                  <option value="Abu Dhabi">{t('emirateAbuDhabi')}</option>
                  <option value="Sharjah">{t('emirateSharjah')}</option>
                  <option value="Other">{t('emirateOther')}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">{t('zoneType')}</label>
                <select
                  value={formData.zoneType}
                  onChange={(e) =>
                    setFormData({ ...formData, zoneType: e.target.value as SMECompanyDetails['zoneType'] })
                  }
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand"
                >
                  <option value="Freezone">{t('zoneFreezone')}</option>
                  <option value="Mainland">{t('zoneMainland')}</option>
                </select>
              </div>
            </div>

            {/* Industry & HR Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">{t('industry')}</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">{t('signatory')}</label>
                <input
                  type="text"
                  value={formData.hrContactName}
                  onChange={(e) => setFormData({ ...formData, hrContactName: e.target.value })}
                  className="w-full bg-slate-50 focus:bg-white text-slate-900 text-xs px-4 py-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-200">
              <Link
                href="/"
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                {t('cancel')}
              </Link>
              <button
                type="submit"
                className="px-6 py-3 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all"
              >
                <span>{t('continue')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: Regulatory & Compliance Helper (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-brand" />
              <h3 className="font-bold text-sm text-slate-900">{t('mandatesTitle')}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('mandatesBody')}
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-white rounded-xl border border-blue-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">{t('salaryTierTitle')}</strong>
                  <p className="text-caption text-slate-500 mt-0.5">
                    {t('salaryTierBody')}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-blue-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">{t('kycTitle')}</strong>
                  <p className="text-caption text-slate-500 mt-0.5">
                    {t('kycBody')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
