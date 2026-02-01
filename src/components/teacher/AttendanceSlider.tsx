import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

type AttendanceStatus = "present" | "late" | "absent" | "sick" | "excused" | "";

interface AttendanceSliderProps {
  value: AttendanceStatus;
  onChange: (value: AttendanceStatus) => void;
}

const statusOptions: { value: AttendanceStatus; label: string; selectedColor: string }[] = [
  { value: "", label: "—", selectedColor: "text-muted-foreground" },
  { value: "present", label: "Present", selectedColor: "text-[#03C988]" },
  { value: "late", label: "Late", selectedColor: "text-[#FFDE0B]" },
  { value: "absent", label: "Absent", selectedColor: "text-[#FA6363]" },
  { value: "sick", label: "Sick", selectedColor: "text-blue-400" },
  { value: "excused", label: "Excused", selectedColor: "text-purple-400" },
];

const ITEM_HEIGHT = 44;

export function AttendanceSlider({ value, onChange }: AttendanceSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedIndex = statusOptions.findIndex((opt) => opt.value === value);
  const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;

  // Scroll to selected value on mount
  useEffect(() => {
    if (containerRef.current && currentIndex >= 0) {
      containerRef.current.scrollTop = currentIndex * ITEM_HEIGHT;
    }
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const newIndex = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(newIndex, statusOptions.length - 1));
    if (statusOptions[clampedIndex]?.value !== value) {
      onChange(statusOptions[clampedIndex].value);
    }
  };

  const scrollToIndex = (index: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative h-[132px] w-[120px] overflow-hidden rounded-xl bg-card">
      {/* Selection indicator */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-11 bg-primary/10 border-y border-primary/20 pointer-events-none z-10 rounded-lg mx-1" />
      
      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-11 bg-gradient-to-b from-card to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-11 bg-gradient-to-t from-card to-transparent pointer-events-none z-20" />
      
      {/* Scrollable list */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide snap-y snap-mandatory"
        onScroll={handleScroll}
        style={{ 
          paddingTop: ITEM_HEIGHT,
          paddingBottom: ITEM_HEIGHT,
          scrollSnapType: 'y mandatory'
        }}
      >
        {statusOptions.map((option, index) => {
          const isSelected = option.value === value;
          return (
            <div
              key={option.value || "empty"}
              className={cn(
                "h-11 flex items-center justify-center cursor-pointer transition-all duration-200 snap-center",
                isSelected 
                  ? cn("font-bold text-base scale-105", option.selectedColor)
                  : "text-muted-foreground/70 text-sm"
              )}
              onClick={() => scrollToIndex(index)}
            >
              {option.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
