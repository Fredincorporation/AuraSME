'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Link } from '@/i18n/navigation';
import { AlertCircle, ArrowLeft, Loader2, Mail, ShieldCheck } from 'lucide-react';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const { status, configured, signInWithPassword, signUp, signInWithOtp } = useAuthStore();

  const [mode, setMode] = useState<Mode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<null | 'signin' | 'signup' | 'otp'>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'signed-in') router.replace('/');
  }, [status, router]);

  const reset = () => {
    setError(null);
    setNotice(null);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    reset();
    if (!email.trim() || !password) {
      setError(t('errRequired'));
      return;
    }
    setBusy(mode === 'signin' ? 'signin' : 'signup');
    const res =
      mode === 'signin'
        ? await signInWithPassword(email.trim(), password)
        : await signUp(email.trim(), password, fullName.trim());
    setBusy(null);
    if (!res.ok) {
      setError(res.error === 'unconfigured' ? t('unconfiguredBody') : res.error ?? t('errGeneric'));
      return;
    }
    if (res.notice === 'confirm-email') setNotice(t('noticeConfirmEmail'));
  }

  async function magicLink() {
    reset();
    if (!email.trim()) {
      setError(t('errEmailRequired'));
      return;
    }
    setBusy('otp');
    const res = await signInWithOtp(email.trim());
    setBusy(null);
    if (!res.ok) {
      setError(res.error === 'unconfigured' ? t('unconfiguredBody') : res.error ?? t('errGeneric'));
      return;
    }
    if (res.notice === 'check-inbox') setNotice(t('noticeCheckInbox'));
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink mb-6">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden />
        {t('backToApp')}
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-layer-1 p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-dark to-brand flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <h1 className="text-lg font-bold text-slate-900">{t('loginTitle')}</h1>
        </div>
        <p className="text-sm text-slate-500 mb-6">{t('loginSubtitle')}</p>

        {!configured && (
          <div className="flex items-start gap-2 p-3 mb-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
            <span>{t('unconfiguredBody')}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 mb-5">
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                reset();
              }}
              className={`py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                mode === m ? 'bg-white text-brand shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m === 'signin' ? t('tabSignIn') : t('tabSignUp')}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1">
                {t('fullName')}
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none"
            />
          </div>

          {error && (
            <p className="flex items-start gap-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
              {error}
            </p>
          )}
          {notice && (
            <p className="flex items-start gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-xl px-3 py-2">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy !== null}
            className="w-full py-2.5 rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            {busy === mode && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {mode === 'signin' ? t('tabSignIn') : t('tabSignUp')}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          {t('orDivider')}
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={magicLink}
          disabled={busy !== null}
          className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-sm font-semibold flex items-center justify-center gap-2"
        >
          {busy === 'otp' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Mail className="w-4 h-4" aria-hidden />}
          {t('magicLink')}
        </button>
      </div>
    </div>
  );
}
