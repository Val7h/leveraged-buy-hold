"use client";

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string | ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  delay?: number;
  className?: string;
}

export default function Tooltip({
  content,
  children,
  side = "top",
  delay = 300,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showTimer, setShowTimer] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    setShowTimer(timer);
  };

  const handleMouseLeave = () => {
    if (showTimer) clearTimeout(showTimer);
    setIsVisible(false);
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-surface-2",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-surface-2",
    left: "left-full top-1/2 -translate-y-1/2 border-l-surface-2",
    right: "right-full top-1/2 -translate-y-1/2 border-r-surface-2",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div
          className={cn(
            "absolute z-50 px-3 py-2 text-xs font-medium text-white bg-surface-3 rounded-lg border border-border/50 shadow-lg whitespace-nowrap pointer-events-none",
            positionClasses[side],
            className
          )}
        >
          {content}
          <div
            className={cn(
              "absolute w-2 h-2 border-2 border-transparent",
              arrowClasses[side]
            )}
          />
        </div>
      )}
    </div>
  );
}
