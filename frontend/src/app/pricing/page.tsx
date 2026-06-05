'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, ShieldCheck, TrendingUp, BarChart3, FlaskConical, Zap } from 'lucide-react';
import CheckoutForm from '@/components/CheckoutForm';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

const pricingTiers = [
  {
    name: 'Gratuito',
    price: 'R$ 0',
    period: '/mês',
    description: 'Para começar a explorar a estratégia LBH',
    cta: 'Criar conta grátis',
    highlight: false,
    features: [
      { text: 'Screening de até 5 ativos/mês', included: true },
      { text: '1 backtest (histórico de 5 anos)', included: true },
      { text: '1 carteira', included: true },
      { text: 'Suporte pela comunidade', included: true },
      { text: 'Exportação CSV básica', included: true },
      { text: 'Screening ilimitado', included: false },
      { text: 'Análise Monte Carlo', included: false },
      { text: 'Suporte por email', included: false },
      { text: 'Relatórios em PDF', included: false },
      { text: 'Acesso à API', included: false },
    ],
  },
  {
    name: 'Pro',
    price: 'R$ 19',
    period: '/mês',
    description: 'Para investidores ativos com estratégia quantitativa',
    cta: 'Testar grátis por 14 dias',
    highlight: true,
    features: [
      { text: 'Screening ilimitado de ativos', included: true },
      { text: '10 backtests/mês (histórico de 20 anos)', included: true },
      { text: '5 carteiras', included: true },
      { text: 'Alertas de preço e valor (até 20)', included: true },
      { text: 'Simulação Monte Carlo', included: true },
      { text: 'Relatórios em PDF', included: true },
      { text: 'Suporte por email (resp. em 24h)', included: true },
      { text: 'Sem anúncios', included: true },
      { text: 'Acesso à API REST', included: false },
      { text: 'Marca branca', included: false },
    ],
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    period: '',
    description: 'Para assessores e gestoras profissionais',
    cta: 'Falar com vendas',
    highlight: false,
    features: [
      { text: 'Tudo do plano Pro incluído', included: true },
      { text: 'Backtests ilimitados (histórico total)', included: true },
      { text: 'Carteiras e pastas ilimitadas', included: true },
      { text: 'Alertas ilimitados (100+)', included: true },
      { text: 'Marca branca e personalização', included: true },
      { text: 'Acesso completo à API REST', included: true },
      { text: 'Webhooks e integrações', included: true },
      { text: 'Gerente de conta dedicado', included: true },
      { text: 'Suporte via Slack e telefone', included: true },
      { text: 'SLA de 99,9% de disponibilidade', included: true },
    ],
  },
];

const features = [
  { icon: FlaskConical, title: 'Backtest Quantitativo', desc: 'Teste sua estratégia em até 20 anos de dados históricos com métricas profissionais (Sharpe, Drawdown, CAGR).' },
  { icon: TrendingUp, title: 'Alavancagem Adaptativa', desc: 'Algoritmo que ajusta automaticamente o nível de alavancagem com base nas condições de mercado.' },
  { icon: BarChart3, title: 'Monte Carlo', desc: 'Simule milhares de cenários futuros para entender o risco real da sua carteira.' },
  { icon: Zap, title: 'Sinais em Tempo Real', desc: 'Alertas automáticos de entrada e saída com base nos indicadores quantitativos da estratégia.' },
];

