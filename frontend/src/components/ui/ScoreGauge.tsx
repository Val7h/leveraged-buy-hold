"use client";
import React, { memo } from "react";
import { cn, getScoreColor } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

function ScoreGauge({ score, label, size = "md", showValue = true }: ScoreGaugeProps) {
  const pct = Math.min(100, Math.max(0, score));
  const r = size === "lg" ? 42 : size === "md" ? 34 : 26;
  const cx = r + 4;
  const circumference = 2 * Math.PI * r;
  const arcLen = circumference * 0.75;
  const dashOffset = arcLen - (pct / 100) * arcLen;

  const color = score >= 80 ? "#00E676" : score >= 60 ? "#00D4FF" : score >= 40 ? "#FFB800" : "#FF3B3B";

  const svgSize = (r + 4) * 2;
  const fontSize = size === "lg" ? 16 : size === "md" ? 13 : 10;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={svgSize} height={svgSize * 0.75} viewBox={`0 0 ${svgSize} ${svgSize * 0.75}`}>
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="#1E2730"
          strokeWidth="6"
          strokeDasharray={`${arcLen} ${circumference}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cx})`}
        />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${arcLen} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cx})`}
          style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s" }}
        />
        {showValue && (
          <text
            x={cx}
            y={cx + 4}
            textAnchor="middle"
            fill={color}
            fontSize={fontSize}
            fontFamily="JetBrains Mono, monospace"
            fontWeight="600"
          >
            {Math.round(pct)}
          </text>
        )}
      </svg>
      <span className="text-xs text-text-muted font-medium">{label}</span>
    </div>
  );
}

export default memo(ScoreGauge);
