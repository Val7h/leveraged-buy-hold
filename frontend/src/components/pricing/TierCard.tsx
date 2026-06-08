'use client';

import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import type { BillingPeriod } from './BillingToggle';

export interface TierFeature {
  text: string;
  highlight?: boolean;
}

export interface TierCardProps {
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  period: BillingPeriod;
  features: TierFeature[];
  ctaLabel: string;
  ctaSubtext?: string;
  onCta: () => void;
  highlight?: boolean;
  badge?: string;
  trialBadge?: string;
  disabled?: boolean;
}

function formatPrice(value: number): string {
  if (value === 0) return 'R$ 0';
  return `R$ ${value.toLocaleString('pt-BR')}`;
}

export default function TierCard({
  name,
  tagline,
  monthlyPrice,
  yearlyPrice,
  period,
  features,
  ctaLabel,
  ctaSubtext,
  onCta,
  highlight = false,
  badge,
  trialBadge,
  disabled = false,
}: TierCardProps) {
  const isYearly = period === 'yearly';
  const displayPrice = isYearly ? Math.round(yearlyPrice / 12) : monthlyPrice;
  const totalYearly = yearlyPrice;
  const monthlyEquivalent = monthlyPrice * 12;
  const savings = monthlyEquivalent - totalYearly;

  return (
    <div
      className={`relative rounded-2xl flex flex-col transition-all duration-200 ${
        highlight
          ? 'ring-2 ring-primary bg-surface shadow-2xl shadow-primary/20 md:scale-[1.03] md:-translate-y-1'
          : 'bg-surface border border-border hover:border-border/70'
      }`}
    >
      {badge && (
        <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
          <span className="bg-primary text-background px-3.5 py-1 rounded-full text-xs font-bold tracking-wide inline-flex items-center gap-1.5 shadow-md">
            <Sparkles size={12} /> {badge}
          </span>
        </div>
      )}

      <div className="p-6 sm:p-7 flex-1 flex flex-col">
        <div className="mb-5">
          <h3 className="text-xl font-bold text-text-primary mb-1.5">{name}</h3>
          <p className="text-sm text-text-secondary leading-snug min-h-[2.5rem]">
            {tagline}
          </p>
        </div>

        <div className="mb-6">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl sm:text-5xl font-bold text-text-primary">
              {formatPrice(displayPrice)}
            </span>
            {monthlyPrice > 0 && (
              <span className="text-text-muted text-sm">/mês</span>
            )}
          </div>
          <div className="mt-2 min-h-[1.25rem] text-xs">
            {monthlyPrice === 0 && (
              <span className="text-text-muted">para sempre</span>
            )}
            {monthlyPrice > 0 && isYearly && (
              <span className="text-success">
                {formatPrice(totalYearly)}/ano · economia de {formatPrice(savings)}
              </span>
            )}
            {monthlyPrice > 0 && !isYearly && (
              <span className="text-text-muted">
                ou {formatPrice(yearlyPrice)}/ano (-20%)
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onCta}
          disabled={disabled}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all mb-3 ${
            highlight
              ? 'bg-primary text-background hover:bg-primary/90 active:scale-[0.98] shadow-lg shadow-primary/20'
              : 'bg-surface-2 text-text-primary hover:bg-background border border-border'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {ctaLabel}
        </button>

        <div className="min-h-[1.25rem] mb-5 text-center">
          {trialBadge && (
            <span className="text-xs text-success font-medium">
              {trialBadge}
            </span>
          )}
          {!trialBadge && ctaSubtext && (
            <span className="text-xs text-text-muted">{ctaSubtext}</span>
          )}
        </div>

        <ul className="space-y-3 mt-auto">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <Check
                className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  highlight ? 'text-primary' : 'text-success'
                }`}
              />
              <span
                className={
                  f.highlight
                    ? 'text-text-primary font-medium'
                    : 'text-text-secondary'
                }
              >
                {f.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
