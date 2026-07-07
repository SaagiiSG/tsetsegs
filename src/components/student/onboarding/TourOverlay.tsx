import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTour } from './TourProvider';

const PADDING = 8;
const TOOLTIP_GAP = 12;
const TOOLTIP_WIDTH = 320;

interface Rect {
  top: number; left: number; width: number; height: number;
}

function getRect(sel: string): Rect | null {
  const el = document.querySelector(sel) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // If element has no size (hidden), bail
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export function TourOverlay() {
  const { activeTour, stepIndex, next, back, end, markAllToursCompleted } = useTour();
  const [rect, setRect] = useState<Rect | null>(null);
  const [tick, setTick] = useState(0); // triggers re-measure on resize/scroll

  const step = activeTour?.steps[stepIndex] ?? null;

  useLayoutEffect(() => {
    if (!step) { setRect(null); return; }
    let attempts = 0;
    let cancelled = false;
    const measure = () => {
      const r = getRect(step.selector);
      if (r) {
        // Scroll target into view if needed
        const el = document.querySelector(step.selector) as HTMLElement | null;
        if (el) {
          const inView =
            r.top >= 0 &&
            r.left >= 0 &&
            r.top + r.height <= window.innerHeight &&
            r.left + r.width <= window.innerWidth;
          if (!inView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setRect(r);
        return;
      }
      // Retry a few times (element may still be mounting)
      if (attempts++ < 20 && !cancelled) {
        window.setTimeout(measure, 150);
      } else {
        setRect(null); // fallback: center card
      }
    };
    measure();
    return () => { cancelled = true; };
  }, [step, tick]);

  useEffect(() => {
    if (!activeTour) return;
    const onResize = () => setTick((n) => n + 1);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') end();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [activeTour, next, back, end]);

  if (!activeTour || !step) return null;

  // --- Compute spotlight box (with padding) or fall back to center ---
  const hasTarget = !!rect;
  const spot = rect
    ? {
        top: Math.max(0, rect.top - PADDING),
        left: Math.max(0, rect.left - PADDING),
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  // --- Compute tooltip position ---
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;

  let tipTop = vh / 2 - 80;
  let tipLeft = vw / 2 - TOOLTIP_WIDTH / 2;

  if (spot) {
    const placement = step.placement ?? 'auto';
    // Prefer bottom, then top, then right, then left based on space.
    const spaceBelow = vh - (spot.top + spot.height);
    const spaceAbove = spot.top;
    const spaceRight = vw - (spot.left + spot.width);
    const spaceLeft = spot.left;

    const pick =
      placement !== 'auto'
        ? placement
        : spaceBelow > 200 ? 'bottom'
        : spaceAbove > 200 ? 'top'
        : spaceRight > 340 ? 'right'
        : spaceLeft > 340 ? 'left'
        : 'bottom';

    if (pick === 'bottom') {
      tipTop = spot.top + spot.height + TOOLTIP_GAP;
      tipLeft = spot.left + spot.width / 2 - TOOLTIP_WIDTH / 2;
    } else if (pick === 'top') {
      tipTop = spot.top - TOOLTIP_GAP - 180;
      tipLeft = spot.left + spot.width / 2 - TOOLTIP_WIDTH / 2;
    } else if (pick === 'right') {
      tipTop = spot.top + spot.height / 2 - 80;
      tipLeft = spot.left + spot.width + TOOLTIP_GAP;
    } else if (pick === 'left') {
      tipTop = spot.top + spot.height / 2 - 80;
      tipLeft = spot.left - TOOLTIP_GAP - TOOLTIP_WIDTH;
    }

    // Clamp within viewport
    tipLeft = Math.max(12, Math.min(vw - TOOLTIP_WIDTH - 12, tipLeft));
    tipTop = Math.max(12, Math.min(vh - 200, tipTop));
  }

  const total = activeTour.steps.length;
  const isLast = stepIndex >= total - 1;

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dim backdrop with a spotlight cutout via SVG mask */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={end}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spot && (
              <rect
                x={spot.left}
                y={spot.top}
                width={spot.width}
                height={spot.height}
                rx="12"
                ry="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#tour-mask)"
        />
        {/* Pulsing ring around the spotlight */}
        {spot && (
          <rect
            x={spot.left}
            y={spot.top}
            width={spot.width}
            height={spot.height}
            rx="12"
            ry="12"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            className="motion-reduce:animate-none animate-pulse"
            pointerEvents="none"
          />
        )}
      </svg>

      {/* Tooltip card */}
      <div
        role="dialog"
        aria-labelledby="tour-title"
        style={{ top: tipTop, left: tipLeft, width: TOOLTIP_WIDTH }}
        className={cn(
          'absolute pointer-events-auto rounded-xl border bg-card text-card-foreground shadow-2xl',
          'p-4 animate-in fade-in zoom-in-95 duration-200'
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-primary">
            New · {stepIndex + 1} / {total}
          </span>
          <button
            type="button"
            onClick={end}
            aria-label="Skip tour"
            className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1 rounded"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <h3 id="tour-title" className="text-sm font-semibold mb-1">{step.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
        {!hasTarget && (
          <p className="mt-2 text-[10px] italic text-muted-foreground">
            (This element isn't on screen right now.)
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={end}
              className="text-xs text-muted-foreground hover:text-foreground px-1"
            >
              Skip
            </button>
            <span className="text-muted-foreground/40 text-xs">·</span>
            <button
              type="button"
              onClick={markAllToursCompleted}
              className="text-xs text-muted-foreground hover:text-foreground px-1"
              title="Don't show any /practice tour again"
            >
              Skip all
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={back}
                className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-accent"
              >
                <ChevronLeft className="h-3 w-3" /> Back
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              {isLast ? 'Got it' : (<>Next <ChevronRight className="h-3 w-3" /></>)}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
