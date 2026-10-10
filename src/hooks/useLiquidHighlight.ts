import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

const REST_X = "50%";
const REST_Y = "-25%";

function track(el: HTMLElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  el.style.setProperty("--lx", `${(((clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
  el.style.setProperty("--ly", `${(((clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
}

/**
 * Move the specular highlight with the pointer. Touch is ignored — nothing
 * hovers on a phone, so the highlight simply stays at rest.
 */
export function liquidTrack(e: ReactPointerEvent<HTMLElement>) {
  if (e.pointerType === "touch") return;
  track(e.currentTarget, e.clientX, e.clientY);
}

/** Let the highlight drift back to a resting position above the card. */
export function liquidRest(e: ReactPointerEvent<HTMLElement>) {
  e.currentTarget.style.setProperty("--lx", REST_X);
  e.currentTarget.style.setProperty("--ly", REST_Y);
}

/**
 * Same as liquidTrack/liquidRest, but owned by a single element: writes
 * `--lx` / `--ly` (percentages of the element) so CSS can paint a specular
 * highlight that follows the cursor — the "liquid" read on glass cards.
 */
export function useLiquidHighlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const frame = useRef<number | null>(null);

  const onPointerMove = useCallback((e: ReactPointerEvent<T>) => {
    if (e.pointerType === "touch") return;
    const el = e.currentTarget;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      track(el, e.clientX, e.clientY);
    });
  }, []);

  const onPointerLeave = useCallback((e: ReactPointerEvent<T>) => {
    liquidRest(e);
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
