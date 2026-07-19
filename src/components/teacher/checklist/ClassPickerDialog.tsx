import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { useTeacherDashboardData } from "@/hooks/useTeacherDashboardData";
import { GraduationCap, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (batchId: string, batchTitle: string) => void;
  title?: string;
}

export function ClassPickerDialog({ open, onOpenChange, onPick, title = "Pick a class" }: Props) {
  const { teacherName } = useTeacherAuth();
  const { data: allBatches = [], isLoading } = useTeacherDashboardData(teacherName);

  const active = useMemo(
    () => allBatches.filter((b) => !b.metrics.isCompleted),
    [allBatches]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <p className="text-xs text-muted-foreground">Only active classes are shown.</p>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-3 pb-4 space-y-2">
          {isLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
            ))
          ) : active.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-10">
              No active classes.
            </div>
          ) : (
            active.map((b) => {
              const label = b.nickname || b.batch_name;
              return (
                <button
                  key={b.id}
                  onClick={() => onPick(b.id, label)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-2xl border bg-card/60 hover:bg-muted/60 active:bg-muted transition-colors px-4 py-3 text-left"
                  )}
                >
                  <span className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{label}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {b.metrics.studentCount}
                      </span>
                      {b.schedule && <span className="truncate">· {b.schedule}</span>}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
