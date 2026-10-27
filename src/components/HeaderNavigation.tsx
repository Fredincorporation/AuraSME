'use client';

import React, { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { isLocale, type Locale } from '@/i18n/routing';
import { useQuoteStore } from '@/store/useQuoteStore';
import { NotificationsMenu } from '@/components/NotificationsMenu';
import { AccountMenu } from '@/components/AccountMenu';
import {
  Home,
  FileSpreadsheet,
  SlidersHorizontal,
  FileCheck2,
  GitCompare,
  ShieldCheck,
  Globe2,
  Sparkles,
  TrendingUp,
  Building2,
} from 'lucide-react';

export const HeaderNavigation = () => {
  const tShell = useTranslations('Shell');
  const tNav = useTranslations('Nav');
  const tBrand = useTranslations('Brand');

  const pathname = usePathname();
  const router = useRouter();
  const rawLocale = useLocale();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';
  const [isSwitching, startTransition] = useTransition();

  const { setLocale, setAiDrawerOpen } = useQuoteStore();
  const isRTL = locale === 'ar';

  const navItems = [
    { key: 'home', href: '/', icon: Home },
    { key: 'newQuote', href: '/company', icon: Building2 },
    { key: 'pipeline', href: '/dashboard', icon: TrendingUp },
    { key: 'census', href: '/census', icon: FileSpreadsheet },
    { key: 'configure', href: '/configure', icon: SlidersHorizontal },
    { key: 'summary', href: '/summary', icon: FileCheck2 },
    { key: 'lifecycle', href: '/lifecycle', icon: GitCompare },
  ] as const;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  const toggleLocale = () => {
    const next: Locale = locale === 'en' ? 'ar' : 'en';
    setLocale(next);
    startTransition(() => {
      // Replace keeps history clean and preserves the current quote step.
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <header
      data-print-hide
      className="fixed top-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-md border-b border-border shadow-layer-1"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-dark to-brand flex items-center justify-center text-white font-bold text-lg shadow-sm">
              A
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-ink tracking-tight text-base flex items-center gap-1.5">
                {tBrand('name')}
                <span className="text-micro font-bold uppercase tracking-wider px-1.5 py-0.5 bg-brand/10 text-brand border border-brand/20 rounded">
                  {tBrand('badge')}
                </span>
              </span>
              <span className="text-micro text-ink-muted font-medium">{tBrand('tagline')}</span>
            </div>
          </Link>
        </div>

        {/* Primary navigation */}
        <nav aria-label={tShell('mainNav')} className="hidden xl:flex items-center gap-1">
          {navItems.map(({ key, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={key}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-brand text-white shadow-layer-1'
                    : 'text-slate-600 hover:text-ink hover:bg-surface-subtle'
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden />
                <span>{tNav(key)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Utility cluster */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setAiDrawerOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-700 hover:bg-indigo-100 transition-colors text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" aria-hidden />
            <span>{tShell('aiCopilot')}</span>
          </button>

          <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-success/10 border border-brand-success/30 text-brand-success text-caption font-bold">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
            <span>{tShell('complianceBadge')}</span>
          </div>

          <button
            type="button"
            onClick={toggleLocale}
            disabled={isSwitching}
            aria-label={tShell('languageSwitchLabel')}
            lang={isRTL ? 'en' : 'ar'}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-surface-subtle hover:bg-border text-slate-700 text-xs font-semibold transition-colors disabled:opacity-60"
          >
            <Globe2 className="w-3.5 h-3.5 text-slate-500" aria-hidden />
            <span>{tShell('languageSwitch')}</span>
          </button>

          <NotificationsMenu />

          <AccountMenu />
        </div>
      </div>
    </header>
  );
};
