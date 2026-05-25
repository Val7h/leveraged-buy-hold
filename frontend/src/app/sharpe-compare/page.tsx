"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { backtestApi } from "@/lib/api";
import type { SharpeCompareResult, SharpeCompareItem } from "@/types";
import { BarChart3, RefreshCw, Download, TrendingUp, Skull, Search } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";

const DEFAULT_TICKERS = "NEE,SO,D,DUK,JNJ,PG,KO,PEP,MCD,T,VZ,O,MAIN,AFL,WM,MO,ABT,WEC,AEP,BRK-B";

function sharpeColor(v: number): string {
  if (v < 0)  return "text-danger";
  if (v < 1)  return "text-warning";
  if (v < 2)  return "text-text-primary";
  if (v < 3)  return "text-success";
  return "text-purple-400";
}

function sharpeBg(v: number): string {
  if (v < 0)  return "bg-danger/10";
  if (v < 1)  return "bg-warning/10";
  if (v < 2)  return "bg-surface-3";
  if (v < 3)  return "bg-success/10";
  return "bg-purple-500/10";
}

function exportCsv(items: SharpeCompareItem[], leverage: number, period: string) {
  const header = "Ticker,Beta,Retorno Total (%),CAGR (%),Volatilidade (%),Sharpe,Max Drawdown (%),Patrimônio Final,Sobreviveu,Margin Call Date";
  const rows = items.map((r) =>
    [
      r.ticker,
      r.beta.toFixed(3),
      r.retorno_total.toFixed(2),
      r.retorno_anualizado.toFixed(2),
      r.volatilidade.toFixed(2),
      r.sharpe.toFixed(3),
      r.max_drawdown.toFixed(2),
      r.final_equity.toFixed(2),
      r.margin_call ? "NÃO" : "SIM",
      r.margin_call_date ?? "",
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sharpe_compare_${leverage}x_${period.replace(/ /g, "").replace(/→/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SharpeComparePage() {
  const router = useRouter();
  const [tickers, setTickers]     = useState(DEFAULT_TICKERS);
  const [start, setStart]         = useState("2015-01-01");
  const [end, setEnd]             = useState("");
  const [leverage, setLeverage]   = useState(3.0);
  const [capital, setCapital]     = useState(10000);
  const [riskFree, setRiskFree]   = useState(0.05);
  const [result, setResult]       = useState<SharpeCompareResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const handleRun = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await backtestApi.sharpeCompare({
        tickers,
        start,
        end: end || undefined,
        leverage,
        capital,
        risk_free: riskFree,
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao executar comparação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-text-primary">Comparação Sharpe Alavancado</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Qual ativo merece mais alavancagem? Compare risco/retorno com margin call intraday.
          </p>
        </div>

        {/* Config */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div className="md:col-span-2">
              <label className="label">Tickers (separados por vírgula)</label>
              <input
                className="input font-mono uppercase"
                value={tickers}
                onChange={(e) => setTickers(e.target.value)}
                placeholder="NEE,SO,JNJ,PG,KO"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="label">Início</label>
              <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className="label">Fim (opcional)</label>
              <input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div>
              <label className="label">Alavancagem</label>
              <input className="input font-mono" type="number" step="0.5" min="1" max="10" value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Capital (USD)</label>
              <input className="input font-mono" type="number" value={capital} onChange={(e) => setCapital(Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Taxa Livre de Risco</label>
              <input className="input font-mono" type="number" step="0.01" min="0" max="0.20" value={riskFree} onChange={(e) => setRiskFree(Number(e.target.value))} placeholder="0.05" />
            </div>
          </div>
          <button onClick={handleRun} disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <BarChart3 size={14} />}
            {loading ? "Calculando..." : "Comparar Sharpe"}
          </button>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 text-sm text-danger mb-4">{error}</div>
        )}

        {loading && (
          <div className="card text-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-sm text-text-secondary">Simulando {tickers.split(",").length} ativos em paralelo...</p>
            <p className="text-xs text-text-muted mt-1">Pode levar alguns segundos</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-4 text-xs text-text-muted flex-wrap">
                <span>{result.items.length} ativos · {result.leverage}x alavancagem · {result.period}</span>
                <span className="text-success font-medium">
                  ✓ {result.items.filter((r) => !r.margin_call).length} sobreviventes
                </span>
                {result.items.filter((r) => r.margin_call).length > 0 && (
                  <span className="text-danger font-medium">
                    💀 {result.items.filter((r) => r.margin_call).length} liquidados
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const top10 = result.items
                      .filter((r) => !r.margin_call)
                      .slice(0, 10)
                      .map((r) => r.ticker)
                      .join(",");
                    router.push(`/assets?tickers=${encodeURIComponent(top10)}&autorun=1`);
                  }}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Search size={12} />
                  Analisar Top 10 no Screening
                </button>
                <button
                  onClick={() => exportCsv(result.items, result.leverage, result.period)}
                  className="btn-ghost text-xs flex items-center gap-1.5 border border-border"
                >
                  <Download size={12} />
                  Exportar CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="card overflow-x-auto">
              {/* Color legend */}
              <div className="flex gap-4 mb-4 flex-wrap">
                {[
                  { label: "Sharpe < 0", cls: "text-danger bg-danger/10" },
                  { label: "0 – 1",      cls: "text-warning bg-warning/10" },
                  { label: "1 – 2",      cls: "text-text-primary bg-surface-3" },
                  { label: "2 – 3",      cls: "text-success bg-success/10" },
                  { label: "> 3",        cls: "text-purple-400 bg-purple-500/10" },
                ].map((l) => (
                  <span key={l.label} className={`text-xs px-2 py-0.5 rounded font-mono ${l.cls}`}>
                    {l.label}
                  </span>
                ))}
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {["Ticker", "Beta", "Retorno Total", "CAGR", "Volatilidade", "Sharpe", "Max DD", "Patrimônio Final", "Status"].map((h) => (
                      <th key={h} className="text-left text-text-muted font-medium py-2 pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item, idx) => (
                    <tr
                      key={item.ticker}
                      onClick={() => router.push(`/assets?ticker=${item.ticker}`)}
                      className={`border-b border-border/40 cursor-pointer transition-colors ${
                        item.margin_call
                          ? "opacity-50 hover:opacity-70"
                          : "hover:bg-surface-2"
                      } ${idx === 0 && !item.margin_call ? "bg-primary/5" : ""}`}
                    >
                      <td className="py-2.5 pr-3">
                        <span className={`font-mono font-bold ${item.margin_call ? "text-text-muted" : "text-text-primary"}`}>
                          {item.ticker}
                        </span>
                        {idx === 0 && !item.margin_call && (
                          <span className="ml-1.5 badge bg-primary/10 border-primary/20 text-primary text-[10px]">MELHOR</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-text-secondary">{item.beta.toFixed(2)}</td>
                      <td className={`py-2.5 pr-3 font-mono font-semibold ${item.retorno_total >= 0 ? "text-success" : "text-danger"}`}>
                        {formatPercent(item.retorno_total)}
                      </td>
                      <td className={`py-2.5 pr-3 font-mono font-semibold ${item.retorno_anualizado >= 0 ? "text-success" : "text-danger"}`}>
                        {item.retorno_anualizado.toFixed(1)}%
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-text-secondary">{item.volatilidade.toFixed(1)}%</td>
                      <td className="py-2.5 pr-3">
                        <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${sharpeColor(item.sharpe)} ${sharpeBg(item.sharpe)}`}>
                          {item.sharpe.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-danger">{item.max_drawdown.toFixed(1)}%</td>
                      <td className="py-2.5 pr-3 font-mono font-semibold text-text-primary">
                        {formatCurrency(item.final_equity, "USD", true)}
                      </td>
                      <td className="py-2.5 pr-3">
                        {item.margin_call ? (
                          <div className="flex items-center gap-1">
                            <Skull size={12} className="text-danger" />
                            <span className="text-danger text-[10px]">
                              {item.margin_call_date ? item.margin_call_date.slice(0, 7) : "Liquidado"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <TrendingUp size={12} className="text-success" />
                            <span className="text-success text-[10px]">Sobreviveu</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sharpe reference */}
            <div className="card">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Interpretação do Sharpe Ratio
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                {[
                  { range: "< 0",   label: "Negativo",   desc: "Pior que a taxa livre de risco",     cls: "text-danger" },
                  { range: "0 – 1", label: "Aceitável",  desc: "Retorno modesto para o risco",       cls: "text-warning" },
                  { range: "1 – 2", label: "Bom",        desc: "Boa relação retorno/risco",          cls: "text-text-primary" },
                  { range: "2 – 3", label: "Muito Bom",  desc: "Excelente — raro em alavancagem",    cls: "text-success" },
                  { range: "> 3",   label: "Excepcional",desc: "Excepcional — provavelmente outlier",cls: "text-purple-400" },
                ].map((r) => (
                  <div key={r.range} className="bg-surface-2 rounded-lg p-2.5">
                    <p className={`font-mono font-bold ${r.cls}`}>{r.range}</p>
                    <p className="font-medium text-text-primary mt-0.5">{r.label}</p>
                    <p className="text-text-muted">{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="card text-center py-16">
            <BarChart3 size={40} className="text-text-muted mx-auto mb-4" />
            <p className="text-sm text-text-secondary">Configure os parâmetros e execute a comparação</p>
            <p className="text-xs text-text-muted mt-1">
              Simula Buy &amp; Hold alavancado para cada ativo com margin call intraday
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
