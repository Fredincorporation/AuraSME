'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { ChevronDown, LogOut, ShieldCheck, User2 } from 'lucide-react';

function initials(email: string, name?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return (email[0] ?? '?').toUpperCase();
}

export const AccountMenu = () => {
  const t = useTranslations('Auth');
  const { status, user, signOut } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (status === 'signed-in' && user) {
    const name = (user.user_metadata?.full_name as string | undefined) ?? '';
    const email = user.email ?? '';
    return (
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2 ps-2 border-s border-border"
        >
          <span
            className="w-8 h-8 rounded-full bg-brand/10 ring-2 ring-brand/20 flex items-center justify-center font-bold text-xs text-brand"
            title={email}
          >
            {initials(email, name)}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" aria-hidden />
        </button>
        {open && (
          <div
            role="menu"
            className="absolute end-0 mt-2 w-64 rounded-xl border border-border bg-surface shadow-layer-2 p-2 z-50"
          >
            <div className="flex items-center gap-2.5 px-2 py-2">
              <span className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
                {initials(email, name)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink truncate">{name || t('brokerAccount')}</p>
                <p className="text-xs text-ink-muted truncate">{email}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-brand-success font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
              {t('verifiedSession')}
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-surface-subtle"
            >
              <LogOut className="w-4 h-4 rtl:rotate-180" aria-hidden />
              {t('signOut')}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold hover:bg-brand-dark transition-colors"
    >
      <User2 className="w-3.5 h-3.5" aria-hidden />
      {t('signIn')}
    </Link>
  );
};
