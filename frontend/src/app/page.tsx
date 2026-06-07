"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, BarChart3, FlaskConical, Zap, ChevronRight, Check } from "lucide-react";
import Footer from "@/components/layout/Footer";

export default function Home() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      router.replace("/dashboard");
    } else {
      setHasToken(false);
    }
  }, [router]);

  // Aguardando checagem do token
  if (hasToken === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <span className="text-primary font-bold text-xs">L</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">LBH System</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
              Planos
            </Link>
            <Link
              href="/login"
              className="text-sm px-4 py-1.5 rounded-lg bg-primary text-background font-semibold hover:bg-primary/90 transition-colors"
            >
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-20 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs text-primary font-medium mb-6">
            <Zap size={12} /> Estratégia quantitativa para o investidor brasileiro
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-text-primary mb-6 leading-tight tracking-tight">
            Invista com alavancagem<br />
            <span className="text-primary">inteligente e controlada</span>
          </h1>
          <p className="text-lg text-text-secondary mb-8 max-w-xl mx-auto leading-relaxed">
            Backtest quantitativo, sinais automáticos e gestão de risco adaptativa.
            Tudo que você precisa para operar a estratégia Buy & Hold Alavancado.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Link
              href="/login"
              className="px-8 py-3.5 bg-primary text-background rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              Criar conta gratuita <ChevronRight size={16} />
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3.5 bg-surface border border-border text-text-primary rounded-lg font-semibold text-sm hover:bg-surface-2 transition-colors"
            >
              Ver planos e preços
            </Link>
          </div>
          <p className="text-xs text-text-muted">
            Sem cartão de crédito para o plano gratuito · Pro com 14 dias grátis
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 bg-surface border-y border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-text-primary mb-10">
            Tudo que você precisa para operar com disciplina
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: FlaskConical, title: "Backtest Profissional", desc: "Histórico de até 20 anos com Sharpe, Drawdown e CAGR." },
              { icon: TrendingUp, title: "Alavancagem Adaptativa", desc: "Ajuste automático baseado em condições de mercado." },
              { icon: BarChart3, title: "Monte Carlo", desc: "Simule milhares de cenários para medir risco real." },
              { icon: Zap, title: "Sinais em Tempo Real", desc: "Alertas de entrada e saída via email e painel." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="p-5 rounded-xl bg-background border border-border hover:border-primary/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                  <Icon size={16} className="text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
                <p className="text-xs text-text-secondary leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-text-primary mb-3">Dashboard pensado para o investidor sério</h2>
            <p className="text-text-secondary text-sm">Métricas em tempo real, sinais de mercado e gestão de carteira em um único lugar.</p>
          </div>
          {/* Mock dashboard preview */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-2xl shadow-black/40">
            {/* Fake browser bar */}
            <div className="bg-surface-2 border-b border-border px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-danger/40" />
                <div className="w-3 h-3 rounded-full bg-warning/40" />
                <div className="w-3 h-3 rounded-full bg-success/40" />
              </div>
              <div className="flex-1 mx-4 bg-background rounded px-3 py-1 text-[11px] text-text-muted">
                lbhsystem.com/dashboard
              </div>
            </div>
            {/* Fake dashboard content */}
            <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-border">
              {[
                { label: "Retorno Total", value: "+127.4%", color: "text-success" },
                { label: "Drawdown Máx.", value: "-18.2%", color: "text-danger" },
                { label: "Sharpe Ratio", value: "1.84", color: "text-primary" },
                { label: "Posições Ativas", value: "7", color: "text-text-primary" },
              ].map(({ label, value, color }, i) => (
                <div key={i} className="bg-background rounded-lg p-3 border border-border">
                  <p className="text-[10px] text-text-muted mb-1">{label}</p>
                  <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="p-5 flex items-center justify-center h-28 text-text-muted text-xs">
              <div className="text-center">
                <BarChart3 size={28} className="mx-auto mb-2 text-primary/30" />
                Gráfico de equity curve · Backtest 2019-2024
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 px-4 sm:px-6 bg-surface border-y border-border">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { value: "1.200+", label: "Backtests rodados" },
              { value: "14 dias", label: "Trial gratuito" },
              { value: "R$ 19", label: "Plano Pro por mês" },
            ].map(({ value, label }, i) => (
              <div key={i}>
                <p className="text-2xl sm:text-3xl font-bold text-primary mb-1">{value}</p>
                <p className="text-xs text-text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-3">Simples de começar</h2>
          <p className="text-text-secondary text-sm mb-8">Plano gratuito para sempre. Upgrade quando precisar.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-8">
            {[
              { plan: "Gratuito", price: "R$ 0/mês", items: ["5 screenings/mês", "1 backtest", "1 carteira", "Suporte comunidade"] },
              { plan: "Pro", price: "R$ 19/mês", items: ["Screening ilimitado", "10 backtests/mês", "5 carteiras", "Monte Carlo + Alertas"], highlight: true },
            ].map(({ plan, price, items, highlight }, i) => (
              <div key={i} className={`rounded-xl p-5 border ${highlight ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-text-primary">{plan}</span>
                  <span className={`text-sm font-bold ${highlight ? 'text-primary' : 'text-text-secondary'}`}>{price}</span>
                </div>
                <ul className="space-y-1.5">
                  {items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs text-text-secondary">
                      <Check size={12} className={highlight ? 'text-primary' : 'text-success'} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login" className="px-6 py-3 bg-primary text-background rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors">
              Começar gratuitamente
            </Link>
            <Link href="/pricing" className="px-6 py-3 border border-border text-text-primary rounded-lg font-semibold text-sm hover:bg-surface-2 transition-colors">
              Ver todos os planos
            </Link>
          </div>
        </div>
      </section>

      {/* Footer legal compartilhado */}
      <Footer />
    </div>
  );
}
