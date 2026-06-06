import React, { memo } from "react";
import { cn } from "@/lib/utils";
import Tooltip from "@/components/ui/Tooltip";

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  accent?: "success" | "danger" | "warning" | "primary" | "default";
  icon?: React.ReactNode;
  tooltip?: string;
  className?: string;
  large?: boolean;
}

const accentClasses = {
  success: "border-success/20",
  danger: "border-danger/20",
  warning: "border-warning/20",
  primary: "border-primary/20",
  default: "border-border",
};

const accentDot = {
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  primary: "bg-primary",
  default: "bg-text-muted",
};

function MetricCard({
  label,
  value,
  subValue,
  trend,
  accent = "default",
  icon,
  tooltip,
  className,
  large = false,
}: MetricCardProps) {
  const trendColor = trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-text-secondary";

  const card = (
    <div className={cn("card relative overflow-hidden", accentClasses[accent], className)}>
      <div className={cn("absolute top-0 left-0 w-0.5 h-full", accentDot[accent])} />
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">{label}</p>
          <p className={cn("font-semibold text-text-primary font-mono leading-none", large ? "text-2xl" : "text-xl")}>
            {value}
          </p>
          {subValue && (
            <p className={cn("text-xs mt-1.5 font-medium", trendColor)}>{subValue}</p>
          )}
        </div>
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center flex-shrink-0 ml-3">
            {icon}
          </div>
        )}
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip content={tooltip} side="top" delay={300}>
        {card}
      </Tooltip>
    );
  }

  return card;
}

export default memo(MetricCard);
