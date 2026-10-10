import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Tracks the pointer across a surface and writes `--lx` / `--ly` (percentages of
 * the element) so CSS can paint a specular highlight that follows the cursor —
 * the "liquid" read on glass cards.
 *
 * Touch pointers are ignored (nothing hovers on a phone), and the highlight
 * drifts back to a resting position above the card when the pointer leaves.
 */
export function useLiquidHighlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const frame = useRef<number | null>(null);

  const onPointerMove = useCallback((e: ReactPointerEvent<T>) => {
    if (e.pointerType === "touch") return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      el.style.setProperty("--lx", `${x.toFixed(1)}%`);
      el.style.setProperty("--ly", `${y.toFixed(1)}%`);
    });
  }, []);

  const onPointerLeave = useCallback((e: ReactPointerEvent<T>) => {
    const el = e.currentTarget;
    el.style.setProperty("--lx", "50%");
    el.style.setProperty("--ly", "-25%");
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
