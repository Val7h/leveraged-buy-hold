'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  TrendingUp,
  BarChart3,
  FlaskConical,
  Zap,
  Check,
  X,
} from 'lucide-react';
import BillingToggle, { type BillingPeriod } from '@/components/pricing/BillingToggle';
import TierCard, { type TierFeature } from '@/components/pricing/TierCard';
import FeatureTable from '@/components/pricing/FeatureTable';
import FAQ from '@/components/pricing/FAQ';

const trustChips = [
  { icon: Check, label: 'Trial Pro de 14 dias sem cartão' },
  { icon: Check, label: 'Cancele quando quiser' },
  { icon: Check, label: 'Cobrança em reais com NF emitida' },
];

const valueProps = [
  {
    icon: FlaskConical,
    title: 'Backtest quantitativo',
    desc: 'Avalie a estratégia em 20+ anos de histórico com Sharpe, Drawdown e CAGR.',
  },
  {
    icon: TrendingUp,
    title: 'Alavancagem adaptativa',
    desc: 'Sinais que ajustam a exposição ao mercado de acordo com indicadores objetivos.',
  },
  {
    icon: BarChart3,
    title: 'Comparação de cenários',
    desc: 'Confronte estratégias lado a lado e visualize a diferença nas curvas de capital.',
  },
  {
    icon: Zap,
    title: 'Sinais com alertas',
    desc: 'Classificações Oportunidade · Neutro · Desfavorável entregues por email ou WhatsApp.',
  },
];

const freeFeatures: TierFeature[] = [
  { text: '1 estratégia salva', highlight: true },
  { text: '1 ativo monitorado' },
  { text: 'Backtest com histórico de 5 anos' },
  { text: 'Visualização dos sinais quantitativos' },
  { text: 'Suporte pela comunidade' },
];

const proFeatures: TierFeature[] = [
  { text: '10 estratégias salvas', highlight: true },
  { text: 'Ativos ilimitados por estratégia' },
  { text: 'Backtest com 20+ anos de histórico' },
  { text: 'Alertas de sinais por email' },
  { text: 'Comparação entre estratégias' },
  { text: 'Suporte por email' },
  { text: 'Nota fiscal emitida' },
];

const premiumFeatures: TierFeature[] = [
  { text: 'Tudo do Pro, sem limites', highlight: true },
  { text: 'Estratégias e carteiras ilimitadas' },
  { text: 'Alertas por WhatsApp' },
  { text: 'Paper trading integrado' },
  { text: 'Exportação de relatórios PDF' },
  { text: 'Chave de API REST' },
  { text: 'Suporte prioritário em até 4h' },
];

