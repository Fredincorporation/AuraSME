import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Locale routing for every non-asset request. With `localePrefix: 'as-needed'`,
 * English URLs are unprefixed (`/census`) while Arabic is prefixed
 * (`/ar/census`). The middleware negotiates the locale from the cookie first,
 * then the `Accept-Language` header, so no bespoke redirect table is needed —
 * a hand-written redirect here would fight the prefix stripping and loop.
 */
const proxy = createMiddleware(routing);

export default proxy;

export const config = {
  // Skip Next internals, API routes, and anything with a file extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
