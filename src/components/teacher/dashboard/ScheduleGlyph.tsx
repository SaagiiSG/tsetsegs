import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  schedule: string;
  className?: string;
}

const DAY_LETTERS: Record<string, string> = {
  Mon: "M", Monday: "M", Даваа: "M",
  Tue: "T", Tuesday: "T", Мягмар: "T",
  Wed: "W", Wednesday: "W", Лхагва: "W",
  Thu: "Th", Thursday: "Th", Пүрэв: "Th",
  Fri: "F", Friday: "F", Баасан: "F",
  Sat: "S", Saturday: "S", Бямба: "S",
  Sun: "Su", Sunday: "Su", Ням: "Su",
};

function compress(schedule: string): { glyph: string; time: string } {
  const cleaned = schedule.replace(/\[Holiday\]/gi, "").trim();
  const timeMatch = cleaned.match(/(\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2})/);
  const time = timeMatch ? timeMatch[1].replace(/\s/g, "") : "";
  const dayHits: string[] = [];
  Object.keys(DAY_LETTERS).forEach((k) => {
    const re = new RegExp(`\\b${k}\\b`, "i");
    if (re.test(cleaned) && !dayHits.includes(DAY_LETTERS[k])) dayHits.push(DAY_LETTERS[k]);
  });
  return { glyph: dayHits.join("") || cleaned.split(/[·•]/)[0].trim().slice(0, 8), time };
}

export function ScheduleGlyph({ schedule, className }: Props) {
  const [open, setOpen] = useState(false);
  const { glyph, time } = compress(schedule);
  const isOnline = /online/i.test(schedule);

  return (
    <div className={cn("select-none", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex items-center gap-2 text-sm font-medium text-foreground/90 hover:text-foreground transition-colors"
      >
        <span className="font-mono tracking-tight">{isOnline ? "🌐 Online" : glyph}</span>
        {time && <span className="text-muted-foreground font-normal">· {time}</span>}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="overflow-hidden"
          >
            <p className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {schedule.replace(/\[Holiday\]/gi, "").trim()}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