export default function PricingPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<BillingPeriod>('yearly');
  const [comingSoon, setComingSoon] = useState<null | 'pro' | 'premium'>(null);

  const handleUpgrade = async (tier: 'pro' | 'premium') => {
    try {
      const res = await fetch(`/api/v1/billing/upgrade?tier=${tier}`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.status === 401) {
        router.push(`/login?next=/pricing`);
        return;
      }

      if (res.status === 501 || !res.ok) {
        setComingSoon(tier);
        return;
      }

      const data = await res.json().catch(() => null);
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      setComingSoon(tier);
    } catch {
      setComingSoon(tier);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* Coming-soon modal */}
      {comingSoon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-2xl max-w-md w-full relative p-6 sm:p-7">
            <button
              onClick={() => setComingSoon(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <Zap size={18} className="text-primary" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">
              Checkout em breve
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-5">
              O upgrade para o plano{' '}
              <strong className="text-text-primary">
                {comingSoon === 'pro' ? 'Pro' : 'Premium'}
              </strong>{' '}
              está em finalização. Deixe seu email no painel para ser avisado
              assim que a cobrança em reais for liberada.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setComingSoon(null)}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold bg-surface-2 text-text-primary border border-border hover:bg-background transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold bg-primary text-background hover:bg-primary/90 transition-colors"
              >
                Ir ao painel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs text-primary font-medium mb-6">
            <ShieldCheck size={13} /> Plataforma quantitativa para o investidor
            brasileiro
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary mb-5 leading-[1.1] tracking-tight">
            Comece grátis.
            <br />
            <span className="text-primary">Atualize quando precisar.</span>
          </h1>
          <p className="text-base sm:text-lg text-text-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
            Backtest, comparação de estratégias e sinais quantitativos em reais
            — com cobrança transparente e cancelamento em um clique.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-text-secondary mb-10">
            {trustChips.map(({ icon: Icon, label }, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <Icon size={14} className="text-success" />
                {label}
              </span>
            ))}
          </div>

          <BillingToggle value={period} onChange={setPeriod} />
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5 lg:gap-7 pt-4">
            <TierCard
              name="Free"
              tagline="Para conhecer a plataforma e validar a estratégia."
              monthlyPrice={0}
              yearlyPrice={0}
              period={period}
              features={freeFeatures}
              ctaLabel="Começar grátis"
              ctaSubtext="Sem cartão, sem prazo"
              onCta={() => router.push('/login')}
            />

            <TierCard
              name="Pro"
              tagline="Para o investidor ativo que opera com método quantitativo."
              monthlyPrice={59}
              yearlyPrice={566}
              period={period}
              features={proFeatures}
              ctaLabel="Iniciar trial de 14 dias"
              trialBadge="14 dias grátis · sem cartão"
              onCta={() => handleUpgrade('pro')}
              highlight
              badge="MAIS POPULAR"
            />

            <TierCard
              name="Premium"
              tagline="Para quem precisa de alertas em tempo real e integrações."
              monthlyPrice={159}
              yearlyPrice={1526}
              period={period}
              features={premiumFeatures}
              ctaLabel="Iniciar trial de 14 dias"
              ctaSubtext="Inclui WhatsApp e API"
              onCta={() => handleUpgrade('premium')}
            />
          </div>

          <p className="text-center text-xs text-text-muted mt-8 max-w-xl mx-auto">
            Preços em reais (BRL), com nota fiscal emitida. Os sinais
            quantitativos são classificações objetivas (Oportunidade · Neutro ·
            Desfavorável) e não constituem recomendação de investimento (Ofício-
            Circular CVM nº 04/2023).
          </p>
        </div>
      </section>

      {/* Value props */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-surface border-y border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-text-primary mb-3">
            O que está incluído em todos os planos
          </h2>
          <p className="text-center text-text-secondary text-sm mb-10 max-w-xl mx-auto">
            Mesmo no Free, você acessa a infraestrutura completa de dados e
            análise — os planos pagos liberam volume e integrações.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {valueProps.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                  <Icon size={18} className="text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1.5">
                  {title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature comparison */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <FeatureTable />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-surface border-y border-border">
        <FAQ />
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 tracking-tight">
            Pronto para testar sua estratégia hoje?
          </h2>
          <p className="text-text-secondary text-base mb-8 max-w-xl mx-auto leading-relaxed">
            Comece pelo Free para validar a plataforma — ou ative o trial de 14
            dias do Pro e tenha acesso completo, sem precisar cadastrar cartão.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => router.push('/login')}
              className="w-full sm:w-auto px-7 py-3.5 bg-surface border border-border text-text-primary rounded-xl font-semibold text-sm hover:bg-surface-2 transition-colors"
            >
              Começar grátis
            </button>
            <button
              onClick={() => handleUpgrade('pro')}
              className="w-full sm:w-auto px-7 py-3.5 bg-primary text-background rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Iniciar trial Pro de 14 dias
            </button>
          </div>
          <p className="text-xs text-text-muted mt-5">
            Sem cartão de crédito · Cancele quando quiser · NF emitida
          </p>
        </div>
      </section>
    </div>
  );
}
