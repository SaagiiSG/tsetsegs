import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClassCardBig } from "./ClassCardBig";
import type { DashboardBatch } from "@/hooks/useTeacherDashboardData";

interface Props {
  batches: DashboardBatch[];
  onRename: (b: DashboardBatch) => void;
  onShowQR: (b: DashboardBatch) => void;
}

export function ClassCarousel({ batches, onRename, onShowQR }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;

  // Gesture tracking for JS-assisted snapping
  const gestureStartLeftRef = useRef<number | null>(null);
  const gestureStartIndexRef = useRef<number | null>(null);
  const gestureKindRef = useRef<"touch" | "wheel" | null>(null);
  const lastScrollLeftRef = useRef(0);
  const lastScrollTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const scrollEndTimerRef = useRef<number | null>(null);
  const programmaticRef = useRef(false);

  const getCardCenters = useCallback(() => {
    const el = ref.current;
    if (!el) return [] as Array<{ index: number; center: number; width: number }>;
    const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-card]"));
    return cards.map((c) => ({
      index: Number(c.dataset.index),
      center: c.offsetLeft + c.offsetWidth / 2,
      width: c.offsetWidth,
    }));
  }, []);

  const scrollToIndex = useCallback(
    (idx: number, smooth = true) => {
      const el = ref.current;
      if (!el) return;
      const centers = getCardCenters();
      const clamped = Math.max(0, Math.min(batches.length - 1, idx));
      const target = centers.find((c) => c.index === clamped);
      if (!target) return;
      programmaticRef.current = true;
      el.scrollTo({
        left: target.center - el.clientWidth / 2,
        behavior: smooth ? "smooth" : "auto",
      });
      setActiveIndex(clamped);
      // release programmatic guard after animation likely done
      window.setTimeout(() => {
        programmaticRef.current = false;
      }, 450);
    },
    [batches.length, getCardCenters]
  );

  const nearestIndex = useCallback(() => {
    const el = ref.current;
    if (!el) return activeIndexRef.current;
    const viewportCenter = el.scrollLeft + el.clientWidth / 2;
    const centers = getCardCenters();
    let best = centers[0];
    let bestDist = Infinity;
    for (const c of centers) {
      const d = Math.abs(c.center - viewportCenter);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best?.index ?? 0;
  }, [getCardCenters]);

  const resolveSnap = useCallback(() => {
    if (programmaticRef.current) return;
    const el = ref.current;
    if (!el) return;
    const centers = getCardCenters();
    if (!centers.length) return;

    const cardWidth = centers[0].width;
    const startLeft = gestureStartLeftRef.current;
    const startIndex = gestureStartIndexRef.current ?? activeIndexRef.current;
    const currentLeft = el.scrollLeft;
    const kind = gestureKindRef.current;

    // Touch = higher threshold (25% of card). Wheel/trackpad = lower (15%).
    const displacementThreshold = cardWidth * (kind === "wheel" ? 0.15 : 0.25);

    let targetIndex = startIndex;

    if (startLeft !== null) {
      const delta = currentLeft - startLeft;
      if (delta > displacementThreshold) targetIndex = startIndex + 1;
      else if (delta < -displacementThreshold) targetIndex = startIndex - 1;
    }

    // Only allow ±1 per gesture — never skip a card
    targetIndex = Math.max(startIndex - 1, Math.min(startIndex + 1, targetIndex));

    // If no clear intent, fall back to nearest but clamped to ±1
    if (targetIndex === startIndex) {
      const nearest = nearestIndex();
      const clampedNearest = Math.max(startIndex - 1, Math.min(startIndex + 1, nearest));
      if (clampedNearest !== startIndex) targetIndex = clampedNearest;
    }

    gestureStartLeftRef.current = null;
    gestureStartIndexRef.current = null;
    gestureKindRef.current = null;
    velocityRef.current = 0;
    scrollToIndex(targetIndex, true);
  }, [getCardCenters, nearestIndex, scrollToIndex]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onPointerDown = () => {
      gestureStartLeftRef.current = el.scrollLeft;
      gestureStartIndexRef.current = nearestIndex();
      gestureKindRef.current = "touch";
      lastScrollLeftRef.current = el.scrollLeft;
      lastScrollTimeRef.current = performance.now();
      velocityRef.current = 0;
    };

    const onWheel = () => {
      if (gestureStartLeftRef.current === null) {
        gestureStartLeftRef.current = el.scrollLeft;
        gestureStartIndexRef.current = nearestIndex();
        gestureKindRef.current = "wheel";
      }
    };

    const onScroll = () => {
      if (programmaticRef.current) return;
      const now = performance.now();
      const dt = now - lastScrollTimeRef.current;
      if (dt > 0) {
        const dx = el.scrollLeft - lastScrollLeftRef.current;
        // EMA on velocity for stability
        velocityRef.current = velocityRef.current * 0.5 + (dx / dt) * 0.5;
      }
      lastScrollLeftRef.current = el.scrollLeft;
      lastScrollTimeRef.current = now;

      // Live update active index for visual state
      const near = nearestIndex();
      if (near !== activeIndexRef.current) setActiveIndex(near);

      if (scrollEndTimerRef.current) window.clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = window.setTimeout(resolveSnap, 110);
    };

    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("touchstart", onPointerDown, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("touchstart", onPointerDown);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", onScroll);
      if (scrollEndTimerRef.current) window.clearTimeout(scrollEndTimerRef.current);
    };
  }, [nearestIndex, resolveSnap]);

  const scrollByDir = (dir: 1 | -1) => {
    scrollToIndex(activeIndexRef.current + dir, true);
  };

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") scrollByDir(1);
      if (e.key === "ArrowLeft") scrollByDir(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches.length]);

  return (
    <div className="relative">
      {/* Full-viewport scrollable strip (breaks out of parent width) */}
      <div className="relative w-screen left-1/2 -translate-x-1/2">
        {/* Smooth iOS-style edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-10 md:w-16 lg:w-24 z-20 bg-gradient-to-r from-background via-background/40 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-10 md:w-16 lg:w-24 z-20 bg-gradient-to-l from-background via-background/40 to-transparent" />

        <div
          ref={ref}
          className="flex items-center gap-6 overflow-x-auto snap-x snap-proximity py-6 min-h-[62vh] px-[12vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            overscrollBehaviorX: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {batches.map((b, i) => (
            <div
              key={b.id}
              data-card
              data-index={i}
              className="flex items-center"
              style={{ scrollSnapAlign: "center" }}
            >
              <ClassCardBig
                batch={b}
                index={i}
                isActive={i === activeIndex}
                onRename={onRename}
                onShowQR={onShowQR}
              />
            </div>
          ))}
        </div>
      </div>

      {batches.length > 1 && (
        <>
          {/* Arrow buttons live in the PARENT-width layer so they never get clipped
              by ancestor overflow-hidden even when the strip above is w-screen. */}
          <div className="pointer-events-none absolute inset-0 z-30">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scrollByDir(-1)}
              aria-label="Previous class"
              className="pointer-events-auto hidden md:flex absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg h-11 w-11 bg-background/80 backdrop-blur border-border/70 hover:bg-background"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scrollByDir(1)}
              aria-label="Next class"
              className="pointer-events-auto hidden md:flex absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 rounded-full shadow-lg h-11 w-11 bg-background/80 backdrop-blur border-border/70 hover:bg-background"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex justify-center gap-1.5 mt-2 relative z-30">
            {batches.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => scrollToIndex(i, true)}
                aria-label={`Go to class ${i + 1}`}
                animate={{
                  width: i === activeIndex ? 22 : 6,
                  opacity: i === activeIndex ? 1 : 0.35,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="h-1.5 rounded-full bg-foreground"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
