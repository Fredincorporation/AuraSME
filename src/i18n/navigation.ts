import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware navigation primitives. Always import `Link`, `useRouter` and
 * `usePathname` from here instead of `next/link` / `next/navigation` so that
 * hrefs keep the active locale prefix (e.g. `/ar/dashboard`).
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
