'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

export type WorkflowStep = 'company' | 'census' | 'configure' | 'summary';

const STEP_ORDER: WorkflowStep[] = ['company', 'census', 'configure', 'summary'];

interface WorkflowStepperProps {
  /** The step the user is currently on. */
  current: WorkflowStep;
}

/**
 * Top progress stepper shared by the four-step quoting flow. Completed steps
 * render with a check, the active step is highlighted, and later steps dim out.
 */
export const WorkflowStepper = ({ current }: WorkflowStepperProps) => {
  const t = useTranslations('Stepper');
  const currentIndex = STEP_ORDER.indexOf(current);

  return (
    <div className="w-full bg-surface rounded-xl border-border shadow-layer-1 p-4">
      <ol className="flex items-center justify-between max-w-4xl mx-auto">
        {STEP_ORDER.map((step, index) => {
          const isComplete = index < currentIndex;
          const isActive = index === currentIndex;

          return (
            <li key={step} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  aria-hidden
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isComplete
                      ? 'bg-brand-success text-white'
                      : isActive
                        ? 'bg-brand text-white ring-4 ring-brand/15'
                        : 'bg-surface-subtle text-ink-muted'
                  }`}
                >
                  {isComplete ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-micro uppercase font-bold tracking-wider ${
                      isComplete
                        ? 'text-brand-success'
                        : isActive
                          ? 'text-brand'
                          : 'text-ink-muted'
                    }`}
                  >
                    {isActive
                      ? `${t('step', { number: index + 1 })} • ${t('active')}`
                      : t('step', { number: index + 1 })}
                  </span>
                  <span
                    className={`text-xs whitespace-nowrap ${
                      isActive ? 'font-bold text-ink' : 'font-medium text-slate-600'
                    }`}
                  >
                    {t(step)}
                  </span>
                </div>
              </div>

              {index < STEP_ORDER.length - 1 && (
                <div
                  aria-hidden
                  className={`flex-1 h-0.5 mx-3 rounded ${
                    isComplete ? 'bg-brand-success' : 'bg-border'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
