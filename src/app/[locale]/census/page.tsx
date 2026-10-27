'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useQuoteStore } from '@/store/useQuoteStore';
import { WorkflowStepper } from '@/components/WorkflowStepper';
import {
  parseCensusWorkbook,
  dedupeMembers,
  buildSampleCensus,
  censusStats,
  bandLabelKey,
  relLabelKey,
} from '@/lib/census/engine';
import { buildDocuments, completenessQueue, docTypeLabelKey } from '@/lib/documents';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Download,
  Wand2,
  Bot,
  UserCheck,
  FileSpreadsheet,
  Files,
  FileCheck2,
  RotateCcw,
  Trash2,
  Info,
} from 'lucide-react';

type Tab = 'all' | 'flagged' | 'cleared' | 'underwriter';

export default function CensusPage() {
  const t = useTranslations('Census');
  const {
    census,
    company,
    sourceFileName,
    lastParsedAt,
    unmappedColumns,
    setParsedCensus,
    clearCensus,
    resolveMember,
    applyFixesFor,
    setAiDrawerOpen,
    documents,
    addDocuments,
    removeDocument,
    pushAudit,
  } = useQuoteStore();

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [docDragActive, setDocDragActive] = useState(false);
  const [manualFixFor, setManualFixFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const stats = censusStats(census);
  const completeness = completenessQueue(census, documents);

  const handleDocFiles = (files: FileList | null) => {
    const list = Array.from(files ?? []).map((f) => ({ fileName: f.name, sizeBytes: f.size, mime: f.type }));
    if (list.length === 0) return;
    const docs = buildDocuments(list, census);
    addDocuments(docs);
    pushAudit('Document Intake', 'Ingested supporting documents', `${docs.length} file(s) classified`, { actorKey: 'censusEngine', key: 'documentsIngested', params: { count: docs.length } });
  };

  const ingest = useCallback(
    (buffer: ArrayBuffer, fileName: string) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const result = parseCensusWorkbook(buffer);
        if (result.rowCount === 0) throw new Error('empty');
        setParsedCensus(dedupeMembers(result.members), fileName, result.unmappedColumns);
      } catch {
        setLoadError(t('parseError'));
      } finally {
        setIsLoading(false);
      }
    },
    [setParsedCensus, t]
  );

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    file.arrayBuffer().then((buf) => ingest(buf, file.name));
  };

  const loadSample = () => {
    ingest(buildSampleCensus(), 'Al_Futtaim_Logistics_Census_Q3.xlsx');
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet([
      { 'Employee Name': 'Full legal name', 'Emirates ID': '784-YYYY-NNNNNNN-D', 'Date of Birth': 'YYYY-MM-DD', Gender: 'M or F', Relationship: 'Principal/Spouse/Child', 'Monthly Salary': 15000, Nationality: 'Dubai/Abu Dhabi/Sharjah' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Census Template');
    XLSX.writeFile(wb, 'AuraSME_Census_Template.xlsx');
  };

  const filtered = census.filter((m) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'flagged') return m.underwritingStatus === 'flagged-review';
    if (activeTab === 'cleared') return m.underwritingStatus === 'auto-cleared';
    return m.underwritingStatus === 'underwriter-desk';
  });

  const canProceed = stats.total > 0 && stats.flagged === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <WorkflowStepper current="census" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>{t('crumbQuotes')}</span>
            <span>&gt;</span>
            <span className="font-semibold text-slate-800">{company.companyName || t('newQuote')}</span>
            <span>&gt;</span>
            <span className="text-brand font-bold">{t('crumbCurrent')}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{t('title')}</h1>
          <p className="text-sm text-slate-500 max-w-2xl mt-0.5">{t('subtitle')}</p>
        </div>

        {stats.total > 0 && (
          <div className="flex items-center gap-5 bg-white px-5 py-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path
                  className={`${stats.quality === 100 ? 'text-emerald-500' : stats.quality >= 85 ? 'text-brand' : 'text-amber-500'} transition-all duration-700`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeDasharray={`${stats.quality}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="text-lg font-extrabold text-slate-900">{stats.quality}</span>
                <span className="text-[10px] font-semibold text-slate-400">%</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{t('dataQuality')}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${stats.quality === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {stats.quality === 100 ? t('qualityClean') : t('qualityReview')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{t('issuesBadge', { count: stats.issueCount, total: stats.total })}</p>
              <div className="flex items-center gap-4 mt-2.5">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" aria-hidden />
                  <span className="text-xs font-bold text-slate-800">{stats.cleared}</span>
                  <span className="text-[11px] text-slate-500">{t('autoClearedShort')}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" aria-hidden />
                  <span className="text-xs font-bold text-slate-800">{stats.flagged}</span>
                  <span className="text-[11px] text-slate-500">{t('flaggedShort')}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" aria-hidden />
                  <span className="text-xs font-bold text-slate-800">{stats.underwriter}</span>
                  <span className="text-[11px] text-slate-500">{t('underwriterShort')}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
            className={`bg-white rounded-2xl border-2 border-dashed p-6 text-center flex flex-col items-center justify-center space-y-3 transition-all ${
              dragActive ? 'border-brand bg-blue-50/60' : 'border-brand/60 hover:border-brand bg-blue-50/20'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-brand flex items-center justify-center">
              {isLoading ? <RotateCcw className="w-6 h-6 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 block">
                {isLoading ? t('parsing') : t('dropzone')}
              </span>
              <span className="text-xs text-slate-500">{t('formats')}</span>
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-dark">
                {sourceFileName ? t('replaceFile') : t('browse')}
              </button>
              <button type="button" onClick={loadSample} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50">
                {t('loadSample')}
              </button>
              <button type="button" onClick={downloadTemplate} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 flex items-center gap-1">
                <Download className="w-3.5 h-3.5" />
                {t('downloadTemplate')}
              </button>
            </div>
            {loadError && (
              <div className="w-full p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {loadError}
              </div>
            )}
            {sourceFileName && !isLoading && (
              <div className="w-full p-3 rounded-xl bg-slate-50 flex items-center gap-3 text-start">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900 truncate">{sourceFileName}</span>
                  <span className="block text-xs text-slate-500">
                    {stats.total} {t('rows')} · {lastParsedAt ? new Date(lastParsedAt).toLocaleTimeString() : ''}
                  </span>
                </div>
                <button onClick={clearCensus} title={t('removeFile')} className="text-slate-400 hover:text-red-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            {unmappedColumns.length > 0 && (
              <p className="text-xs text-amber-700">{t('unmappedNote', { columns: unmappedColumns.join(', ') })}</p>
            )}
          </div>

          {stats.total > 0 && (
            <>
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-indigo-600" />
                    <span className="font-bold text-sm text-indigo-950">{t('aiAssist')}</span>
                  </div>
                  <span className="text-xs font-bold bg-indigo-200/70 text-indigo-800 px-2 py-0.5 rounded-full">{t('ruleEngineBadge')}</span>
                </div>
                <p className="text-sm text-indigo-900/80 leading-relaxed">{t('aiAssistBody', { count: stats.autoFixable })}</p>
                <div className="flex gap-2">
                  <button onClick={() => setAiDrawerOpen(true)} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('openCopilot')}
                  </button>
                  {stats.autoFixable > 0 && (
                    <button onClick={() => census.filter((m) => m.censusIssues.some((i) => i.autoFixable)).forEach((m) => applyFixesFor(m.id))} className="px-3 py-2 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold flex items-center gap-1">
                      <Wand2 className="w-3.5 h-3.5" />
                      {t('fixAll')}
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-xs">
                <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wider">{t('triageTitle')}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 text-emerald-800 font-medium">
                    <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" />{t('autoCleared')}</div>
                    <span className="font-bold">{stats.cleared}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 text-amber-800 font-medium">
                    <div className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-600" />{t('flagged')}</div>
                    <span className="font-bold">{stats.flagged}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 text-blue-800 font-medium">
                    <div className="flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-blue-600" />{t('underwriter')}</div>
                    <span className="font-bold">{stats.underwriter}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div
            onDragOver={(e) => { e.preventDefault(); setDocDragActive(true); }}
            onDragLeave={() => setDocDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDocDragActive(false); handleDocFiles(e.dataTransfer.files); }}
            className={`bg-white rounded-2xl border-2 border-dashed p-5 text-center flex flex-col items-center justify-center space-y-3 transition-all ${
              docDragActive ? 'border-indigo-500 bg-indigo-50/60' : 'border-slate-300 hover:border-indigo-400 bg-slate-50/40'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Files className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 block">{t('docDropzone')}</span>
              <span className="text-xs text-slate-500">{t('docFormats')}</span>
            </div>
            <input ref={docInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv,.doc,.docx" className="hidden" onChange={(e) => { handleDocFiles(e.target.files); e.currentTarget.value = ''; }} />
            <button type="button" onClick={() => docInputRef.current?.click()} className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
              {t('docBrowse')}
            </button>
            {documents.length > 0 && (
              <ul className="w-full space-y-1 text-start">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1">
                    <span className="min-w-0 flex items-center gap-1.5">
                      {d.status === 'linked' ? <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      <span className="truncate font-medium text-slate-700">{d.fileName}</span>
                      <span className="text-slate-400">· {t(docTypeLabelKey(d.type))}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {d.memberName && <span className="text-indigo-600 font-semibold">{d.memberName}</span>}
                      <button onClick={() => removeDocument(d.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {completeness.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-2 shadow-xs">
              <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wider">{t('completenessTitle')}</h4>
              <p className="text-xs text-slate-500">{t('completenessSub')}</p>
              <ul className="space-y-1.5 text-sm">
                {completeness.map((row) => (
                  <li key={row.memberId} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium text-slate-700">{row.memberName}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${row.satisfied ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                      {row.satisfied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {row.satisfied ? t('docSatisfied') : t('docMissing', { type: t(docTypeLabelKey(row.requiredType)) })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          {stats.total === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-24 px-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">{t('emptyTitle')}</h3>
              <p className="text-sm text-slate-500 max-w-md mt-1">{t('emptyBody')}</p>
              <button onClick={loadSample} className="mt-5 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-sm font-bold">
                {t('loadSample')}
              </button>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {([['all', t('all'), 'bg-slate-900 text-white'], ['cleared', t('autoClearedShort'), 'bg-emerald-700 text-white'], ['flagged', t('flaggedShort'), 'bg-amber-700 text-white'], ['underwriter', t('underwriterShort'), 'bg-blue-700 text-white']] as [Tab, string, string][]).map(([key, label, activeCls]) => {
                    const count = key === 'all' ? stats.total : key === 'cleared' ? stats.cleared : key === 'flagged' ? stats.flagged : stats.underwriter;
                    return (
                      <button key={key} onClick={() => setActiveTab(key)} className={`px-3 py-1 rounded-lg text-sm font-semibold ${activeTab === key ? activeCls : 'bg-white text-slate-600 border border-slate-200'}`}>
                        {label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                <table className="w-full text-start text-sm border-collapse">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">{t('colMember')}</th>
                      <th className="py-2.5 px-3">{t('colEidDob')}</th>
                      <th className="py-2.5 px-3">{t('colRoleBand')}</th>
                      <th className="py-2.5 px-3">{t('colTriage')}</th>
                      <th className="py-2.5 px-3 text-end">{t('colAction')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((member) => (
                      <React.Fragment key={member.id}>
                        <tr className="hover:bg-slate-50/80">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{member.name}</div>
                            <div className="text-xs text-slate-400 font-mono">{member.id} · {member.gender} · {member.age || '?'}</div>
                          </td>
                          <td className="py-3 px-3">
                            {member.emiratesId ? <div className="font-mono text-slate-700">{member.emiratesId}</div> : <span className="text-amber-600 font-semibold text-sm">{t('missingEid')}</span>}
                            <div className="text-sm text-slate-500">
                              {member.dob || <span className="text-amber-600">{t('missingDob')}</span>}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-800">{t(relLabelKey(member.relationship))}</div>
                            <div className="text-sm text-slate-500">{t(bandLabelKey(member.salaryBand))}</div>
                          </td>
                          <td className="py-3 px-3">
                            {member.underwritingStatus === 'auto-cleared' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {t('autoClearedShort')}
                              </span>
                            )}
                            {member.underwritingStatus === 'flagged-review' && (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  {t('needsFix')}
                                </span>
                                {member.censusIssues.map((issue) => (
                                  <p key={issue.key ?? issue.code} className={`text-xs ${issue.severity === 'blocking' ? 'text-red-600' : 'text-amber-700'}`}>
                                    {issue.severity === 'info' ? <Info className="w-3 h-3 inline" /> : null} {t(`issue.${issue.key ?? issue.code}`, issue.params)}
                                  </p>
                                ))}
                              </div>
                            )}
                            {member.underwritingStatus === 'underwriter-desk' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                                {t('medicalUnderwriter')}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-end align-top">
                            {member.censusIssues.some((i) => i.autoFixable) && (
                              <button onClick={() => applyFixesFor(member.id)} className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold me-1">
                                {t('autoFix')}
                              </button>
                            )}
                            {member.underwritingStatus === 'flagged-review' && (
                              <button onClick={() => setManualFixFor(manualFixFor === member.id ? null : member.id)} className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-bold">
                                {t('manualFix')}
                              </button>
                            )}
                          </td>
                        </tr>
                        {manualFixFor === member.id && (
                          <tr className="bg-slate-50">
                            <td colSpan={5} className="px-3 py-3">
                              <form
                                className="flex flex-wrap gap-2 items-end"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const form = e.currentTarget;
                                  const dob = (form.elements.namedItem('dob') as HTMLInputElement).value;
                                  const eid = (form.elements.namedItem('eid') as HTMLInputElement).value;
                                  resolveMember(member.id, { ...(dob ? { dob } : {}), ...(eid ? { emiratesId: eid } : {}) });
                                  setManualFixFor(null);
                                }}
                              >
                                <label className="flex flex-col text-xs font-semibold text-slate-600">
                                  {t('colDob')}
                                  <input name="dob" type="date" defaultValue={member.dob || ''} className="border border-slate-200 rounded px-2 py-1 text-sm font-normal" />
                                </label>
                                <label className="flex flex-col text-xs font-semibold text-slate-600">
                                  {t('colEid')}
                                  <input name="eid" type="text" placeholder="784-YYYY-NNNNNNN-D" defaultValue={member.emiratesId || ''} className="border border-slate-200 rounded px-2 py-1 text-sm font-normal font-mono" />
                                </label>
                                <button type="submit" className="px-3 py-1.5 bg-brand text-white rounded text-xs font-bold">{t('applyCorrection')}</button>
                              </form>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-500 font-medium">
              {stats.total > 0 ? t('readyToRate', { total: stats.total, principals: stats.principals, dependants: stats.dependants }) : t('awaitingCensus')}
            </span>
            <Link
              href="/configure"
              aria-disabled={!canProceed}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${canProceed ? 'bg-brand hover:bg-brand-dark text-white' : 'bg-slate-200 text-slate-400 pointer-events-none'}`}
            >
              {t('proceed')}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>

      {stats.total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-start gap-3 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-brand shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600">
            {t('regulatoryNote')}
          </p>
        </div>
      )}
    </div>
  );
}
