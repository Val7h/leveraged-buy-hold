'use client';

import React from 'react';
import { Check, Minus } from 'lucide-react';

type CellValue = boolean | string;

interface FeatureRow {
  label: string;
  free: CellValue;
  pro: CellValue;
  premium: CellValue;
}

interface FeatureSection {
  title: string;
  rows: FeatureRow[];
}

const sections: FeatureSection[] = [
  {
    title: 'Estratégias e ativos',
    rows: [
      { label: 'Estratégias salvas', free: '1', pro: '10', premium: 'Ilimitado' },
      { label: 'Ativos por estratégia', free: '1', pro: 'Ilimitado', premium: 'Ilimitado' },
      { label: 'Carteiras simultâneas', free: '1', pro: '5', premium: 'Ilimitado' },
    ],
  },
  {
    title: 'Backtest e análise',
    rows: [
      { label: 'Histórico de backtest', free: '5 anos', pro: '20+ anos', premium: '20+ anos' },
      { label: 'Comparação entre estratégias', free: false, pro: true, premium: true },
      { label: 'Paper trading', free: false, pro: false, premium: true },
      { label: 'Exportação de relatórios PDF', free: false, pro: false, premium: true },
    ],
  },
  {
    title: 'Sinais e alertas',
    rows: [
      { label: 'Sinais quantitativos', free: 'Apenas visualização', pro: 'Com alertas', premium: 'Com alertas' },
      { label: 'Alertas por email', free: false, pro: true, premium: true },
      { label: 'Alertas por WhatsApp', free: false, pro: false, premium: true },
    ],
  },
  {
    title: 'Integrações e suporte',
    rows: [
      { label: 'Chave de API', free: false, pro: false, premium: true },
      { label: 'Suporte', free: 'Comunidade', pro: 'Email', premium: 'Prioritário (4h)' },
      { label: 'Nota fiscal emitida', free: false, pro: true, premium: true },
    ],
  },
];

function renderCell(value: CellValue, accent = false) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check
        size={18}
        className={`mx-auto ${accent ? 'text-primary' : 'text-success'}`}
        aria-label="Incluído"
      />
    ) : (
      <Minus size={16} className="mx-auto text-text-muted opacity-40" aria-label="Não incluído" />
    );
  }
  return (
    <span className={`text-sm ${accent ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
      {value}
    </span>
  );
}

export default function FeatureTable() {
  return (
    <div className="w-full">
      <h2 className="text-2xl sm:text-3xl font-bold text-text-primary text-center mb-3">
        Compare os planos em detalhes
      </h2>
      <p className="text-center text-text-secondary text-sm mb-10 max-w-xl mx-auto">
        Todos os planos incluem dados de mercado atualizados, métricas de risco e relatórios visuais.
      </p>

      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left py-4 px-6 text-sm font-semibold text-text-primary w-[40%]">
                Recurso
              </th>
              <th className="py-4 px-4 text-sm font-semibold text-text-secondary text-center">
                Free
              </th>
              <th className="py-4 px-4 text-sm font-bold text-primary text-center bg-primary/5">
                Pro
              </th>
              <th className="py-4 px-4 text-sm font-semibold text-text-primary text-center">
                Premium
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section, si) => (
              <React.Fragment key={si}>
                <tr className="bg-surface-2/40">
                  <td
                    colSpan={4}
                    className="py-2.5 px-6 text-xs font-bold uppercase tracking-wider text-text-muted"
                  >
                    {section.title}
                  </td>
                </tr>
                {section.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-t border-border/60 hover:bg-surface-2/30 transition-colors"
                  >
                    <td className="py-3.5 px-6 text-sm text-text-secondary">{row.label}</td>
                    <td className="py-3.5 px-4 text-center">{renderCell(row.free)}</td>
                    <td className="py-3.5 px-4 text-center bg-primary/5">
                      {renderCell(row.pro, true)}
                    </td>
                    <td className="py-3.5 px-4 text-center">{renderCell(row.premium)}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked view */}
      <div className="md:hidden space-y-6">
        {sections.map((section, si) => (
          <div key={si} className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="px-4 py-2.5 bg-surface-2 text-xs font-bold uppercase tracking-wider text-text-muted">
              {section.title}
            </div>
            <div className="divide-y divide-border/60">
              {section.rows.map((row, ri) => (
                <div key={ri} className="px-4 py-3">
                  <div className="text-sm text-text-primary font-medium mb-2">
                    {row.label}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                        Free
                      </div>
                      {renderCell(row.free)}
                    </div>
                    <div className="bg-primary/5 rounded-md py-1">
                      <div className="text-[10px] uppercase tracking-wider text-primary font-bold mb-1">
                        Pro
                      </div>
                      {renderCell(row.pro, true)}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                        Premium
                      </div>
                      {renderCell(row.premium)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
