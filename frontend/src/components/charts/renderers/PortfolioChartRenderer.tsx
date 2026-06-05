"use client";
import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface CurvePoint { date: string; equity: number; }

interface Props {
  filtered: CurvePoint[];
  strokeColor: string;
  totalInvested: number;
  fmtDate: (d: string) => string;
}

const PortfolioChartRenderer = React.memo(
  ({ filtered, strokeColor, totalInvested, fmtDate }: Props) => (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={filtered} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.2} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={{ fill: "#475569", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          tick={{ fill: "#475569", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          formatter={(v: any) => [formatCurrency(v, "USD", true), "Patrimônio"]}
          labelFormatter={(l) => new Date(l + "T12:00:00").toLocaleDateString("pt-BR")}
          contentStyle={{
            background: "#161C24",
            border: "1px solid #1F2937",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <ReferenceLine
          y={totalInvested}
          stroke="#475569"
          strokeDasharray="4 4"
          label={{
            value: "Custo",
            fill: "#475569",
            fontSize: 9,
            position: "insideTopRight",
          }}
        />
        <Area
          type="monotone"
          dataKey="equity"
          stroke={strokeColor}
          strokeWidth={2}
          fill="url(#portfolioGrad)"
          dot={false}
          activeDot={{ r: 4, fill: strokeColor }}
        />
      </AreaChart>
    </ResponsiveContainer>
  ),
  (prev, next) => {
    return (
      JSON.stringify(prev.filtered) === JSON.stringify(next.filtered) &&
      prev.strokeColor === next.strokeColor &&
      prev.totalInvested === next.totalInvested
    );
  }
);

PortfolioChartRenderer.displayName = "PortfolioChartRenderer";

export default PortfolioChartRenderer;
