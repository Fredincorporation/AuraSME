'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useQuoteStore } from '@/store/useQuoteStore';
import { apiFetch } from '@/lib/apiClient';
import { censusStats } from '@/lib/census/engine';
import type { FunnelMetrics, QuoteStatus } from '@/types/quote';
import {
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
  Search,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const ta = useTranslations('Audit');
  const { locale, company, census, versions, currentRating, auditLog, lastParsedAt, lastReRateMs, sourceFileName, funnel, setFunnel } = useQuoteStore();
  const [filterStatus, setFilterStatus] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Pull the real persisted funnel from /api/metrics on mount and whenever a new version is
  // snapshotted (the ledger the server writes to changes). The dashboard never invents a rate.
  React.useEffect(() => {
    let cancelled = false;
    apiFetch('/api/metrics')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.observed === 'number') setFunnel(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [versions.length, setFunnel]);

  const tierLabel = (tier: string) =>
    tier === 'Comprehensive' ? t('tierComprehensive') : tier === 'Premier Global' ? t('tierPremier') : tier === 'Essential' ? t('tierEssential') : tier;

  const autoFixable = censusStats(census).autoFixable;
  const appliedFixes = census.reduce((s, m) => s + m.fixesApplied.length, 0);
  const stpRate = census.length ? Math.round((census.filter((m) => m.underwritingStatus === 'auto-cleared').length / census.length) * 100) : null;
  const uploadToQuoteSec =
    lastParsedAt && versions.length
      ? Math.max(1, Math.round((new Date(versions[versions.length - 1].createdAt).getTime() - new Date(lastParsedAt).getTime()) / 1000))
      : null;
  const deskRouted = census.filter((m) => m.underwritingStatus === 'underwriter-desk').length;
  // The engine also drops lives it cannot rate (no usable DOB), so the headline counts
  // everything the premium leaves out rather than only desk referrals.
  const exceptions = currentRating.excludedLives;

  const sessionQuote: QuoteRow = {
    id: `AURA-SESSION-${versions.length || 1}`,
    company: company.companyName || t('sessionCompany'),
    tradeLicense: company.tradeLicense || '—',
    emirate: `${company.emirate} ${t('regulatorSuffix')}`,
    lives: currentRating.ratedLives,
    tier: tierLabel(versions[versions.length - 1]?.config.networkTier ?? '—'),
    annualPremium: currentRating.ratedLives ? `AED ${Math.round(currentRating.annualTotalAED).toLocaleString()}` : '—',
    status: currentRating.ratedLives ? (versions.length ? 'ready' : 'review') : 'underwriting',
    statusLabel: currentRating.ratedLives
      ? versions.length
        ? t('statusVersioned')
        : t('statusDraft')
      : t('statusAwaiting'),
    salesforceSync: versions.length
      ? versions[versions.length - 1].salesforceAdapter === 'live'
        ? t('syncPayload', { id: versions[versions.length - 1].salesforceOppId })
        : t('syncMock')
      : t('syncNone'),
  };

  const sampleQuotes: QuoteRow[] = [
    {
      id: 'CIG-UAE-2025-8841',
      company: 'Al-Futtaim Logistics SME LLC',
      tradeLicense: 'UAE-DXB-984210',
      emirate: 'Dubai (DHA)',
      lives: 142,
      tier: t('tierComprehensive'),
      annualPremium: 'AED 412,500',
      status: 'ready',
      statusLabel: t('sPreApproved'),
      salesforceSync: t('sSynced', { id: 'OPP-89241' }),
    },
    {
      id: 'CIG-UAE-2025-8839',
      company: 'Emaar Hospitality Partners SME',
      tradeLicense: 'UAE-DXB-771920',
      emirate: 'Dubai (DHA)',
      lives: 86,
      tier: t('tierPremier'),
      annualPremium: 'AED 389,000',
      status: 'review',
      statusLabel: t('sActionRequired', { count: 2 }),
      salesforceSync: t('sSynced', { id: 'OPP-88412' }),
    },
    {
      id: 'CIG-UAE-2025-8820',
      company: 'Bayut Tech Labs FZCO',
      tradeLicense: 'UAE-DSO-119280',
      emirate: 'Dubai (DHA)',
      lives: 44,
      tier: t('tierComprehensive'),
      annualPremium: 'AED 124,300',
      status: 'underwriting',
      statusLabel: t('sUwDesk', { count: 1 }),
      salesforceSync: t('sPending'),
    },
    {
      id: 'CIG-UAE-2025-8794',
      company: 'PetroChem Logistics Abu Dhabi',
      tradeLicense: 'UAE-AUH-449102',
      emirate: 'Abu Dhabi (DOH)',
      lives: 210,
      tier: t('tierComprehensive'),
      annualPremium: 'AED 672,000',
      status: 'bound',
      statusLabel: t('sBound'),
      salesforceSync: t('sWonIssued'),
    },
  ];

  const matchesQuery = (q: QuoteRow) =>
    !searchQuery ||
    q.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.tradeLicense.toLowerCase().includes(searchQuery.toLowerCase());

  const liveRows = [sessionQuote].filter(matchesQuery).filter((q) => filterStatus === 'all' || q.status === filterStatus);
  const sampleRows = sampleQuotes.filter(matchesQuery).filter((q) => filterStatus === 'all' || q.status === filterStatus);
  const allRows = [sessionQuote, ...sampleQuotes];
  const countFor = (s: string) => allRows.filter((q) => q.status === s).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>{t('crumbBrand')}</span>
            <span>/</span>
            <span className="text-brand">{t('crumbTerritory')}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t('title')}
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{t('sessionBadge')}</span>
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/company"
            className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{`+ ${t('newQuote')}`}</span>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards — computed from this session's real state */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Straight-through processing */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('cardStp')}
            </span>
            <div className="p-2 bg-blue-50 text-brand rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {stpRate === null ? t('awaitingCensus') : `${stpRate}%`}
              </span>
              {stpRate !== null && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {census.filter((m) => m.underwritingStatus === 'auto-cleared').length}/{census.length}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stpRate === null ? t('stpUpload') : t('stpBody')}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">{t('issuesFixed')}</span>
            <span className="font-semibold text-emerald-600">
              {t('fixesSummary', { applied: appliedFixes, open: autoFixable })}
            </span>
          </div>
        </div>

        {/* Card 2: Turnaround */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('cardTurnaround')}
            </span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-brand tracking-tight">
                {uploadToQuoteSec !== null
                  ? `${uploadToQuoteSec}s`
                  : census.length
                    ? `${lastReRateMs} ms`
                    : '—'}
              </span>
              {(uploadToQuoteSec !== null || census.length > 0) && (
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {uploadToQuoteSec !== null ? t('uploadToVersion') : t('engineReRate')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {uploadToQuoteSec !== null
                ? t('turnaroundBody')
                : census.length
                  ? t('turnaroundBodyReRate')
                  : t('turnaroundBodyNone')}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">{t('quoteVersions')}</span>
            <span className="font-semibold text-brand">{versions.length}</span>
          </div>
        </div>

        {/* Card 3: Census */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('cardLives')}
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {census.length ? t('livesCount', { count: census.length }) : t('noCensus')}
              </span>
              {currentRating.ratedLives > 0 && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {t('ratedCount', { count: currentRating.ratedLives })}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {sourceFileName ? t('sourceFile', { file: sourceFileName }) : t('sourceHint')}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">{t('premiumLive')}</span>
            <span className="font-semibold text-slate-900">
              {currentRating.annualTotalAED ? `AED ${Math.round(currentRating.annualTotalAED).toLocaleString()}` : '—'}
            </span>
          </div>
        </div>

        {/* Card 4: Exceptions & audit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('cardExceptions')}
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {census.length ? t('exceptionsCount', { count: exceptions }) : '—'}
              </span>
              {deskRouted > 0 && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  {t('routedReason')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t('exceptionsBody')}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">{t('auditLabel')}</span>
            <span className="font-semibold text-emerald-600">{t('auditEvents', { count: auditLog.length })}</span>
          </div>
        </div>
      </div>

      {/* Conversion funnel — real persisted quote ledger */}
      <FunnelPanel funnel={funnel} />

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('filterAll')} ({allRows.length})
          </button>
          <button
            onClick={() => setFilterStatus('ready')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterStatus === 'ready'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {t('filterReady')} ({countFor('ready')})
          </button>
          <button
            onClick={() => setFilterStatus('review')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterStatus === 'review'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            {t('filterReview')} ({countFor('review')})
          </button>
          <button
            onClick={() => setFilterStatus('underwriting')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterStatus === 'underwriting'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            {t('filterUnderwriting')} ({countFor('underwriting')})
          </button>
          <button
            onClick={() => setFilterStatus('bound')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterStatus === 'bound'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            {t('filterBound')} ({countFor('bound')})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full ps-9 pe-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:border-brand"
          />
        </div>
      </div>

      {/* Live session quote */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-bold text-slate-900">{t('thisSession')}</h2>
          <span className="text-caption text-slate-500">{t('thisSessionSub')}</span>
        </div>
        {liveRows.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs text-slate-500 mb-3">
              {census.length === 0 ? t('emptyNone') : t('emptyNoMatch')}
            </p>
            <Link
              href="/census"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold transition-colors"
            >
              <Building2 className="w-4 h-4" />
              <span>{t('goCensus')}</span>
            </Link>
          </div>
        ) : (
          <QuoteTable rows={liveRows} />
        )}
      </div>

      {/* Sample territory pipeline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-900">{t('territory')}</h2>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-micro font-bold uppercase">
            {t('sampleData')}
          </span>
          <span className="text-caption text-slate-500">{t('territorySub')}</span>
        </div>
        {sampleRows.length === 0 ? (
          <p className="p-6 text-center text-xs text-slate-500">
            {t('emptySample')}
          </p>
        ) : (
          <QuoteTable rows={sampleRows} />
        )}
      </div>

      {/* Audit trail */}
      {auditLog.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">{t('auditTitle')}</h2>
            <p className="text-caption text-slate-500">
              {t('auditSub')}
            </p>
          </div>
          <ul className="divide-y divide-slate-100 text-xs">
            {auditLog.slice(-8).reverse().map((e, i) => (
              <li key={i} className="px-4 py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-slate-900 shrink-0">{e.actorKey ? ta(`actor.${e.actorKey}`) : e.actor}</span>
                  <span className="text-slate-600 truncate">{e.i18nKey ? ta(`msg.${e.i18nKey}`, e.params ?? {}) : e.action}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-caption text-slate-400">
                  {!e.i18nKey && <span className="font-mono">{e.detail}</span>}
                  <span>{new Date(e.at).toLocaleTimeString(locale)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface QuoteRow {
  id: string;
  company: string;
  tradeLicense: string;
  emirate: string;
  lives: number;
  tier: string;
  annualPremium: string;
  status: string;
  statusLabel: string;
  salesforceSync: string;
}

function QuoteTable({ rows }: { rows: QuoteRow[] }) {
  const t = useTranslations('Dashboard');
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-start border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-caption font-bold text-slate-500 uppercase tracking-wider">
            <th className="py-3 px-4">{t('tableHeaders.quote')}</th>
            <th className="py-3 px-4">{t('tableHeaders.license')}</th>
            <th className="py-3 px-4">{t('tableHeaders.lives')}</th>
            <th className="py-3 px-4">{t('tableHeaders.premium')}</th>
            <th className="py-3 px-4">{t('tableHeaders.triage')}</th>
            <th className="py-3 px-4">{t('tableHeaders.crm')}</th>
            <th className="py-3 px-4 text-end">{t('tableHeaders.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs">
          {rows.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="py-3.5 px-4">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900">{item.company}</span>
                  <span className="text-caption font-mono text-brand">{item.id}</span>
                </div>
              </td>
              <td className="py-3.5 px-4 text-slate-600">
                <div>{item.tradeLicense}</div>
                <div className="text-caption text-slate-400">{item.emirate}</div>
              </td>
              <td className="py-3.5 px-4">
                <span className="font-semibold text-slate-800">{t('livesCell', { count: item.lives })}</span>
                <span className="text-caption text-slate-500 block">{item.tier}</span>
              </td>
              <td className="py-3.5 px-4">
                <span className="font-bold text-slate-900">{item.annualPremium}</span>
              </td>
              <td className="py-3.5 px-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-semibold ${
                    item.status === 'ready'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : item.status === 'review'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : item.status === 'underwriting'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.status === 'ready'
                        ? 'bg-emerald-500'
                        : item.status === 'review'
                        ? 'bg-amber-500'
                        : item.status === 'underwriting'
                        ? 'bg-blue-500'
                        : 'bg-purple-500'
                    }`}
                  ></span>
                  {item.statusLabel}
                </span>
              </td>
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-1 text-caption text-slate-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{item.salesforceSync}</span>
                </div>
              </td>
              <td className="py-3.5 px-4 text-end">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href="/configure"
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    {t('configure')}
                  </Link>
                  <Link
                    href="/lifecycle"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand hover:bg-blue-50 transition-colors"
                    title={t('viewLifecycle')}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STAGE_ORDER: QuoteStatus[] = ['draft', 'review', 'underwriting', 'ready', 'bound'];

function FunnelPanel({ funnel }: { funnel: FunnelMetrics | null }) {
  const t = useTranslations('Dashboard');
  const stageLabel: Record<QuoteStatus, string> = {
    draft: t('stageDraft'),
    review: t('stageReview'),
    ready: t('stageReady'),
    underwriting: t('stageUnderwriting'),
    bound: t('stageBound'),
    declined: t('stageDeclined'),
  };
  const max = funnel ? Math.max(1, ...STAGE_ORDER.map((s) => funnel.stages[s])) : 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-bold text-slate-900">{t('funnelTitle')}</h2>
        </div>
        <span className="text-caption text-slate-500">
          {funnel ? t('funnelBackend', { backend: funnel.backend === 'supabase' ? 'Supabase' : 'in-memory' }) : t('funnelLoading')}
        </span>
      </div>

      {!funnel || funnel.observed === 0 ? (
        <p className="p-6 text-center text-xs text-slate-500">{t('funnelEmpty')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          <div className="md:col-span-2 space-y-2">
            {STAGE_ORDER.map((stage) => (
              <div key={stage} className="flex items-center gap-3 text-xs">
                <span className="w-28 shrink-0 font-semibold text-slate-600">{stageLabel[stage]}</span>
                <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand/80 rounded-full transition-all" style={{ width: `${(funnel.stages[stage] / max) * 100}%` }} />
                </div>
                <span className="w-8 text-end font-bold text-slate-900">{funnel.stages[stage]}</span>
              </div>
            ))}
            {funnel.stages.declined > 0 && (
              <div className="flex items-center gap-3 text-xs">
                <span className="w-28 shrink-0 font-semibold text-red-600">{stageLabel.declined}</span>
                <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${(funnel.stages.declined / max) * 100}%` }} />
                </div>
                <span className="w-8 text-end font-bold text-red-700">{funnel.stages.declined}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200/80">
              <span className="text-caption font-semibold text-slate-500 uppercase tracking-wider">{t('conversionLabel')}</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">
                {funnel.conversionRate === null ? '—' : `${Math.round(funnel.conversionRate * 100)}%`}
              </div>
              <p className="text-caption text-slate-500 mt-1">{t('conversionSub', { count: funnel.stages.bound, priced: funnel.stages.review + funnel.stages.ready + funnel.stages.bound })}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-caption font-semibold text-slate-500 uppercase tracking-wider">{t('observedLabel')}</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{funnel.observed}</div>
              <span className="text-caption text-slate-500">{t('medianTurnaround', { seconds: funnel.turnaroundMedianSec === null ? '—' : funnel.turnaroundMedianSec })}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
