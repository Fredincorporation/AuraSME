'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuoteStore } from '@/store/useQuoteStore';
import { censusStats } from '@/lib/census/engine';
import { apiFetch } from '@/lib/apiClient';
import { X, AlertTriangle, Bot, Send, Mic, Wand2 } from 'lucide-react';

interface Msg {
  sender: 'ai' | 'user';
  text: string;
  actions?: { label: string; run: () => void }[];
}

export const ConversationalCensusDrawer = () => {
  const t = useTranslations('Copilot');
  const tc = useTranslations('Census');
  const locale = useLocale();
  const { isAiDrawerOpen, setAiDrawerOpen, census, activeConfig, applyFixesFor, pushAudit, lastParsedAt } = useQuoteStore();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const startedRef = useRef<string | null>(null);
  const stats = censusStats(census);

  const startAnalysis = async () => {
    if (census.length === 0) return;
    startedRef.current = lastParsedAt;
    setAnalyzing(true);
    try {
      const res = await apiFetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: census, locale }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setProvider(data.provider);
      const autoFixable = data.analysis.autoFixable as { memberId: string; name: string; fix: string }[];
      setMessages([
        {
          sender: 'ai',
          text: t('greeting', { rows: stats.total, autoFixable: stats.autoFixable, blocking: stats.issueCount - stats.autoFixable }),
          actions:
            autoFixable.length > 0
              ? [
                  {
                    label: t('applyFixes', { count: autoFixable.length }),
                    run: () => {
                      autoFixable.forEach((f) => applyFixesFor(f.memberId));
                      setMessages((prev) => [...prev, { sender: 'ai', text: t('fixesApplied', { count: autoFixable.length }) }]);
                      pushAudit('Census Copilot', 'Bulk auto-fix applied', `${autoFixable.length} members`, { actorKey: 'copilot', key: 'bulkAutoFix', params: { count: autoFixable.length } });
                    },
                  },
                ]
              : undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { sender: 'ai', text: t('offline') }]);
      startedRef.current = null;
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isAiDrawerOpen && census.length > 0 && startedRef.current !== lastParsedAt) {
      void startAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAiDrawerOpen, census.length, lastParsedAt]);

  if (!isAiDrawerOpen) return null;

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setMessages((prev) => [...prev, { sender: 'user', text }]);

    const local = handleLocalCommand(text);
    if (local) {
      setMessages((prev) => [...prev, { sender: 'ai', text: local }]);
      return;
    }
    try {
      const res = await apiFetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, members: census, config: activeConfig, locale }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setProvider(data.provider);
      setMessages((prev) => [...prev, { sender: 'ai', text: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { sender: 'ai', text: t('offline') }]);
    }
  };

  const handleLocalCommand = (text: string): string | null => {
    const lower = text.toLowerCase();
    if (/^(status|الحالة)\b/.test(lower) || lower.includes('status')) {
      return t('status', { total: stats.total, cleared: stats.cleared, flagged: stats.flagged, underwriter: stats.underwriter });
    }
    const fixMatch = text.match(/(?:fix|أصلح|اصلاح)\s+(.+)/i);
    if (fixMatch) {
      const target = fixMatch[1].trim().toLowerCase();
      const member = census.find((m) => m.name.toLowerCase().includes(target) && m.censusIssues.some((i) => i.autoFixable));
      if (member) {
        applyFixesFor(member.id);
        const fixes = member.censusIssues.filter((i) => i.autoFixable).map((i) => tc(`issue.${i.key ?? i.code}`, i.params ?? {})).join('; ');
        return t('fixAppliedTo', { name: member.name, fixes });
      }
      return t('noFixMatch', { query: fixMatch[1] });
    }
    return null;
  };

  const handleVoice = () => {
    const SR = (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown });
    const Ctor = SR.SpeechRecognition ?? SR.webkitSpeechRecognition;
    if (!Ctor) {
      setMessages((prev) => [...prev, { sender: 'ai', text: t('voiceUnsupported') }]);
      return;
    }
    type SpeechResultEvent = { results: { [index: number]: { [transcriptIndex: number]: { transcript: string } } } };
    const rec = new Ctor() as {
      lang: string;
      interimResults: boolean;
      onresult: (e: SpeechResultEvent) => void;
      onend: () => void;
      start: () => void;
    };
    rec.lang = locale === 'ar' ? 'ar-AE' : 'en-AE';
    rec.interimResults = false;
    rec.onresult = (e) => setInputText(e.results[0][0].transcript);
    rec.onend = () => setIsListening(false);
    setIsListening(true);
    rec.start();
  };

  const flaggedCount = stats.flagged;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 rtl:border-l-0 rtl:border-r">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">{t('title')}</h3>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  {provider ?? 'rule-engine'}
                </span>
              </div>
              <p className="text-xs text-slate-500">{t('subtitle')}</p>
            </div>
          </div>
          <button onClick={() => setAiDrawerOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 flex items-center justify-between text-sm text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {flaggedCount > 0
                ? t('analysisTitle') + ` — ${stats.issueCount} issues / ${stats.total} records`
                : stats.total > 0
                  ? t('status', { total: stats.total, cleared: stats.cleared, flagged: stats.flagged, underwriter: stats.underwriter })
                  : t('greeting', { rows: 0, autoFixable: 0, blocking: 0 })}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {census.length === 0 && <p className="text-sm text-slate-500 text-center py-8">{t('noCensus')}</p>}
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${msg.sender === 'user' ? 'bg-brand text-white rounded-br-xs' : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60'}`}>
                {msg.text}
              </div>
              {msg.actions?.map((a, j) => (
                <button key={j} onClick={a.run} className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  {a.label}
                </button>
              ))}
            </div>
          ))}
          {analyzing && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              {t('analysisTitle')}…
            </div>
          )}
          {isListening && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              {t('listening')}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
          <button onClick={handleVoice} title={t('voiceNote')} className={`p-2.5 rounded-xl border transition-colors ${isListening ? 'bg-red-600 text-white border-red-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'}`}>
            <Mic className="w-4 h-4 text-indigo-600" />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('placeholder')}
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-brand"
          />
          <button onClick={handleSend} className="p-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
