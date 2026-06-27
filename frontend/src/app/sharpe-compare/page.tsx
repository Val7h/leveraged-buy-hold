"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { backtestApi } from "@/lib/api";
import type { SharpeCompareResult, SharpeCompareItem } from "@/types";
import { BarChart3, RefreshCw, Download, TrendingUp, Skull, Search } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import TickerLogo from "@/components/ui/TickerLogo";

const DEFAULT_TICKERS = "NEE,SO,D,DUK,JNJ,PG,KO,PEP,MCD,T,VZ,O,MAIN,AFL,WM,MO,ABT,WEC,AEP,BRK-B";

const SHARPE_PRESETS: Record<string, { label: string; flag: string; tickers: string }> = {
  // ── EUA Defensivos ────────────────────────────────────────────────────────
  defensivas:    { label: "Defensivas EUA",    flag: "🇺🇸", tickers: "NEE,SO,D,DUK,JNJ,PG,KO,PEP,MCD,T,VZ,O,MAIN,AFL,WM,MO,ABT,WEC,AEP,BRK-B" },
  utilities:     { label: "Utilities EUA",     flag: "🇺🇸", tickers: "NEE,SO,D,DUK,AEP,WEC,ES,EXC,PCG,ETR,AWK,CMS,NI,OGE,PNW" },
  healthcare:    { label: "Healthcare",        flag: "🇺🇸", tickers: "JNJ,ABT,MDT,BMY,PFE,MRK,UNH,CVS,CI,ELV,HCA,ABBV,AMGN,GILD,BIIB" },
  consumo:       { label: "Consumo Básico",    flag: "🇺🇸", tickers: "PG,KO,PEP,MO,CL,GIS,K,CPB,HRL,SJM,CAG,MKC,HSY,CLX,CHD" },
  dividendos:    { label: "Dividendos EUA",    flag: "🇺🇸", tickers: "O,MAIN,STAG,MO,T,VZ,AFL,BEN,WPC,NNN,ADC,IIPR,GAIN,HTGC,ARCC" },
  reits:         { label: "REITs",             flag: "🏢",  tickers: "O,WPC,NNN,STAG,ADC,VICI,AMT,CCI,EQIX,PLD,SPG,PSA,EXR,MAA,UDR" },
  // ── EUA Tech & Growth ─────────────────────────────────────────────────────
  bigtech:       { label: "Big Tech",          flag: "💻",  tickers: "AAPL,MSFT,GOOGL,AMZN,META,NVDA,TSLA,NFLX,ORCL,ADBE" },
  tech_mid:      { label: "Tech Mid Cap",      flag: "💻",  tickers: "CRM,NOW,SNOW,DDOG,ZS,CRWD,NET,PLTR,ANET,MRVL,AMD,QCOM,TXN,AVGO,KLAC" },
  fintech:       { label: "Fintech",           flag: "💳",  tickers: "V,MA,PYPL,SQ,FIS,FISV,GPN,AFRM,SOFI,NU" },
  industrials:   { label: "Industriais EUA",   flag: "🏭",  tickers: "CAT,DE,HON,MMM,GE,RTX,LMT,NOC,BA,UPS,FDX,CSX,UNP,NSC,WAB" },
  // ── ETFs ──────────────────────────────────────────────────────────────────
  etfs_amplos:   { label: "ETFs Amplos",       flag: "📊",  tickers: "SPY,QQQ,IWM,DIA,VTI,VOO,IVV,RSP,MDY,IJH" },
  etfs_setor:    { label: "ETFs Setoriais",    flag: "📊",  tickers: "XLK,XLF,XLE,XLV,XLU,XLI,XLB,XLP,XLY,XLRE,XLC,XBI,GDX,SLX,KRE" },
  etfs_global:   { label: "ETFs Globais",      flag: "🌍",  tickers: "VEA,VWO,EEM,EWJ,EWZ,MCHI,INDA,IEMG,VGK,EFA,AGG,BND,TLT,GLD,SLV" },
  etfs_tematico: { label: "ETFs Temáticos",    flag: "🚀",  tickers: "ARKK,ARKG,ARKF,ARKQ,ARKW,BOTZ,ROBO,ICLN,QCLN,LIT,DRIV,JETS,MSOS,BLOK,METV" },
  etfs_lev:      { label: "ETFs Alavancados",  flag: "⚡",  tickers: "TQQQ,UPRO,SPXL,TECL,SOXL,UDOW,TNA,FAS,LABU,CURE" },
  // ── Cripto ────────────────────────────────────────────────────────────────
  cripto_acoes:  { label: "Cripto (Ações)",    flag: "₿",   tickers: "COIN,MSTR,RIOT,MARA,CLSK,CIFR,HUT,BTBT,BTDR,IREN" },
  tokenized:     { label: "Tokenizadas Bitget",flag: "🪙",  tickers: "TSLAONUSDT,NVDAONUSDT,AAPLONUSDT,AMZNONUSDT,GOOGLONUSDT,MSFTONUSDT,METAONUSDT" },
  // ── B3 ────────────────────────────────────────────────────────────────────
  b3_def:        { label: "B3 Defensivas",     flag: "🇧🇷", tickers: "TAEE11.SA,EGIE3.SA,CPFE3.SA,ENGI11.SA,TRPL4.SA,VIVT3.SA,TIMS3.SA,SAPR11.SA,SBSP3.SA,CPLE6.SA" },
  b3_bancos:     { label: "B3 Bancos",         flag: "🇧🇷", tickers: "ITUB4.SA,BBDC4.SA,BBAS3.SA,SANB11.SA,BPAC11.SA,ITSA4.SA,BBSE3.SA,WIZS3.SA" },
  b3_cresc:      { label: "B3 Crescimento",    flag: "🇧🇷", tickers: "WEGE3.SA,RENT3.SA,RDOR3.SA,RADL3.SA,TOTS3.SA,INTB3.SA,EMBR3.SA,PRIO3.SA,HAPV3.SA" },
  b3_comod:      { label: "B3 Commodities",    flag: "🇧🇷", tickers: "VALE3.SA,PETR4.SA,GGBR4.SA,CSNA3.SA,USIM5.SA,SUZB3.SA,KLBN11.SA,JBSS3.SA,BRFS3.SA,SMTO3.SA" },
  b3_energia:    { label: "B3 Energia",        flag: "🇧🇷", tickers: "TAEE11.SA,EGIE3.SA,CPFE3.SA,ENGI11.SA,TRPL4.SA,CMIG4.SA,ELET3.SA,EQTL3.SA,NEOE3.SA,AURE3.SA" },
  b3_top20:      { label: "B3 Top 20",         flag: "🇧🇷", tickers: "PETR4.SA,VALE3.SA,ITUB4.SA,BBDC4.SA,ABEV3.SA,WEGE3.SA,BBAS3.SA,RDOR3.SA,RENT3.SA,HAPV3.SA,BPAC11.SA,SUZB3.SA,RADL3.SA,EGIE3.SA,TAEE11.SA,KLBN11.SA,EQTL3.SA,VIVT3.SA,FLRY3.SA,SANB11.SA" },
  // ── Mix ───────────────────────────────────────────────────────────────────
  global_mix:    { label: "Global Mix",        flag: "🌐",  tickers: "AAPL,JNJ,NEE,KO,O,MSFT,PG,VZ,T,ABT,MCD,PEP,MMM,SO,WEC" },
};

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

