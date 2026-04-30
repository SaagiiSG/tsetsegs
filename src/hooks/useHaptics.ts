import { useCallback } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: 28,
  success: [10, 40, 10],
};

/**
 * Tiny wrapper around navigator.vibrate. No-op on unsupported devices.
 * Matches the iOS taptic feel as closely as the Web Vibration API allows.
 */
export function useHaptics() {
  const trigger = useCallback((pattern: HapticPattern = 'light') => {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      /* ignore */
    }
  }, []);

  return trigger;
}
