import { useRef, useState, useCallback } from 'react';

export interface SwipeOptions {
  minDistance?: number;
  minVelocity?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
}

/**
 * useSwipe - Touch swipe gesture hook for mobile navigation
 *
 * Detects swipe gestures (left, right, up, down) based on touch velocity and distance.
 * Useful for: carousel navigation, drawer opening, page transitions
 *
 * Example:
 * const ref = useSwipe({
 *   onSwipeLeft: () => nextSlide(),
 *   onSwipeRight: () => prevSlide(),
 *   minDistance: 50,
 *   minVelocity: 200
 * });
 * <div ref={ref}>Content</div>
 */
export function useSwipe(options: SwipeOptions = {}) {
  const {
    minDistance = 50,
    minVelocity = 200,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } = options;

  const ref = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<SwipeState | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) return;

    const touch = e.touches[0];
    stateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
    };
    setIsDetecting(true);
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!stateRef.current) return;

    const state = stateRef.current;
    const endTime = Date.now();
    const duration = endTime - state.startTime;

    // Ignore if touch lasted too long (likely a scroll)
    if (duration > 500) {
      stateRef.current = null;
      setIsDetecting(false);
      return;
    }

    let endX = 0;
    let endY = 0;

    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      endX = touch.clientX;
      endY = touch.clientY;
    }

    const diffX = endX - state.startX;
    const diffY = endY - state.startY;
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);
    const velocity = distance / duration; // pixels per millisecond

    // Detect dominant direction
    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe
      if (distance > minDistance && velocity > minVelocity / 1000) {
        if (diffX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (diffX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }
    } else {
      // Vertical swipe
      if (distance > minDistance && velocity > minVelocity / 1000) {
        if (diffY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (diffY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }

    stateRef.current = null;
    setIsDetecting(false);
  }, [minDistance, minVelocity, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  const handleTouchCancel = useCallback(() => {
    stateRef.current = null;
    setIsDetecting(false);
  }, []);

  // Attach listeners
  const attachListeners = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, false);
    element.addEventListener('touchend', handleTouchEnd, false);
    element.addEventListener('touchcancel', handleTouchCancel, false);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [handleTouchStart, handleTouchEnd, handleTouchCancel]);

  const setRef = useCallback(
    (element: HTMLDivElement | null) => {
      ref.current = element;
      attachListeners(element);
    },
    [attachListeners]
  );

  return { ref: setRef, isDetecting };
}
