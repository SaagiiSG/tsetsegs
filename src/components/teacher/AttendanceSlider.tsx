import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AttendanceStatus = "present" | "late" | "absent" | "sick" | "excused" | "";

interface AttendanceSliderProps {
  value: AttendanceStatus;
  onChange: (value: AttendanceStatus) => void;
}

const statusOptions: { value: AttendanceStatus; label: string; shortLabel: string; color: string }[] = [
  { value: "", label: "—", shortLabel: "—", color: "text-muted-foreground" },
  { value: "present", label: "Present", shortLabel: "P", color: "text-[#03C988]" },
  { value: "late", label: "Late", shortLabel: "L", color: "text-[#FFDE0B]" },
  { value: "absent", label: "Absent", shortLabel: "A", color: "text-[#FA6363]" },
  { value: "sick", label: "Sick", shortLabel: "S", color: "text-blue-400" },
  { value: "excused", label: "Excused", shortLabel: "E", color: "text-purple-400" },
];

const ITEM_HEIGHT = 28;

export function AttendanceSlider({ value, onChange }: AttendanceSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const selectedIndex = statusOptions.findIndex((opt) => opt.value === value);
  const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;

  // Scroll to the selected value on mount and when value changes
  useEffect(() => {
    if (scrollRef.current && !isScrolling) {
      scrollRef.current.scrollTop = currentIndex * ITEM_HEIGHT;
    }
  }, [currentIndex, isScrolling]);

  const handleScroll = () => {
    if (!scrollRef.current) return;

    setIsScrolling(true);

    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set new timeout to snap after scrolling stops
    scrollTimeoutRef.current = setTimeout(() => {
      if (!scrollRef.current) return;

      const scrollTop = scrollRef.current.scrollTop;
      const newIndex = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(newIndex, statusOptions.length - 1));

      // Snap to nearest item
      scrollRef.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: "smooth",
      });

      // Update value if changed
      if (statusOptions[clampedIndex].value !== value) {
        onChange(statusOptions[clampedIndex].value);
      }

      setIsScrolling(false);
    }, 100);
  };

  const handleClick = (index: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: "smooth",
      });
      onChange(statusOptions[index].value);
    }
  };

  return (
    <div className="relative h-[84px] w-full min-w-[120px] overflow-hidden rounded-lg border bg-background/80 backdrop-blur-sm">
      {/* Selection highlight band */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[28px] bg-primary/10 border-y border-primary/20 pointer-events-none z-10" />

      {/* Gradient masks */}
      <div className="absolute inset-x-0 top-0 h-7 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />

      {/* Scrollable area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {/* Top padding */}
        <div style={{ height: ITEM_HEIGHT }} />

        {statusOptions.map((option, index) => (
          <button
            key={option.value || "empty"}
            onClick={() => handleClick(index)}
            className={cn(
              "w-full flex items-center justify-center text-xs font-medium transition-all snap-center",
              option.color,
              currentIndex === index ? "opacity-100 scale-105" : "opacity-40 scale-95"
            )}
            style={{ height: ITEM_HEIGHT }}
          >
            {option.label}
          </button>
        ))}

        {/* Bottom padding */}
        <div style={{ height: ITEM_HEIGHT }} />
      </div>
    </div>
  );
}
