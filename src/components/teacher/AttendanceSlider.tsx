import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type AttendanceStatus = "present" | "late" | "absent" | "sick" | "";

interface AttendanceSliderProps {
  value: AttendanceStatus;
  onChange: (value: AttendanceStatus) => void;
}

const statusOptions: { value: AttendanceStatus; label: string; icon: string; color: string }[] = [
  { value: "present", label: "P", icon: "✓", color: "bg-green-500" },
  { value: "late", label: "L", icon: "⏰", color: "bg-yellow-500" },
  { value: "absent", label: "A", icon: "✗", color: "bg-red-500" },
  { value: "sick", label: "S", icon: "🤒", color: "bg-blue-500" },
];

export function AttendanceSlider({ value, onChange }: AttendanceSliderProps) {
  const selectedIndex = statusOptions.findIndex((opt) => opt.value === value);
  
  return (
    <div className="relative flex items-center bg-muted/80 rounded-full p-0.5 h-7 w-[88px]">
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
            "relative z-10 flex items-center justify-center w-5 h-6 text-[10px] font-semibold transition-colors rounded-full",
            selectedIndex === index
              ? "text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={option.value.charAt(0).toUpperCase() + option.value.slice(1)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
