"use client";
import { RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  progress: number; // 0-1
  isRefreshing: boolean;
  isPulling: boolean;
}

/**
 * Visual indicator for pull-to-refresh gesture
 *
 * Shows arrow when user starts pulling, changes to spinner when refreshing.
 * Progress bar fills as user pulls down.
 */
export default function PullToRefreshIndicator({
  progress,
  isRefreshing,
  isPulling,
}: PullToRefreshIndicatorProps) {
  if (!isPulling && !isRefreshing) return null;

  const rotation = Math.min(180 * progress, 180);
  const scale = 0.5 + progress * 0.5; // Scale from 0.5 to 1.0

  return (
    <div className="flex justify-center py-4">
      <div className="relative flex items-center justify-center">
        {/* Progress ring background */}
        <div className="absolute w-10 h-10 rounded-full border-2 border-border" />

        {/* Progress ring fill */}
        <div
          className="absolute w-10 h-10 rounded-full border-2 border-primary transition-all"
          style={{
            clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((progress * Math.PI) / 1)}% ${50 - 50 * Math.cos((progress * Math.PI) / 1)}%, ${50 + 50 * Math.sin((progress * Math.PI * 2) / 1)}% ${50 - 50 * Math.cos((progress * Math.PI * 2) / 1)}%)`,
          }}
        />

        {/* Icon */}
        {isRefreshing ? (
          <RefreshCw size={20} className="text-primary animate-spin" />
        ) : (
          <ChevronDown
            size={20}
            className="text-text-secondary transition-all"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
            }}
          />
        )}
      </div>

      {/* Status text */}
      <div className="ml-3 text-sm text-text-secondary">
        {isRefreshing ? (
          <span>Atualizando...</span>
        ) : progress < 0.8 ? (
          <span>Puxe para atualizar</span>
        ) : (
          <span>Solte para atualizar</span>
        )}
      </div>
    </div>
  );
}
