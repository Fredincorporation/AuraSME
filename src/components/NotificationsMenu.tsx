'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuoteStore } from '@/store/useQuoteStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Bell,
  Building2,
  CheckCheck,
  FileSpreadsheet,
  GitCompare,
  Inbox,
  ShieldAlert,
  ShieldCheck,
  Target,
} from 'lucide-react';

type Kind = 'census' | 'compliance' | 'version' | 'budget' | 'company' | 'sync';

interface Notif {
  id: string;
  kind: Kind;
  title: string;
  body: string;
  at: number;
  tone: 'info' | 'alert' | 'success';
}

const SEEN_KEY = 'aurasme-notifs-seen';

function relativeTime(ts: number, locale: string): string {
  const diff = Date.now() - ts;
  const rtf = new Intl.RelativeTimeFormat(locale === 'ar' ? 'ar' : 'en', { numeric: 'auto' });
  const min = Math.round(diff / 60000);
  if (Math.abs(min) < 60) return rtf.format(-min, 'minute');
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 24) return rtf.format(-hr, 'hour');
  return rtf.format(-Math.round(hr / 24), 'day');
}

function actorToKind(actor: string): Kind {
  if (actor.includes('Census')) return 'census';
  if (actor.includes('Compliance')) return 'compliance';
  if (actor.includes('Quote Engine')) return 'version';
  if (actor.includes('Budget')) return 'budget';
  return 'company';
}

const KIND_ICON: Record<Kind, typeof Bell> = {
  census: FileSpreadsheet,
  compliance: ShieldCheck,
  version: GitCompare,
  budget: Target,
  company: Building2,
  sync: GitCompare,
};

export const NotificationsMenu = () => {
  const t = useTranslations('Notifications');
  const ta = useTranslations('Audit');
  const locale = useLocale();
  const { auditLog, complianceReport, versions } = useQuoteStore();
  const authUser = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<number>(() => {
    if (typeof window === 'undefined') return Date.now();
    const raw = window.localStorage.getItem(SEEN_KEY);
    return raw ? Number(raw) : Date.now();
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const items = useMemo<Notif[]>(() => {
    const list: Notif[] = [];

    for (const entry of auditLog) {
      list.push({
        id: `audit-${entry.at}-${entry.action}`,
        kind: actorToKind(entry.actor),
        title: entry.i18nKey ? ta(`msg.${entry.i18nKey}`, entry.params ?? {}) : entry.action,
        body: entry.actorKey ? ta(`actor.${entry.actorKey}`) : entry.actor,
        at: Date.parse(entry.at),
        tone: 'info',
      });
    }

    const breaches = complianceReport.findings.filter((f) => !f.ok);
    const fixes = complianceReport.findings.filter((f) => f.autoFixed);
    if (breaches.length || fixes.length || complianceReport.referrals.length) {
      const latestAt = versions.length
        ? Date.parse(versions[versions.length - 1].createdAt)
        : auditLog.length
          ? Date.parse(auditLog[auditLog.length - 1].at)
          : 0;
      list.push({
        id: 'compliance-live',
        kind: 'compliance',
        title: breaches.length ? t('complianceBreach') : t('complianceAligned'),
        body: t('complianceBody', {
          breaches: breaches.length,
          fixes: fixes.length,
          referrals: complianceReport.referrals.length,
        }),
        at: latestAt,
        tone: breaches.length ? 'alert' : 'success',
      });
    }

    for (const v of versions) {
      if (v.salesforceSyncStatus === 'error') {
        list.push({
          id: `sync-${v.versionId}`,
          kind: 'sync',
          title: t('syncFailed', { version: v.versionId }),
          body: t('syncFailedBody'),
          at: Date.parse(v.createdAt),
          tone: 'alert',
        });
      }
    }

    return list.sort((a, b) => b.at - a.at).slice(0, 20);
  }, [auditLog, complianceReport, versions, t, ta]);

  const unread = items.filter((i) => i.at > seenAt).length;

  const markRead = () => {
    const now = Date.now();
    setSeenAt(now);
    window.localStorage.setItem(SEEN_KEY, String(now));
  };

  const openPanel = () => {
    setOpen((v) => !v);
    if (!open) markRead();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openPanel}
        aria-label={t('title')}
        aria-expanded={open}
        className="p-2 rounded-lg text-slate-600 hover:bg-surface-subtle transition-colors relative"
      >
        <Bell className="w-4 h-4" aria-hidden />
        {unread > 0 && (
          <span className="absolute top-1 end-1 min-w-[16px] h-4 px-1 rounded-full bg-brand-accent text-white text-[10px] font-bold ring-2 ring-white flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface shadow-layer-2 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink">{t('title')}</h3>
              {authUser?.email && <span className="text-[10px] text-ink-muted">• {authUser.email}</span>}
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={markRead}
                className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-dark"
              >
                <CheckCheck className="w-3.5 h-3.5" aria-hidden />
                {t('markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 flex flex-col items-center text-center gap-2 text-ink-muted">
                <Inbox className="w-7 h-7 opacity-60" aria-hidden />
                <p className="text-sm">{t('empty')}</p>
              </div>
            ) : (
              items.map((item) => {
                const Icon = KIND_ICON[item.kind];
                const toneRing =
                  item.tone === 'alert'
                    ? 'bg-red-50 text-red-600'
                    : item.tone === 'success'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-blue-50 text-brand';
                return (
                  <div key={item.id} className="flex gap-3 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-surface-subtle/60">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${toneRing}`}>
                      {item.tone === 'alert' ? <ShieldAlert className="w-4 h-4" aria-hidden /> : <Icon className="w-4 h-4" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold text-ink truncate">{item.title}</p>
                        <span className="text-[11px] text-ink-muted shrink-0">{relativeTime(item.at, locale)}</span>
                      </div>
                      <p className="text-xs text-ink-muted line-clamp-2">{item.body}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
