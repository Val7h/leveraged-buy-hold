import { useRef, useState, useCallback, useEffect } from 'react';

export interface PullToRefreshOptions {
  minDistance?: number;
  onRefresh: () => Promise<void> | void;
  threshold?: number;
}

export interface PullToRefreshState {
  isPulling: boolean;
  progress: number; // 0-1
  isRefreshing: boolean;
}

/**
 * usePullToRefresh - Native pull-to-refresh gesture for mobile
 *
 * Enables iOS/Android-style pull-to-refresh on any scrollable element.
 * Fires callback when user pulls down past threshold.
 *
 * Example:
 * const { ref, state } = usePullToRefresh({
 *   onRefresh: async () => { await fetchData(); },
 *   threshold: 100
 * });
 *
 * <div ref={ref} className="overflow-y-auto h-screen">
 *   {state.isPulling && <PullIndicator progress={state.progress} />}
 *   {state.isRefreshing && <LoadingSpinner />}
 *   <Content />
 * </div>
 */
export function usePullToRefresh(options: PullToRefreshOptions) {
  const { minDistance = 50, onRefresh, threshold = 100 } = options;

  const ref = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<{
    startY: number;
    currentY: number;
    isDragging: boolean;
  } | null>(null);

  const [pullState, setPullState] = useState<PullToRefreshState>({
    isPulling: false,
    progress: 0,
    isRefreshing: false,
  });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const element = ref.current;
    if (!element) return;

    // Only trigger pull-to-refresh if we're at the top of the scroll
    if (element.scrollTop > 0) return;

    const touch = e.touches[0];
    stateRef.current = {
      startY: touch.clientY,
      currentY: touch.clientY,
      isDragging: true,
    };
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!stateRef.current || !stateRef.current.isDragging) return;

    const touch = e.touches[0];
    const distance = touch.clientY - stateRef.current.startY;

    if (distance < 0) {
      // User scrolled up, cancel
      stateRef.current.isDragging = false;
      setPullState((prev) => ({
        ...prev,
        isPulling: false,
        progress: 0,
      }));
      return;
    }

    stateRef.current.currentY = touch.clientY;

    if (distance > minDistance) {
      const progress = Math.min(distance / threshold, 1);
      setPullState((prev) => ({
        ...prev,
        isPulling: true,
        progress,
      }));

      // Prevent default scroll behavior during pull
      e.preventDefault();
    }
  }, [minDistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!stateRef.current) return;

    const { currentY, startY } = stateRef.current;
    const distance = currentY - startY;

    stateRef.current.isDragging = false;

    if (distance > threshold) {
      // User pulled far enough, trigger refresh
      setPullState((prev) => ({
        ...prev,
        isPulling: false,
        isRefreshing: true,
        progress: 1,
      }));

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh error:', error);
      } finally {
        setPullState({
          isPulling: false,
          progress: 0,
          isRefreshing: false,
        });
        stateRef.current = null;
      }
    } else {
      // User didn't pull far enough, reset
      setPullState({
        isPulling: false,
        progress: 0,
        isRefreshing: false,
      });
      stateRef.current = null;
    }
  }, [threshold, onRefresh]);

  // Setup event listeners
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, false);
    element.addEventListener('touchmove', handleTouchMove, false);
    element.addEventListener('touchend', handleTouchEnd, false);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { ref, state: pullState };
}
