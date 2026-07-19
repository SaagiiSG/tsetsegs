import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingDown,
  TrendingUp,
  Flame,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  Users,
  Loader2,
  Info,
} from "lucide-react";
import {
  useTeacherMathAnalytics,
  type WindowKey,
  type TopicStat,
} from "@/hooks/useTeacherMathAnalytics";
import type { DashboardBatch } from "@/hooks/useTeacherDashboardData";
import { useHaptics } from "@/hooks/useHaptics";

interface Props {
  batches: DashboardBatch[];
}

const WINDOW_LABEL: Record<WindowKey, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All-time",
};

const STORAGE_KEY = "teacher-analytics-prefs-v1";

export function TeacherMathAnalytics({ batches }: Props) {
  const activeBatches = useMemo(
    () => batches.filter((b) => !b.metrics.isCompleted),
    [batches]
  );

  const initial = readPrefs();
  const [batchId, setBatchId] = useState<string>(initial.batchId ?? "all");
  const [win, setWin] = useState<WindowKey>(initial.win ?? "30d");

  const selectedBatchIds = useMemo(() => {
    // "All-time" is a teacher-wide view: include every batch (active + completed)
    // so it truly reflects every student assigned to this teacher.
    if (batchId === "all") {
      return win === "all" ? batches.map((b) => b.id) : activeBatches.map((b) => b.id);
    }
    return [batchId];
  }, [batchId, win, activeBatches, batches]);


  const { data, isLoading } = useTeacherMathAnalytics({
    batchIds: selectedBatchIds,
    window: win,
    enabled: selectedBatchIds.length > 0,
  });

  const persist = (nextBatch: string, nextWin: WindowKey) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ batchId: nextBatch, win: nextWin }));
    } catch {}
  };

  const noData =
    !isLoading && (!data || (data.weakest.length === 0 && data.drops.length === 0 && data.strongest.length === 0));

  return (
    <div className="space-y-5">
      {/* Filters */}
      <Card className="rounded-2xl">
        <CardContent className="p-3 md:p-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Math analytics</span>
          </div>
          <Select
            value={batchId}
            onValueChange={(v) => {
              setBatchId(v);
              persist(v, win);
            }}
          >
            <SelectTrigger className="h-9 rounded-xl text-sm w-[220px]">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All active classes</SelectItem>
              {activeBatches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.nickname || b.batch_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-xl border overflow-hidden">
            {(["7d", "30d", "all"] as WindowKey[]).map((k) => (
              <Button
                key={k}
                variant={win === k ? "default" : "ghost"}
                size="sm"
                className="h-9 rounded-none text-xs px-3"
                onClick={() => {
                  setWin(k);
                  persist(batchId, k);
                }}
              >
                {WINDOW_LABEL[k]}
              </Button>
            ))}
          </div>
          {data && (
            <div className="ml-auto text-xs text-muted-foreground">
              <Users className="inline h-3 w-3 mr-1" />
              {data.totalStudents} students · {data.totalAttempts} attempts
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {noData && (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center space-y-2">
            <Info className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Not enough math practice yet for this window.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Insights need at least 10 attempts per topic before they appear.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && data && !noData && (
        <div className="space-y-6">
          <Section
            icon={<Flame className="h-4 w-4 text-orange-500" />}
            title="Go harder here"
            subtitle="Topics where your students score lowest — spend more class time on these"
            stats={data.weakest}
            mode="weak"
          />
          {data.drops.length > 0 && (
            <Section
              icon={<TrendingDown className="h-4 w-4 text-red-500" />}
              title="Biggest recent drops"
              subtitle="Accuracy fell vs the previous window — catch these regressions fast"
              stats={data.drops}
              mode="drop"
            />
          )}
          {data.strongest.length > 0 && (
            <Section
              icon={<Sparkles className="h-4 w-4 text-emerald-500" />}
              title="Safe to skim"
              subtitle="Your class already nails these — you can move quickly"
              stats={data.strongest}
              mode="strong"
            />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  stats,
  mode,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  stats: TopicStat[];
  mode: "weak" | "drop" | "strong";
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 px-1">
        <div className="mt-0.5">{icon}</div>
        <div>
          <h3 className="text-sm md:text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-2">
        {stats.map((s) => (
          <TopicRow key={s.topic} stat={s} mode={mode} />
        ))}
      </div>
    </div>
  );
}

function TopicRow({ stat, mode }: { stat: TopicStat; mode: "weak" | "drop" | "strong" }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const haptic = useHaptics();
  const accPct = Math.round(stat.accuracy * 100);
  const tone =
    mode === "strong"
      ? "text-emerald-500"
      : accPct < 50
      ? "text-red-500"
      : accPct < 70
      ? "text-orange-500"
      : "text-yellow-500";

  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardContent className="p-3 md:p-4">
        <button
          className="w-full flex items-center gap-3 text-left"
          onClick={() => {
            haptic("light");
            setOpen((o) => !o);
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate">{stat.topic}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {stat.attempts} attempts
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {stat.studentsTried}/{stat.studentsTotal} students
              </Badge>
              {mode === "drop" && stat.delta !== null && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-red-500/40 text-red-500"
                >
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {Math.round(stat.delta * 100)}%
                </Badge>
              )}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <Progress value={accPct} className="h-1.5 flex-1" />
              <span className={`text-sm font-semibold tabular-nums w-12 text-right ${tone}`}>
                {accPct}%
              </span>
            </div>
            {mode === "drop" && stat.priorAccuracy !== null && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Prior: {Math.round(stat.priorAccuracy * 100)}% → now {accPct}%
              </p>
            )}
          </div>
          <div className="shrink-0 text-muted-foreground">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
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
              <div className="pt-3 mt-3 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Students · sorted by weakest first
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 rounded-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      const params = new URLSearchParams({ subtopic: stat.topic });
                      navigate(`/teacher/dashboard?practice=1&${params.toString()}`);
                    }}
                  >
                    <BookOpen className="h-3 w-3 mr-1" /> Practice in class
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {stat.students.slice(0, 10).map((s) => {
                    const p = Math.round(s.accuracy * 100);
                    const c =
                      p < 50 ? "text-red-500" : p < 70 ? "text-orange-500" : "text-emerald-500";
                    return (
                      <div
                        key={s.studentId}
                        className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-muted/50"
                      >
                        <span className="truncate">{s.name}</span>
                        <span className={`tabular-nums font-semibold ${c}`}>
                          {p}% <span className="text-muted-foreground font-normal">({s.correct}/{s.attempts})</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function readPrefs(): { batchId?: string; win?: WindowKey } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
