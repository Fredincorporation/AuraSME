'use client';

import { useLayoutEffect } from 'react';
import { useQuoteStore } from '@/store/useQuoteStore';

// The store skips automatic hydration so the server-rendered empty state and the first
// client render match; this pulls the saved session back in before the browser paints.
export const QuoteSessionBootstrap = () => {
  useLayoutEffect(() => {
    void useQuoteStore.persist.rehydrate();
  }, []);

  return null;
};