const faqItems = [
  {
    question: 'Como funciona o período de teste grátis?',
    answer: 'Ao assinar o Pro, você tem 14 dias de acesso completo a todas as funcionalidades sem nenhuma cobrança. O cartão é solicitado no cadastro, mas só é debitado a partir do 15º dia. Cancele a qualquer momento antes disso sem custo.',
  },
  {
    question: 'Por que R$ 19 por mês?',
    answer: 'O valor foi definido para equilibrar acessibilidade com qualidade. Ferramentas equivalentes para investidores profissionais custam centenas de reais. Nosso objetivo é democratizar o acesso a estratégias quantitativas para o investidor brasileiro.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim, sem burocracia. Cancele diretamente no painel de configurações da sua conta. Se cancelar antes do 15º dia, não há cobrança. Assinantes pagos mantêm acesso até o fim do ciclo atual.',
  },
  {
    question: 'O sistema funciona com qualquer corretora?',
    answer: 'O LBH System é uma plataforma de análise e sinais — você executa as operações na sua corretora preferida. Funciona com qualquer corretora que ofereça alavancagem (ex: corretoras internacionais com acesso a ETFs alavancados).',
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer: 'Aceitamos cartões de crédito e débito (Visa, Mastercard, Amex) via Stripe. O pagamento é seguro, criptografado e certificado PCI DSS.',
  },
  {
    question: 'O que acontece se meu pagamento falhar?',
    answer: 'Tentamos automaticamente por 3 dias. Se o pagamento não for processado, você recebe um email para atualizar os dados. Há um período de carência antes de perder o acesso Pro.',
  },
  {
    question: 'Vocês oferecem reembolso?',
    answer: 'Sim. Se cancelar em até 7 dias após a primeira cobrança, reembolsamos integralmente. Após esse período, não há reembolso — mas você pode cancelar a renovação.',
  },
  {
    question: 'Posso fazer upgrade ou downgrade do plano?',
    answer: 'Sim, a qualquer momento. Upgrades são cobrados proporcionalmente. Downgrades entram em vigor no próximo ciclo de cobrança.',
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const handleCTA = (tierName: string) => {
    if (tierName === 'Gratuito') {
      router.push('/login');
    } else if (tierName === 'Pro') {
      setShowCheckout(true);
    } else {
      window.location.href = 'mailto:contato@lbhsystem.com?subject=Plano%20Enterprise';
    }
  };

  return (
    <>
      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-xl shadow-2xl max-w-md w-full relative">
            <button
              onClick={() => setShowCheckout(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
            <div className="p-6">
              <Elements stripe={stripePromise}>
                <CheckoutForm tier="pro" />
              </Elements>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-background text-text-primary">

        {/* Hero */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 text-center border-b border-border">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs text-primary font-medium mb-6">
              <ShieldCheck size={13} /> Plataforma quantitativa para investidor brasileiro
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-4 leading-tight">
              Preços simples e<br />transparentes
            </h1>
            <p className="text-lg text-text-secondary mb-8">
              Comece gratuitamente. Faça upgrade quando precisar de mais poder.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-text-secondary">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-success" /> 14 dias grátis no Pro</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-success" /> Cancele quando quiser</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-success" /> Pagamento seguro via Stripe</span>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pricingTiers.map((tier, idx) => (
                <div
                  key={idx}
                  className={`relative rounded-xl flex flex-col transition-all duration-200 ${
                    tier.highlight
                      ? 'ring-2 ring-primary bg-surface shadow-xl shadow-primary/10'
                      : 'bg-surface border border-border hover:border-border/80'
                  }`}
                >
                  {tier.highlight && (
                    <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                      <span className="bg-primary text-background px-3 py-1 rounded-full text-xs font-bold">
                        Mais popular
                      </span>
                    </div>
                  )}

                  <div className="p-6 flex-1">
                    <h3 className="text-lg font-bold text-text-primary mb-1">{tier.name}</h3>
                    <p className="text-xs text-text-muted mb-5 min-h-[2.5rem]">{tier.description}</p>

                    <div className="mb-6">
                      <span className="text-4xl font-bold text-text-primary">{tier.price}</span>
                      <span className="text-text-muted text-sm ml-1">{tier.period}</span>
                    </div>

                    <button
                      onClick={() => handleCTA(tier.name)}
                      className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all mb-6 ${
                        tier.highlight
                          ? 'bg-primary text-background hover:bg-primary/90 active:scale-[0.98]'
                          : 'bg-surface-2 text-text-primary hover:bg-surface border border-border'
                      }`}
                    >
                      {tier.cta}
                    </button>

                    <ul className="space-y-2.5">
                      {tier.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2.5 text-xs">
                          {f.included
                            ? <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                            : <X className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5 opacity-40" />}
                          <span className={f.included ? 'text-text-secondary' : 'text-text-muted opacity-50 line-through'}>
                            {f.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-surface border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-text-primary mb-10">
              O que você obtém com o LBH System
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {features.map(({ icon: Icon, title, desc }, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl bg-background border border-border">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-text-primary text-center mb-8">Perguntas frequentes</h2>
            <div className="space-y-2">
              {faqItems.map((item, idx) => (
                <div key={idx} className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full px-5 py-4 text-left text-sm font-medium text-text-primary hover:bg-surface-2 flex justify-between items-center transition-colors"
                  >
                    {item.question}
                    <span className={`text-text-muted transition-transform duration-200 ${expandedFaq === idx ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-5 py-4 bg-surface border-t border-border text-sm text-text-secondary leading-relaxed">
                      {item.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Bottom */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-primary/5 border-t border-primary/10">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-text-primary mb-3">Pronto para começar?</h2>
            <p className="text-text-secondary text-sm mb-6">
              Crie sua conta gratuita ou experimente o Pro por 14 dias sem custo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/login')}
                className="px-6 py-3 bg-surface border border-border text-text-primary rounded-lg font-semibold text-sm hover:bg-surface-2 transition-colors"
              >
                Começar gratuitamente
              </button>
              <button
                onClick={() => setShowCheckout(true)}
                className="px-6 py-3 bg-primary text-background rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Testar Pro — 14 dias grátis
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
