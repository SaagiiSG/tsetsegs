import { useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type AttendanceStatus = "present" | "late" | "absent" | "sick" | "excused" | "";

interface AttendanceSliderProps {
  value: AttendanceStatus;
  onChange: (value: AttendanceStatus) => void;
}

const statusOptions: { value: AttendanceStatus; label: string; shortLabel: string; selectedColor: string; bgColor: string }[] = [
  { value: "", label: "—", shortLabel: "—", selectedColor: "text-muted-foreground", bgColor: "bg-muted" },
  { value: "present", label: "Present", shortLabel: "P", selectedColor: "text-[#03C988]", bgColor: "bg-[#03C988]/15" },
  { value: "late", label: "Late", shortLabel: "L", selectedColor: "text-[#FFDE0B]", bgColor: "bg-[#FFDE0B]/15" },
  { value: "absent", label: "Absent", shortLabel: "A", selectedColor: "text-[#FA6363]", bgColor: "bg-[#FA6363]/15" },
  { value: "sick", label: "Sick", shortLabel: "S", selectedColor: "text-blue-400", bgColor: "bg-blue-400/15" },
  { value: "excused", label: "Excused", shortLabel: "E", selectedColor: "text-purple-400", bgColor: "bg-purple-400/15" },
];

const ITEM_HEIGHT = 44;

// Mobile: simple tap-to-cycle button
function MobileAttendanceButton({ value, onChange }: AttendanceSliderProps) {
  const currentIndex = statusOptions.findIndex((opt) => opt.value === value);
  const current = statusOptions[currentIndex >= 0 ? currentIndex : 0];

  const handleTap = () => {
    const nextIndex = ((currentIndex >= 0 ? currentIndex : 0) + 1) % statusOptions.length;
    onChange(statusOptions[nextIndex].value);
  };

  return (
    <button
      type="button"
      onClick={handleTap}
      className={cn(
        "h-10 w-14 rounded-lg font-bold text-sm flex items-center justify-center transition-colors active:scale-95",
        current.bgColor,
        current.selectedColor
      )}
    >
      {current.shortLabel}
    </button>
  );
}

// Desktop: scroll-based picker (unchanged behavior)
function DesktopAttendanceSlider({ value, onChange }: AttendanceSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  
  const selectedIndex = statusOptions.findIndex((opt) => opt.value === value);
  const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;

  // Scroll to selected value on mount
  useEffect(() => {
    if (containerRef.current && currentIndex >= 0) {
      isScrollingProgrammatically.current = true;
      containerRef.current.scrollTop = currentIndex * ITEM_HEIGHT;
      // Reset flag after scroll settles
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 100);
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || isScrollingProgrammatically.current) return;
    
    // Debounce scroll handling
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const newIndex = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(newIndex, statusOptions.length - 1));
      if (statusOptions[clampedIndex]?.value !== value) {
        onChange(statusOptions[clampedIndex].value);
      }
    }, 80);
  }, [value, onChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const scrollToIndex = (index: number) => {
    if (containerRef.current) {
      isScrollingProgrammatically.current = true;
      containerRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: 'smooth'
      });
      // Reset flag after animation
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 300);
      onChange(statusOptions[index].value);
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
                  ? cn("font-semibold text-xs scale-105", option.selectedColor)
                  : "text-muted-foreground/70 text-[10px]"
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

export function AttendanceSlider(props: AttendanceSliderProps) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileAttendanceButton {...props} />;
  }
  
  return <DesktopAttendanceSlider {...props} />;
}
