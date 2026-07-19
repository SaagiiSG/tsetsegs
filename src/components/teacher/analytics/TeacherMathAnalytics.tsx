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
  ChevronDown,
  Sparkles,
  BookOpen,
  Users,
  Loader2,
  Info,
  Flame,
} from "lucide-react";
import {
  useTeacherMathAnalytics,
  type WindowKey,
  type TopicStat,
  type DomainStat,
} from "@/hooks/useTeacherMathAnalytics";
import type { DashboardBatch } from "@/hooks/useTeacherDashboardData";
import { useHaptics } from "@/hooks/useHaptics";
import { cn } from "@/lib/utils";

interface Props {
  batches: DashboardBatch[];
}

const WINDOW_LABEL: Record<WindowKey, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All-time",
};

const STORAGE_KEY = "teacher-analytics-prefs-v1";

// Consistent hues per domain
const DOMAIN_ACCENT: Record<string, string> = {
  algebra: "hsl(217 91% 60%)",   // blue
  advanced: "hsl(280 82% 62%)",  // violet
  data: "hsl(30 92% 58%)",       // orange
  geometry: "hsl(160 78% 42%)",  // emerald
  other: "hsl(220 10% 55%)",
};

export function TeacherMathAnalytics({ batches }: Props) {
  const activeBatches = useMemo(
    () => batches.filter((b) => !b.metrics.isCompleted),
    [batches]
  );

  const initial = readPrefs();
  const [batchId, setBatchId] = useState<string>(initial.batchId ?? "all");
  const [win, setWin] = useState<WindowKey>(initial.win ?? "30d");

  const selectedBatchIds = useMemo(() => {
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

  const noData = !isLoading && (!data || data.domains.length === 0);

  return (
    <div className="space-y-4">
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
            <SelectTrigger className="h-9 rounded-xl text-sm w-[200px]">
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
        <div className="space-y-5">
          <DomainOverview domains={data.domains} />

          {/* Quick highlight rows */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <HighlightCard
              title="Focus areas"
              subtitle="Lowest accuracy — teach these"
              icon={<Flame className="h-4 w-4 text-orange-500" />}
              stats={data.weakest.slice(0, 3)}
              tone="weak"
            />
            <HighlightCard
              title="Strong topics for your students"
              subtitle="Your class already nails these"
              icon={<Sparkles className="h-4 w-4 text-emerald-500" />}
              stats={data.strongest.slice(0, 3)}
              tone="strong"
            />
          </div>

          {/* Domain sections with subtopic drill-down */}
          <div className="space-y-3">
            {data.domains.map((d) => (
              <DomainSection key={d.key} domain={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DomainOverview({ domains }: { domains: DomainStat[] }) {
  const max = Math.max(...domains.map((d) => d.attempts), 1);
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Domain accuracy</h3>
          <span className="text-[11px] text-muted-foreground">Bar length = attempts · %  = accuracy</span>
        </div>
        <div className="space-y-2.5">
          {domains.map((d) => {
            const accPct = Math.round(d.accuracy * 100);
            const width = Math.max(6, Math.round((d.attempts / max) * 100));
            const color = DOMAIN_ACCENT[d.key];
            return (
              <div key={d.key} className="flex items-center gap-3">
                <div className="w-32 md:w-40 shrink-0 text-xs md:text-sm truncate font-medium">
                  {d.label}
                </div>
                <div className="flex-1 h-6 rounded-lg bg-muted/60 relative overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all"
                    style={{ width: `${width}%`, background: color, opacity: 0.85 }}
                  />
                  <span className="absolute inset-0 flex items-center justify-end pr-2 text-[11px] font-semibold tabular-nums">
                    {accPct}% · {d.attempts}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function HighlightCard({
  title,
  subtitle,
  icon,
  stats,
  tone,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  stats: TopicStat[];
  tone: "weak" | "strong";
}) {
  if (stats.length === 0) return null;
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-start gap-2">
          {icon}
          <div>
            <h4 className="text-sm font-semibold">{title}</h4>
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {stats.map((s) => {
            const pct = Math.round(s.accuracy * 100);
            const color =
              tone === "strong"
                ? "text-emerald-500"
                : pct < 50
                ? "text-red-500"
                : "text-orange-500";
            return (
              <div key={s.topic} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate">{s.topic}</span>
                <span className={cn("tabular-nums font-semibold w-10 text-right", color)}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DomainSection({ domain }: { domain: DomainStat }) {
  const [open, setOpen] = useState(false);
  const haptic = useHaptics();
  const color = DOMAIN_ACCENT[domain.key];
  const accPct = Math.round(domain.accuracy * 100);

  return (
    <Card className="rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => {
          haptic("light");
          setOpen((v) => !v);
        }}
      >
        <span
          className="h-9 w-9 rounded-xl shrink-0"
          style={{ background: color, opacity: 0.2 }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base font-semibold truncate">{domain.label}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {domain.topics.length} topics
            </Badge>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${accPct}%`, background: color }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums w-12 text-right">{accPct}%</span>
          </div>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-muted-foreground shrink-0">
          <ChevronDown className="h-4 w-4" />
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
            <div className="px-4 pb-4 pt-1 space-y-1.5 border-t">
              {domain.topics.map((s) => (
                <SubtopicRow key={s.topic} stat={s} accent={color} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function SubtopicRow({ stat, accent }: { stat: TopicStat; accent: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const accPct = Math.round(stat.accuracy * 100);
  const tone =
    accPct < 50 ? "text-red-500" : accPct < 70 ? "text-orange-500" : "text-emerald-500";

  return (
    <div className="rounded-xl bg-muted/40">
      <button
        className="w-full flex items-center gap-3 px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm font-medium truncate">{stat.topic}</span>
            {stat.delta !== null && stat.delta < -0.08 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-500/40 text-red-500">
                <TrendingDown className="h-3 w-3 mr-0.5" />
                {Math.round(stat.delta * 100)}%
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 h-1 bg-background rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${accPct}%`, background: accent, opacity: 0.9 }}
              />
            </div>
            <span className={cn("text-[11px] tabular-nums font-semibold w-9 text-right", tone)}>
              {accPct}%
            </span>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
          {stat.attempts}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-muted-foreground shrink-0">
          <ChevronDown className="h-3.5 w-3.5" />
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
            <div className="px-3 pb-3 pt-1 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {stat.studentsTried}/{stat.studentsTotal} students · weakest first
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-6 rounded-full text-[11px] px-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    const params = new URLSearchParams({ subtopic: stat.topic });
                    navigate(`/teacher/dashboard?practice=1&${params.toString()}`);
                  }}
                >
                  <BookOpen className="h-3 w-3 mr-1" /> Practice
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {stat.students.slice(0, 8).map((s) => {
                  const p = Math.round(s.accuracy * 100);
                  const c =
                    p < 50 ? "text-red-500" : p < 70 ? "text-orange-500" : "text-emerald-500";
                  return (
                    <div
                      key={s.studentId}
                      className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-background/70"
                    >
                      <span className="truncate">{s.name}</span>
                      <span className={cn("tabular-nums font-semibold", c)}>
                        {p}%{" "}
                        <span className="text-muted-foreground font-normal">
                          ({s.correct}/{s.attempts})
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
