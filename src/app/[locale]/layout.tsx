import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing, isRtl } from '@/i18n/routing';
import { HeaderNavigation } from '@/components/HeaderNavigation';
import { ConversationalCensusDrawer } from '@/components/ConversationalCensusDrawer';
import { QuoteSessionBootstrap } from '@/components/QuoteSessionBootstrap';
import { WorkspaceSync } from '@/components/WorkspaceSync';
import { AuthBootstrap } from '@/components/AuthBootstrap';
import { UaePassModal } from '@/components/UaePassModal';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AuraSME | Cigna Healthcare UAE - SME Quoting at Scale',
  description: 'AI-Powered Group Quoting, Ingestion & Policy Lifecycle Engine for UAE SMEs',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// The locale segment reads `params` for lang/dir, so the shell cannot be prerendered
// ahead of the request; block instead of streaming a placeholder layout.
export const instant = false;

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enables static rendering for this locale segment.
  setRequestLocale(locale);

  const dir = isRtl(locale) ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${notoArabic.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-canvas text-ink min-h-screen flex flex-col">
        <NextIntlClientProvider>
          <Suspense
            fallback={
              <div className="min-h-screen bg-canvas">
                <div className="h-16 w-full animate-pulse bg-slate-200" />
                <div className="mx-auto w-full max-w-6xl px-4 py-10">
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 w-2/3 rounded bg-slate-200" />
                    <div className="h-4 w-1/2 rounded bg-slate-200" />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="h-32 rounded bg-slate-200" />
                      <div className="h-32 rounded bg-slate-200" />
                      <div className="h-32 rounded bg-slate-200" />
                    </div>
                  </div>
                </div>
              </div>
            }
          >
            <AuthBootstrap />
            <QuoteSessionBootstrap />
            <WorkspaceSync />
            <HeaderNavigation />
            <main className="flex-1 pt-16">{children}</main>
            <ConversationalCensusDrawer />
            <UaePassModal />
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
