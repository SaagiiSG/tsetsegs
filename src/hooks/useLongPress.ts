import { useCallback, useRef } from 'react';

interface Options {
  ms?: number;
  onLongPress: () => void;
  onClick?: () => void;
}

/**
 * Hook returning pointer handlers that detect a long-press (default 500ms).
 * Spread the returned object onto a button or div.
 */
export function useLongPress({ ms = 500, onLongPress, onClick }: Options) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);

  const start = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      fired.current = false;
      timer.current = window.setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, ms);
    },
    [ms, onLongPress]
  );

  const clear = useCallback(
    (triggerClick: boolean) => {
      if (timer.current != null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      if (triggerClick && !fired.current && onClick) onClick();
    },
    [onClick]
  );

  return {
    onPointerDown: start,
    onPointerUp: () => clear(true),
    onPointerLeave: () => clear(false),
    onPointerCancel: () => clear(false),
    onContextMenu: (e: React.MouseEvent) => {
      // Right-click on desktop = long-press equivalent
      e.preventDefault();
      onLongPress();
    },
  };
}
