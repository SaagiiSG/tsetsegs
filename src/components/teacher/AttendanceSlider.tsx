import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type AttendanceStatus = "present" | "late" | "absent" | "sick" | "excused" | "";

interface AttendanceSliderProps {
  value: AttendanceStatus;
  onChange: (value: AttendanceStatus) => void;
}

const statusOptions: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: "present", label: "✓", color: "bg-[#03C988]" },
  { value: "late", label: "⏰", color: "bg-[#FFDE0B]" },
  { value: "absent", label: "✗", color: "bg-[#FA6363]" },
  { value: "sick", label: "🤒", color: "bg-blue-400" },
  { value: "excused", label: "🆓", color: "bg-purple-400" },
];

export function AttendanceSlider({ value, onChange }: AttendanceSliderProps) {
  const selectedIndex = statusOptions.findIndex((opt) => opt.value === value);
  
  return (
    <div className="relative flex items-center bg-muted/80 rounded-full p-0.5 h-7 w-[110px]">
      {/* Sliding indicator */}
      {selectedIndex >= 0 && (
        <motion.div
          className={cn(
            "absolute h-6 w-5 rounded-full shadow-sm",
            statusOptions[selectedIndex]?.color || "bg-primary"
          )}
          initial={false}
          animate={{
            x: selectedIndex * 22,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        />
      )}
      
      {/* Options */}
      {statusOptions.map((option, index) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative z-10 flex items-center justify-center w-5 h-6 text-[10px] transition-colors rounded-full",
            selectedIndex === index
              ? "grayscale-0"
              : "grayscale opacity-50 hover:opacity-80"
          )}
          title={option.value.charAt(0).toUpperCase() + option.value.slice(1)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}