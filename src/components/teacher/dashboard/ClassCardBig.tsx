import { motion } from "framer-motion";
import { Pencil, Users, MapPin, AlertTriangle, Sparkles, BarChart3, QrCode, Flower2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScheduleGlyph } from "./ScheduleGlyph";
import type { DashboardBatch } from "@/hooks/useTeacherDashboardData";
import { useHaptics } from "@/hooks/useHaptics";

interface Props {
  batch: DashboardBatch;
  index: number;
  onRename: (b: DashboardBatch) => void;
  onShowQR: (b: DashboardBatch) => void;
}

export function ClassCardBig({ batch, index, onRename, onShowQR }: Props) {
  const navigate = useNavigate();
  const haptic = useHaptics();
  const m = batch.metrics;
  const displayName = batch.nickname || batch.batch_name;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9, delay: index * 0.04 }}
      className="snap-center shrink-0 w-[88vw] md:w-[75vw] lg:w-[75vw] xl:w-[75vw] max-w-[1100px]"
    >
      <Card className="relative overflow-hidden rounded-3xl border-border/60 shadow-sm hover:shadow-lg transition-shadow p-5 md:p-6 bg-card/95 backdrop-blur">
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

        {/* Metrics */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <MetricBar label="Attendance" value={m.attendanceRate} tone="primary" />
          <MetricBar label="Homework" value={m.homeworkRate} tone="accent" />
        </div>

        {/* Top / attention */}
        <div className="mt-5 space-y-2.5">
          {m.topStudents.length > 0 && (
            <Row icon={<Sparkles className="h-3.5 w-3.5 text-amber-500" />} label="Top attendance">
              <div className="flex flex-wrap gap-1.5">
                {m.topStudents.map((s) => (
                  <span key={s.id} className="text-xs bg-muted rounded-full px-2 py-0.5">
                    {s.name} · {s.metric}
                  </span>
                ))}
              </div>
            </Row>
          )}
          <Row
            icon={<AlertTriangle className={`h-3.5 w-3.5 ${m.needsAttention.length ? "text-orange-500" : "text-muted-foreground/50"}`} />}
            label={`Needs attention (${m.needsAttention.length})`}
          >
            {m.needsAttention.length === 0 ? (
              <span className="text-xs text-muted-foreground">All good ✨</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {m.needsAttention.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      haptic("light");
                      navigate(`/teacher/students/${batch.id}?focus=${s.id}`);
                    }}
                    className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full px-2 py-0.5 hover:bg-orange-500/20 transition-colors"
                  >
                    {s.name}
                  </button>
                ))}
                {m.needsAttention.length > 3 && (
                  <span className="text-xs text-muted-foreground self-center">+{m.needsAttention.length - 3}</span>
                )}
              </div>
            )}
          </Row>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-2">
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
            className="rounded-full"
            onClick={() => {
              haptic("light");
              navigate(`/teacher/analytics/${batch.id}`);
            }}
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Analytics
          </Button>
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => onShowQR(batch)}>
            <QrCode className="h-3.5 w-3.5" />
          </Button>
          {m.isCompleted && (
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => navigate(`/teacher/wrapped/${batch.id}`)}
            >
              <Flower2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function MetricBar({ label, value, tone }: { label: string; value: number; tone: "primary" | "accent" }) {
  const color = tone === "primary" ? "text-primary" : "text-accent-foreground";
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground/80 mb-1">{label}</div>
        {children}
      </div>
    </div>
  );
}