// Calmar (CAGR/|MaxDD|) — métrica nativa do alavancado, critério principal de rank.
function calmarColor(v: number): string {
  if (v <= -99) return "text-danger";       // liquidado (sentinela)
  if (v < 0)    return "text-danger";
  if (v < 0.5)  return "text-warning";
  if (v < 1)    return "text-text-primary";
  if (v < 2)    return "text-success";
  return "text-purple-400";
}
function calmarBg(v: number): string {
  if (v <= -99) return "bg-danger/10";
  if (v < 0)    return "bg-danger/10";
  if (v < 0.5)  return "bg-warning/10";
  if (v < 1)    return "bg-surface-3";
  if (v < 2)    return "bg-success/10";
  return "bg-purple-500/10";
}

// Margin buffer: quão perto o LOW chegou da liquidação (%). Menor = mais perigoso.
function bufferColor(v: number | null): string {
  if (v === null)  return "text-text-muted";  // sem alavancagem
  if (v <= 0)      return "text-danger";       // liquidou
  if (v < 15)      return "text-danger";       // raspou a liquidação
  if (v < 40)      return "text-warning";
  if (v < 100)     return "text-text-primary";
  return "text-success";
}

function fmtCalmar(v: number): string {
  if (v <= -99) return "—";
  return v.toFixed(2);
}
function fmtSortino(v: number): string {
  if (v <= -99) return "—";
  return v.toFixed(2);
}
function fmtBuffer(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(0)}%`;
}

function exportCsv(items: SharpeCompareItem[], leverage: number, period: string) {
  const header = "Ticker,Beta,Retorno Total (%),CAGR (%),Volatilidade (%),Calmar,Sortino,Sharpe,Max Drawdown (%),Margin Buffer (%),Max Lev Sobrevivente,Patrimônio Final,Sobreviveu,Margin Call Date";
  const rows = items.map((r) =>
    [
      r.ticker,
      r.beta.toFixed(3),
      r.retorno_total.toFixed(2),
      r.retorno_anualizado.toFixed(2),
      r.volatilidade.toFixed(2),
      r.calmar <= -99 ? "" : r.calmar.toFixed(3),
      r.sortino <= -99 ? "" : r.sortino.toFixed(3),
      r.sharpe.toFixed(3),
      r.max_drawdown.toFixed(2),
      r.margin_buffer === null ? "" : r.margin_buffer.toFixed(2),
      r.max_leverage.toFixed(1),
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
          <h1 className="text-xl font-semibold text-text-primary">Comparação Alavancada (Calmar / Survival-First)</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Qual ativo merece mais alavancagem? Ranking por <strong>Calmar</strong> (CAGR/|MaxDD|), com margin call
            intraday, margin buffer e leverage máximo sobrevivente. <span className="text-text-muted">Carry zero (Quantfury).</span>
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

          {/* Preset categories */}
          <div className="mb-3">
            <p className="text-xs text-text-muted mb-2">Categorias pré-definidas:</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(SHARPE_PRESETS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setTickers(val.tickers)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary/50 hover:text-primary text-text-secondary transition-colors whitespace-nowrap"
                >
                  <span className="mr-1">{val.flag}</span>{val.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4">
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
              {/* Ranking note + Calmar color legend */}
              <div className="mb-3 text-[11px] text-text-muted">
                Ordenado por <strong className="text-text-secondary">Calmar</strong> (CAGR / |MaxDD|) — desempate por Sortino.
                Sharpe é apenas informativo (quase invariante à alavancagem). Liquidados no fundo.
              </div>
              <div className="flex gap-4 mb-4 flex-wrap items-center">
                <span className="text-[10px] text-text-muted uppercase tracking-wider">Calmar:</span>
                {[
                  { label: "< 0",       cls: "text-danger bg-danger/10" },
                  { label: "0 – 0.5",   cls: "text-warning bg-warning/10" },
                  { label: "0.5 – 1",   cls: "text-text-primary bg-surface-3" },
                  { label: "1 – 2",     cls: "text-success bg-success/10" },
                  { label: "> 2",       cls: "text-purple-400 bg-purple-500/10" },
                ].map((l) => (
                  <span key={l.label} className={`text-xs px-2 py-0.5 rounded font-mono ${l.cls}`}>
                    {l.label}
                  </span>
                ))}
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {["Ticker", "Beta", "Retorno Total", "CAGR", "Calmar", "Sortino", "Sharpe", "Max DD", "Margin Buffer", "Max Lev", "Patrimônio Final", "Status"].map((h) => (
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
                        <div className="flex items-center gap-2">
                          <TickerLogo ticker={item.ticker} size={22} />
                          <div>
                            <span className={`font-mono font-bold ${item.margin_call ? "text-text-muted" : "text-text-primary"}`}>
                              {item.ticker}
                            </span>
                            {idx === 0 && !item.margin_call && (
                              <span className="ml-1.5 badge bg-primary/10 border-primary/20 text-primary text-[10px]">MELHOR</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-text-secondary">{item.beta.toFixed(2)}</td>
                      <td className={`py-2.5 pr-3 font-mono font-semibold ${item.retorno_total >= 0 ? "text-success" : "text-danger"}`}>
                        {formatPercent(item.retorno_total)}
                      </td>
                      <td className={`py-2.5 pr-3 font-mono font-semibold ${item.retorno_anualizado >= 0 ? "text-success" : "text-danger"}`}>
                        {item.retorno_anualizado.toFixed(1)}%
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-text-secondary">{item.volatilidade.toFixed(1)}%</td>
                      {/* Calmar — critério principal de ranking, destacado */}
                      <td className="py-2.5 pr-3">
                        <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${calmarColor(item.calmar)} ${calmarBg(item.calmar)}`}>
                          {fmtCalmar(item.calmar)}
                        </span>
                      </td>
                      <td className={`py-2.5 pr-3 font-mono ${sharpeColor(item.sortino)}`}>{fmtSortino(item.sortino)}</td>
                      {/* Sharpe — informativo, de-emphasizado */}
                      <td className="py-2.5 pr-3 font-mono text-text-muted">{item.sharpe.toFixed(2)}</td>
                      <td className="py-2.5 pr-3 font-mono text-danger">{item.max_drawdown.toFixed(1)}%</td>
                      {/* Margin buffer — quão perto chegou da liquidação (survival-first) */}
                      <td className={`py-2.5 pr-3 font-mono font-semibold ${bufferColor(item.margin_buffer)}`} title="Mínimo histórico de (low − liq_price) / liq_price. Menor = mais perto da liquidação.">
                        {fmtBuffer(item.margin_buffer)}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-text-secondary" title="Leverage máximo que sobreviveria ao período (busca binária no low intradiário).">
                        {item.max_leverage.toFixed(1)}x
                      </td>
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

            {/* Métricas — doutrina survival-first */}
            <div className="card">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Como ler as métricas (survival-first, carry zero)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 text-xs">
                {[
                  {
                    name: "Calmar  ·  critério de ranking",
                    cls: "text-purple-400",
                    desc: "CAGR ÷ |Max Drawdown|. A métrica NATIVA do alavancado: pune diretamente a profundidade do tombo, que é o que liquida a conta. Quanto maior, melhor. É por ela que a tabela ordena.",
                  },
                  {
                    name: "Sortino  ·  desempate",
                    cls: "text-success",
                    desc: "Como o Sharpe, mas só penaliza a volatilidade de QUEDA (downside deviation). Não pune a oscilação pra cima. Usado como desempate quando o Calmar é parecido.",
                  },
                  {
                    name: "Margin Buffer  ·  cauda",
                    cls: "text-warning",
                    desc: "Mínimo histórico de (low − preço de liquidação) / liq. Quão perto o ativo CHEGOU da liquidação no pior intradia. Pequeno = raspou a margem. É o sinal de cauda que o Sharpe esconde.",
                  },
                  {
                    name: "Max Lev sobrevivente",
                    cls: "text-text-primary",
                    desc: "Maior alavancagem (busca binária no low intradiário) em que o ativo NÃO teria sido liquidado no período. Teto prático de risco por ativo.",
                  },
                  {
                    name: "Sharpe  ·  só informativo",
                    cls: "text-text-muted",
                    desc: "Retorno excedente ÷ volatilidade total. Quase invariante à alavancagem e pune mal a cauda — por isso saiu de critério de ranking. Fica como referência histórica.",
                  },
                  {
                    name: "Carry ZERO (Quantfury)",
                    cls: "text-text-secondary",
                    desc: "Não há débito de juro de empréstimo. O custo do leverage aparece só no risco de liquidação (margin call por low), não num carrego diário.",
                  },
                ].map((r) => (
                  <div key={r.name} className="bg-surface-2 rounded-lg p-2.5">
                    <p className={`font-mono font-bold ${r.cls}`}>{r.name}</p>
                    <p className="text-text-muted mt-1 leading-snug">{r.desc}</p>
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
