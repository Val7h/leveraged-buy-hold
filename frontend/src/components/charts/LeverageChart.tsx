"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

interface LeveragePoint { date?: string; month?: number; year?: number; leverage: number }

interface LeverageChartProps {
  data: LeveragePoint[];
  height?: number;
  title?: string;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-3 border border-border rounded-lg p-2.5 shadow-card text-xs">
      <p className="text-text-muted mb-1">{label}</p>
      <p className="font-mono font-semibold text-warning">{payload[0]?.value?.toFixed(2)}x</p>
    </div>
  );
}

export default function LeverageChart({ data, height = 200, title = "Alavancagem ao Longo do Tempo" }: LeverageChartProps) {
  if (!data?.length) return null;
  const formatted = data.map((d) => ({
    label: d.date ? d.date.slice(0, 7) : `Ano ${d.year?.toFixed(0)}`,
    leverage: d.leverage,
  }));
  const sample = formatted.filter((_, i) => i % Math.max(1, Math.floor(formatted.length / 60)) === 0);

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={sample} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2730" />
          <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tickFormatter={(v) => `${v.toFixed(1)}x`} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} width={36} domain={[0.9, "dataMax + 0.2"]} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={1} stroke="#2D3748" strokeDasharray="4 2" />
          <Line type="monotone" dataKey="leverage" stroke="#FFB800" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
