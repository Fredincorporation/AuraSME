import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

/** Locale codes as written in the URL, e.g. `/ar/dashboard`. */
export const routing = defineRouting({
  locales,
  defaultLocale,
  // English is the operational baseline; only prefix non-default locales.
  localePrefix: 'as-needed',
  localeCookie: {
    name: 'AURASME_LOCALE',
    maxAge: 60 * 60 * 24 * 365,
  },
});

export const rtlLocales: ReadonlySet<Locale> = new Set<Locale>(['ar']);

export function isRtl(locale: string): boolean {
  return rtlLocales.has(locale as Locale);
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
