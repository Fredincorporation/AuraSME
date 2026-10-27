import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AuraSME | Cigna Healthcare UAE - SME Quoting at Scale',
  description: 'AI-Powered Group Quoting, Ingestion & Policy Lifecycle Engine for UAE SMEs',
};

/**
 * Root layout. The `<html>` shell deliberately lives in `app/[locale]/layout.tsx`
 * because `lang` and `dir` depend on the active locale segment.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
