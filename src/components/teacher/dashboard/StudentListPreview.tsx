import { useEffect, useMemo, useRef, useState } from "react";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Student {
  id: string;
  name: string;
}

interface Props {
  students: Student[];
  total: number;
  batchId: string;
}

const ITEM_HEIGHT = 40; // item + gap approximation
const MIN_VISIBLE = 4;
const MAX_VISIBLE = 7;

export function StudentListPreview({ students, total, batchId }: Props) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(MAX_VISIBLE);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const height = el.clientHeight;
      const count = Math.max(MIN_VISIBLE, Math.min(MAX_VISIBLE, Math.floor(height / ITEM_HEIGHT)));
      setVisibleCount(count);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const visible = useMemo(() => students.slice(0, visibleCount), [students, visibleCount]);
  const remaining = Math.max(0, students.length - visibleCount);

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground/80 inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Students
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">{total} total</span>
      </div>

      {students.length === 0 ? (
        <div className="flex-1 flex items-center justify-center rounded-xl bg-muted/40 border border-border/60">
          <p className="text-xs text-muted-foreground/70">No students enrolled yet</p>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1 overflow-y-auto pr-1 space-y-1">
          {visible.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/teacher/students/${batchId}?student=${s.id}`)}
              className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-muted/60 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-semibold text-primary">
                {initials(s.name)}
              </div>
              <span className="text-xs font-medium truncate">{s.name}</span>
            </button>
          ))}
          {remaining > 0 && (
            <div className="text-[11px] text-muted-foreground/70 px-2.5 py-1.5">
              +{remaining} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
