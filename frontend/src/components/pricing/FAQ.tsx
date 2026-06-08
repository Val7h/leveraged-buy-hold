'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const defaultFaq: FAQItem[] = [
  {
    question: 'Posso cancelar a assinatura quando quiser?',
    answer:
      'Sim. O cancelamento é feito direto no painel da sua conta, sem ligações nem burocracia. Se cancelar durante o trial, não há nenhuma cobrança. Para assinantes pagos, o acesso continua até o fim do ciclo já pago.',
  },
  {
    question: 'Como funciona o trial de 14 dias do Pro?',
    answer:
      'Você começa o trial sem precisar cadastrar cartão de crédito. Durante 14 dias usa todas as funcionalidades do plano Pro. Se gostar, escolhe a forma de pagamento ao fim do período. Se preferir, basta deixar o trial expirar e a conta volta para o Free automaticamente.',
  },
  {
    question: 'Por que R$ 59 por mês é justo?',
    answer:
      'O Pro entrega backtest com 20+ anos de histórico, comparação entre estratégias e alertas por email — recursos que em plataformas internacionais custam de US$ 30 a US$ 100 por mês. Os preços foram calibrados para o mercado brasileiro, com cobrança em reais e nota fiscal emitida.',
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer:
      'Cartão de crédito (Visa, Mastercard, Elo, Amex), débito em conta e PIX recorrente. Pagamentos processados via Stripe, com criptografia ponta a ponta e certificação PCI DSS.',
  },
  {
    question: 'Vocês emitem nota fiscal?',
    answer:
      'Sim. A nota fiscal é emitida automaticamente após cada cobrança confirmada (mensal ou anual) e enviada para o email cadastrado. CNPJ disponível para quem precisa lançar como despesa empresarial.',
  },
  {
    question: 'Posso fazer upgrade ou downgrade do plano?',
    answer:
      'Sim, a qualquer momento. Upgrades são cobrados de forma proporcional ao tempo restante do ciclo. Downgrades passam a valer no próximo ciclo, sem perder o que já foi pago.',
  },
  {
    question: 'O sistema funciona com qualquer corretora?',
    answer:
      'O LBH System é uma plataforma de análise quantitativa: gera sinais e backtests, mas as ordens continuam sendo executadas na sua corretora preferida. Funciona com qualquer corretora nacional ou internacional.',
  },
  {
    question: 'Os sinais são recomendação de compra ou venda?',
    answer:
      'Não. Os sinais são classificações quantitativas (Oportunidade, Neutro, Desfavorável) baseadas em indicadores objetivos, conforme o Ofício-Circular CVM nº 04/2023. Toda decisão de investimento é responsabilidade do usuário.',
  },
];

interface FAQProps {
  items?: FAQItem[];
}

export default function FAQ({ items = defaultFaq }: FAQProps) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-3">
        Perguntas frequentes
      </h2>
      <p className="text-center text-text-secondary text-sm mb-10">
        Tudo que você precisa saber antes de começar.
      </p>

      <div className="space-y-2.5">
        {items.map((item, idx) => {
          const isOpen = open === idx;
          return (
            <div
              key={idx}
              className={`rounded-xl border overflow-hidden transition-colors ${
                isOpen ? 'border-primary/40 bg-surface' : 'border-border bg-surface'
              }`}
            >
              <button
                onClick={() => setOpen(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="w-full px-5 py-4 text-left flex justify-between items-center gap-4 hover:bg-surface-2/50 transition-colors"
              >
                <span className="text-sm sm:text-base font-medium text-text-primary">
                  {item.question}
                </span>
                <ChevronDown
                  size={18}
                  className={`flex-shrink-0 text-text-muted transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-200 ease-out ${
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-5 pb-4 pt-0 text-sm text-text-secondary leading-relaxed">
                    {item.answer}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
