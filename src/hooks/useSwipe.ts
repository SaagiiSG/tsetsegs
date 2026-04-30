import { useEffect, useRef } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  /** If set, only fire when start point is within edge px of that side. */
  edgeOnly?: { from: SwipeDirection; px: number };
  /** Minimum distance (px) to register as a swipe. Default 60. */
  threshold?: number;
  /** Maximum perpendicular drift (px). Default 80. */
  maxPerpendicular?: number;
  /** Disable when a Dialog/Sheet is open or other guards. */
  enabled?: boolean;
}

const isInteractive = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest('input, textarea, select, [contenteditable="true"], canvas')) return true;
  // If any modal-like overlay is open, ignore swipes
  if (document.querySelector('[data-state="open"][role="dialog"]')) return true;
  return false;
};

/**
 * Attach pointer-event swipe listeners to a target (defaults to window).
 * Works on touch, mouse drag, and trackpad.
 */
export function useSwipe(
  handlers: SwipeHandlers,
  target?: React.RefObject<HTMLElement> | null
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const enabled = handlers.enabled !== false;
    if (!enabled) return;

    const el: HTMLElement | Window = target?.current ?? window;
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;

    const threshold = handlers.threshold ?? 60;
    const maxPerp = handlers.maxPerpendicular ?? 80;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (isInteractive(e.target)) return;

      const edge = handlersRef.current.edgeOnly;
      if (edge) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (edge.from === 'left' && e.clientX > edge.px) return;
        if (edge.from === 'right' && e.clientX < w - edge.px) return;
        if (edge.from === 'top' && e.clientY > edge.px) return;
        if (edge.from === 'bottom' && e.clientY < h - edge.px) return;
      }

      startX = e.clientX;
      startY = e.clientY;
      startTime = Date.now();
      tracking = true;
    };

    const onUp = (e: PointerEvent) => {
      if (!tracking) return;
      tracking = false;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      const dt = Date.now() - startTime;
      if (dt > 800) return; // too slow

      const h = handlersRef.current;

      if (adx > ady) {
        if (ady > maxPerp || adx < threshold) return;
        if (dx < 0) h.onSwipeLeft?.();
        else h.onSwipeRight?.();
      } else {
        if (adx > maxPerp || ady < threshold) return;
        if (dy < 0) h.onSwipeUp?.();
        else h.onSwipeDown?.();
      }
    };

    const onCancel = () => {
      tracking = false;
    };

    (el as any).addEventListener('pointerdown', onDown, { passive: true });
    (el as any).addEventListener('pointerup', onUp, { passive: true });
    (el as any).addEventListener('pointercancel', onCancel, { passive: true });

    return () => {
      (el as any).removeEventListener('pointerdown', onDown);
      (el as any).removeEventListener('pointerup', onUp);
      (el as any).removeEventListener('pointercancel', onCancel);
    };
  }, [
    target,
    handlers.enabled,
    handlers.threshold,
    handlers.maxPerpendicular,
    handlers.edgeOnly?.from,
    handlers.edgeOnly?.px,
  ]);
}
