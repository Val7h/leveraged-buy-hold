"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

const TICKER_COLORS: Record<string, string> = {
  A: "bg-blue-500/20 text-blue-400",
  B: "bg-purple-500/20 text-purple-400",
  C: "bg-cyan-500/20 text-cyan-400",
  D: "bg-green-500/20 text-green-400",
  E: "bg-yellow-500/20 text-yellow-400",
  F: "bg-orange-500/20 text-orange-400",
  G: "bg-red-500/20 text-red-400",
  H: "bg-pink-500/20 text-pink-400",
  I: "bg-indigo-500/20 text-indigo-400",
  J: "bg-teal-500/20 text-teal-400",
  K: "bg-lime-500/20 text-lime-400",
  L: "bg-amber-500/20 text-amber-400",
  M: "bg-emerald-500/20 text-emerald-400",
  N: "bg-sky-500/20 text-sky-400",
  O: "bg-violet-500/20 text-violet-400",
  P: "bg-fuchsia-500/20 text-fuchsia-400",
  Q: "bg-rose-500/20 text-rose-400",
  R: "bg-blue-600/20 text-blue-300",
  S: "bg-green-600/20 text-green-300",
  T: "bg-purple-600/20 text-purple-300",
  U: "bg-cyan-600/20 text-cyan-300",
  V: "bg-orange-600/20 text-orange-300",
  W: "bg-yellow-600/20 text-yellow-300",
  X: "bg-red-600/20 text-red-300",
  Y: "bg-pink-600/20 text-pink-300",
  Z: "bg-indigo-600/20 text-indigo-300",
};

interface TickerLogoProps {
  ticker: string;
  size?: number;
  className?: string;
}

// Strip Bitget tokenized suffix (TSLAONUSDT → TSLA) for logo lookup
function getLogoTicker(ticker: string): string {
  const upper = ticker.toUpperCase();
  if (upper.endsWith("ONUSDT")) return upper.replace("ONUSDT", "");
  // Strip .SA suffix for B3 tickers
  if (upper.endsWith(".SA")) return upper.replace(".SA", "");
  return upper;
}

export default function TickerLogo({ ticker, size = 28, className }: TickerLogoProps) {
  const [errored, setErrored] = useState(false);
  const logoTicker = getLogoTicker(ticker);
  const initial = logoTicker?.[0]?.toUpperCase() ?? "?";
  const fallbackColor = TICKER_COLORS[initial] ?? "bg-primary/20 text-primary";

  const src = `https://assets.parqet.com/logos/symbol/${logoTicker}?format=jpg`;

  if (errored) {
    return (
      <div
        className={cn("rounded-full flex items-center justify-center flex-shrink-0 font-bold", fallbackColor, className)}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={logoTicker}
      width={size}
      height={size}
      className={cn("rounded-full object-cover flex-shrink-0", className)}
      style={{ width: size, height: size }}
      onError={() => setErrored(true)}
    />
  );
}
