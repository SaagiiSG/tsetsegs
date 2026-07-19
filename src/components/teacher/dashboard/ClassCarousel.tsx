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

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>("[data-card]");
    const w = first ? first.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  return (
    <div className="relative px-8 md:px-12">
      <div
        ref={ref}
        className="flex items-center gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 py-6 min-h-[60vh] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {batches.map((b, i) => (
          <div key={b.id} data-card data-index={i} className="flex items-center">
            <ClassCardBig batch={b} index={i} onRename={onRename} onShowQR={onShowQR} />
          </div>
        ))}
      </div>

      {batches.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollBy(-1)}
            className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 rounded-full shadow-md z-10 bg-background/95"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollBy(1)}
            className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 rounded-full shadow-md z-10 bg-background/95"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="flex justify-center gap-1.5 mt-2">
            {batches.map((_, i) => (
              <motion.span
                key={i}
                animate={{
                  width: i === activeIndex ? 20 : 6,
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

