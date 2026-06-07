"use client";
import React from "react";
import Tooltip from "@/components/ui/Tooltip";

interface HeuristicBadgeProps {
  /** Texto customizado do tooltip. Default: explicação genérica de heurística. */
  tooltip?: string;
  className?: string;
}

/**
 * Badge âmbar pequeno que sinaliza que uma métrica é heurística (não derivada
 * de histórico real). Atende SEC Marketing Rule 206(4)-1 §(d)(1) e
 * CVM Resolução 39 (disclosure de performance hipotética).
 */
export default function HeuristicBadge({
  tooltip = "Estimativa heurística — não baseada em histórico de trades reais. Para Kelly verdadeiro, necessário pelo menos 30 trades fechados.",
  className = "",
}: HeuristicBadgeProps) {
  return (
    <Tooltip content={tooltip} side="top" delay={150}>
      <span
        className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 leading-none cursor-help ${className}`}
      >
        heurística
      </span>
    </Tooltip>
  );
}
