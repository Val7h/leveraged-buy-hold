import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD", compact = false): string {
  if (compact && Math.abs(value) >= 1_000_000) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatLeverage(value: number): string {
  return `${value.toFixed(2)}x`;
}

export function getLeverageColor(leverage: number): string {
  if (leverage <= 1.25) return "text-success";
  if (leverage <= 2.0) return "text-warning";
  return "text-danger";
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-warning";
  return "text-danger";
}

export function getScoreBg(score: number): string {
  if (score >= 80) return "bg-success/10 border-success/30";
  if (score >= 60) return "bg-primary/10 border-primary/30";
  if (score >= 40) return "bg-warning/10 border-warning/30";
  return "bg-danger/10 border-danger/30";
}

export function getPnlColor(value: number): string {
  if (value > 0) return "text-success";
  if (value < 0) return "text-danger";
  return "text-text-secondary";
}

export function formatLargeNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function riskProfileLabel(profile: string): string {
  const map: Record<string, string> = {
    conservative: "Conservador",
    balanced: "Balanceado",
    aggressive: "Agressivo",
  };
  return map[profile] || profile;
}

export function sectorIcon(sector?: string): string {
  const map: Record<string, string> = {
    Utilities: "⚡",
    "Consumer Staples": "🛒",
    Healthcare: "⚕️",
    "Real Estate": "🏢",
    Financials: "🏦",
    Energy: "🔋",
    "Communication Services": "📡",
    Industrials: "🏭",
    Technology: "💻",
  };
  return sector ? (map[sector] || "📊") : "📊";
}
