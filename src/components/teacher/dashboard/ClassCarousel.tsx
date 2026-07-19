import { useRef, useState, useEffect } from "react";
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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll<HTMLElement>("[data-card]"));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.55) {
            const idx = Number((e.target as HTMLElement).dataset.index);
            setActiveIndex(idx);
          }
        });
      },
      { root: el, threshold: [0.55, 0.75] }
    );
    cards.forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, [batches.length]);

  const scrollTo = (idx: number) => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(`[data-index="${idx}"]`);
    if (card) {
      const target = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2;
      el.scrollTo({ left: target, behavior: "smooth" });
    }
  };

  const scrollByDir = (dir: 1 | -1) => {
    const next = Math.max(0, Math.min(batches.length - 1, activeIndex + dir));
    scrollTo(next);
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
  }, [activeIndex, batches.length]);

  return (
    <div className="relative">
      {/* Smooth iOS-style edge fades — softer on mobile so cards don’t look cut off */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-10 md:w-16 lg:w-24 z-20 bg-gradient-to-r from-background via-background/40 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-10 md:w-16 lg:w-24 z-20 bg-gradient-to-l from-background via-background/40 to-transparent" />

      <div
        ref={ref}
        className="flex items-center gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth py-6 min-h-[70vh] px-[12vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory", overscrollBehaviorX: "contain" }}
      >
        {batches.map((b, i) => (
          <div key={b.id} data-card data-index={i} className="flex items-center" style={{ scrollSnapAlign: "center", scrollSnapStop: "always" }}>
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

      {batches.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollByDir(-1)}
            aria-label="Previous class"
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 rounded-full shadow-lg z-30 h-11 w-11 bg-background/80 backdrop-blur border-border/70 hover:bg-background"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollByDir(1)}
            aria-label="Next class"
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 rounded-full shadow-lg z-30 h-11 w-11 bg-background/80 backdrop-blur border-border/70 hover:bg-background"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div className="flex justify-center gap-1.5 mt-2">
            {batches.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => scrollTo(i)}
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
