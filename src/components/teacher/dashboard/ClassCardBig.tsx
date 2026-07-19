import { motion } from "framer-motion";
import { Pencil, Users, MapPin, BarChart3, QrCode, Flower2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { ScheduleGlyph } from "./ScheduleGlyph";
import { ClassCardAnalyticsPreview } from "./ClassCardAnalyticsPreview";
import type { DashboardBatch } from "@/hooks/useTeacherDashboardData";
import { useHaptics } from "@/hooks/useHaptics";


interface Props {
  batch: DashboardBatch;
  index: number;
  isActive?: boolean;
  onRename: (b: DashboardBatch) => void;
  onShowQR: (b: DashboardBatch) => void;
}

export function ClassCardBig({ batch, index, isActive = true, onRename, onShowQR }: Props) {
  const navigate = useNavigate();
  const haptic = useHaptics();
  const m = batch.metrics;
  const displayName = batch.nickname || batch.batch_name;
  

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{
        opacity: isActive ? 1 : 0.55,
        y: 0,
        scale: isActive ? 1 : 0.9,
        filter: isActive ? "blur(0px)" : "blur(1.5px)",
      }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 220, damping: 28, mass: 0.9, delay: index * 0.03 }}
      className="snap-center shrink-0 w-[88vw] md:w-[75vw] lg:w-[75vw] xl:w-[75vw] max-w-[1200px]"
    >
      <Card className="relative overflow-hidden rounded-3xl border-border/60 shadow-sm hover:shadow-lg transition-shadow p-5 md:p-8 bg-card/95 backdrop-blur flex flex-col md:min-h-[62vh] md:max-h-[calc(100vh-220px)]">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 group">
              <h3 className="text-lg md:text-xl font-semibold leading-tight truncate">{displayName}</h3>
              <button
                onClick={() => onRename(batch)}
                className="opacity-60 hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
                aria-label="Rename class"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
            {batch.nickname && (
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">{batch.batch_name}</p>
            )}
            <div className="mt-2">
              <ScheduleGlyph schedule={batch.schedule} />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {/online/i.test(batch.schedule) ? "Online" : `Room ${batch.room}`}
              </span>
              <span>·</span>
              <span>
                Started{" "}
                {new Date(batch.start_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 gap-1 rounded-full px-3 py-1">
            <Users className="h-3.5 w-3.5" />
            {m.studentCount}
          </Badge>
        </div>

        {/* Actions — moved to the top where attendance/attention used to live */}
        <div className="mt-5 flex items-center gap-2">
          <Button
            className="flex-1 rounded-full"
            onClick={() => {
              haptic("light");
              navigate(`/teacher/students/${batch.id}`);
            }}
          >
            <Users className="h-3.5 w-3.5 mr-1.5" /> Students
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-full"
            onClick={() => {
              haptic("light");
              navigate(`/teacher/analytics/${batch.id}`);
            }}
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Analytics
          </Button>
          <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => onShowQR(batch)}>
            <QrCode className="h-3.5 w-3.5" />
          </Button>
          {m.isCompleted && (
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shrink-0"
              onClick={() => navigate(`/teacher/wrapped/${batch.id}`)}
            >
              <Flower2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>



        {/* Analytics preview — fills the mid-card space on tablet/desktop */}
        <div className="hidden md:flex flex-1 min-h-0 mt-5">
          {isActive && <ClassCardAnalyticsPreview batchId={batch.id} />}
        </div>


      </Card>
    </motion.div>

  );
}


