'use client';

import React from 'react';

export type BillingPeriod = 'monthly' | 'yearly';

interface BillingToggleProps {
  value: BillingPeriod;
  onChange: (value: BillingPeriod) => void;
  discountLabel?: string;
}

export default function BillingToggle({
  value,
  onChange,
  discountLabel = '-20%',
}: BillingToggleProps) {
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div
        role="tablist"
        aria-label="Periodicidade de cobrança"
        className="inline-flex items-center bg-surface-2 border border-border rounded-full p-1 relative"
      >
        <button
          role="tab"
          aria-selected={value === 'monthly'}
          onClick={() => onChange('monthly')}
          className={`relative z-10 px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            value === 'monthly'
              ? 'bg-primary text-background'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Mensal
        </button>
        <button
          role="tab"
          aria-selected={value === 'yearly'}
          onClick={() => onChange('yearly')}
          className={`relative z-10 px-5 py-2 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-2 ${
            value === 'yearly'
              ? 'bg-primary text-background'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Anual
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              value === 'yearly'
                ? 'bg-background/20 text-background'
                : 'bg-success/15 text-success'
            }`}
          >
            {discountLabel}
          </span>
        </button>
      </div>
      <p className="text-xs text-text-muted">
        {value === 'yearly'
          ? 'Cobrança anual com economia de 20%'
          : 'Cobrança mensal, cancele quando quiser'}
      </p>
    </div>
  );
}
