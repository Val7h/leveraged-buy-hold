/**
 * Mobile-first responsive utilities and constants
 * Ensures 100% responsive design across all device sizes
 */

/**
 * Tailwind breakpoints matching next/dist/esm/lib/mobile.ts
 * - mobile: default (0px)
 * - sm: 640px (small phones, landscape)
 * - md: 768px (tablets, iPads)
 * - lg: 1024px (desktops)
 * - xl: 1280px (large screens)
 * - 2xl: 1536px (cinema)
 */

export const BREAKPOINTS = {
  mobile: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Touch-friendly sizes (minimum 44x44px recommended by iOS, 48x48 by Material)
 */
export const TOUCH_TARGET_SIZE = '2.75rem'; // 44px
export const TOUCH_PADDING = '0.625rem'; // 10px min between targets

/**
 * Device detection helpers (client-side only)
 */
export function getDeviceType() {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;

  if (width < BREAKPOINTS.sm) return 'mobile';
  if (width < BREAKPOINTS.md) return 'tablet-small';
  if (width < BREAKPOINTS.lg) return 'tablet';
  return 'desktop';
}

/**
 * Check if device is touch-capable
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    (typeof window !== 'undefined' && 'ontouchstart' in window) ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    (typeof navigator !== 'undefined' && (navigator as any).msMaxTouchPoints > 0)
  );
}

/**
 * Check if viewport is mobile (< 768px)
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < BREAKPOINTS.md;
}

/**
 * Check if viewport is tablet (768px - 1024px)
 */
export function isTablet(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS.md && window.innerWidth < BREAKPOINTS.lg;
}

/**
 * Safe area insets (for notched devices)
 * Returns CSS variable values or defaults
 */
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') {
    return {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };
  }

  const root = document.documentElement;
  const style = getComputedStyle(root);

  return {
    top: parseFloat(style.getPropertyValue('--safe-area-inset-top') || '0') || 0,
    right: parseFloat(style.getPropertyValue('--safe-area-inset-right') || '0') || 0,
    bottom: parseFloat(style.getPropertyValue('--safe-area-inset-bottom') || '0') || 0,
    left: parseFloat(style.getPropertyValue('--safe-area-inset-left') || '0') || 0,
  };
}

/**
 * Device orientation
 */
export function getOrientation(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') return 'portrait';
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

/**
 * Debounce resize/orientation events (prevents excessive recalculations)
 */
export function useDeviceChange(callback: (device: string) => void, delay: number = 300) {
  if (typeof window === 'undefined') return;

  let timeout: ReturnType<typeof setTimeout> | null = null;

  const handleChange = () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      callback(getDeviceType());
    }, delay);
  };

  window.addEventListener('resize', handleChange);
  window.addEventListener('orientationchange', handleChange);

  return () => {
    window.removeEventListener('resize', handleChange);
    window.removeEventListener('orientationchange', handleChange);
    if (timeout) clearTimeout(timeout);
  };
}

/**
 * Prevent zoom on input focus (iOS specific)
 * Apply to inputs with font-size >= 16px
 */
export const INPUT_NO_ZOOM_SIZE = '16px'; // 1rem, prevents iOS zoom on focus

/**
 * Viewport meta tag for mobile optimization
 * Include in HTML head: <meta name="viewport" content={VIEWPORT_META_CONTENT} />
 */
export const VIEWPORT_META_CONTENT =
  'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover';

/**
 * Safe area CSS values for notched devices (iPhoneX+, Android)
 * Use in tailwind or CSS:
 * padding-top: max(1rem, env(safe-area-inset-top))
 */
export const SAFE_AREA_CSS = {
  paddingTop: 'max(1rem, env(safe-area-inset-top))',
  paddingRight: 'max(1rem, env(safe-area-inset-right))',
  paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
  paddingLeft: 'max(1rem, env(safe-area-inset-left))',
} as const;

/**
 * Check if device is in landscape orientation
 */
export function isLandscape(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerHeight < window.innerWidth;
}

/**
 * Get safe viewport height (accounts for browser UI on mobile)
 * Use 100dvh (dynamic viewport height) if available, fallback to 100vh
 */
export function getViewportHeight(): string {
  if (typeof window === 'undefined') return '100vh';

  // Check if dvh is supported
  const style = document.documentElement.style;
  if ('--vh' in style || CSS.supports('height: 100dvh')) {
    return '100dvh';
  }

  return '100vh';
}
