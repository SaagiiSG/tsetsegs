import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CheckCircle2, Circle, Clock, ListChecks, CalendarDays, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TEACHING_TOPICS, SESSIONS, type ChecklistTopic } from "@/data/teachingChecklist";
import { useTeachingChecklist } from "@/hooks/useTeachingChecklist";
import { useHaptics } from "@/hooks/useHaptics";
import { cn } from "@/lib/utils";

interface Props {
  batchId: string | null;
  title?: string;
  compact?: boolean; // desktop preview vs full-mobile
  /** Called when the teacher taps "Start" on a session card. */
  onStartSession?: (sessionNumber: number) => void;
  /** Initial tab. Defaults to "sessions". */
  defaultView?: "topics" | "sessions";
}

export function ChecklistView({ batchId, title, compact = false, onStartSession, defaultView = "sessions" }: Props) {
  const { checkedSet, toggle, loading } = useTeachingChecklist(batchId);
  const [view, setView] = useState<"topics" | "sessions">(defaultView);
  const haptic = useHaptics();

  const totalItems = useMemo(
    () => TEACHING_TOPICS.reduce((a, t) => a + t.items.length, 0),
    []
  );
  const doneCount = checkedSet.size;
  const overallPct = totalItems === 0 ? 0 : Math.round((doneCount / totalItems) * 100);

  return (
    <div className={cn("flex flex-col", compact ? "h-full" : "min-h-screen bg-background")}>
      {/* Sticky header */}
      <div className={cn("sticky top-0 z-10 bg-background/90 backdrop-blur border-b", compact ? "px-4 py-3" : "px-4 py-3 md:py-4")}>
        {title && <h2 className="text-sm md:text-base font-semibold truncate">{title}</h2>}
        <div className="flex items-center gap-3 mt-2">
          <Progress value={overallPct} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground tabular-nums">
            {doneCount}/{totalItems} · {overallPct}%
          </span>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as any)} className="mt-3">
          <TabsList className="grid grid-cols-2 w-full h-9 rounded-full">
            <TabsTrigger value="topics" className="rounded-full text-xs gap-1.5">
              <ListChecks className="h-3.5 w-3.5" /> By topic
            </TabsTrigger>
            <TabsTrigger value="sessions" className="rounded-full text-xs gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> By session
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Body */}
      <div className={cn("flex-1 overflow-y-auto", compact ? "px-3 py-3" : "px-4 py-4 pb-24")}>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : view === "topics" ? (
          <div className="space-y-2.5">
            {TEACHING_TOPICS.map((topic) => (
              <TopicCard
                key={topic.key}
                topic={topic}
                checkedSet={checkedSet}
                onToggle={(k, v) => {
                  haptic(v ? "medium" : "light");
                  toggle(k, v);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {SESSIONS.map((s) => {
              const topics = s.topicNumbers
                .map((n) => TEACHING_TOPICS.find((t) => t.number === n))
                .filter(Boolean) as ChecklistTopic[];
              const items = topics.flatMap((t) => t.items);
              const doneInSession = items.filter((i) => checkedSet.has(i.key)).length;
              const pct = items.length === 0 ? 0 : Math.round((doneInSession / items.length) * 100);
              return (
                <SessionCard
                  key={s.number}
                  title={s.title}
                  pct={pct}
                  doneCount={doneInSession}
                  totalCount={items.length}
                  topics={topics}
                  checkedSet={checkedSet}
                  onToggle={(k, v) => {
                    haptic(v ? "medium" : "light");
                    toggle(k, v);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Topic ────────────────────────────────────────────────────────────
function TopicCard({
  topic,
  checkedSet,
  onToggle,
  defaultOpen,
}: {
  topic: ChecklistTopic;
  checkedSet: Set<string>;
  onToggle: (key: string, v: boolean) => void;
  defaultOpen?: boolean;
}) {
  const done = topic.items.filter((i) => checkedSet.has(i.key)).length;
  const total = topic.items.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const allDone = done === total && total > 0;
  const [open, setOpen] = useState(!!defaultOpen);

  return (
    <div className={cn(
      "rounded-2xl border bg-card/60 backdrop-blur transition-colors",
      allDone && "border-emerald-500/40 bg-emerald-500/5"
    )}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-left"
      >
        <span className={cn(
          "shrink-0 h-8 w-8 rounded-full grid place-items-center text-xs font-semibold tabular-nums",
          allDone ? "bg-emerald-500 text-white" : "bg-muted text-foreground"
        )}>
          {allDone ? <CheckCircle2 className="h-4 w-4" /> : topic.number}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-medium truncate">{topic.title}</h3>
            {topic.minutes && (
              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3" />
                {topic.minutes}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={pct} className="h-1 flex-1" />
            <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">{done}/{total}</span>
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
            <ul className="px-3.5 pb-3 pt-1 space-y-1">
              {topic.items.map((item) => {
                const isDone = checkedSet.has(item.key);
                return (
                  <li key={item.key}>
                    <label
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer select-none transition-colors",
                        isDone ? "bg-emerald-500/10" : "hover:bg-muted/60 active:bg-muted"
                      )}
                    >
                      <Checkbox
                        checked={isDone}
                        onCheckedChange={(v) => onToggle(item.key, !!v)}
                        className="h-5 w-5"
                      />
                      <span className={cn("text-sm flex-1", isDone && "line-through text-muted-foreground")}>
                        {item.label}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Session ──────────────────────────────────────────────────────────
function SessionCard({
  title,
  pct,
  doneCount,
  totalCount,
  topics,
  checkedSet,
  onToggle,
}: {
  title: string;
  pct: number;
  doneCount: number;
  totalCount: number;
  topics: ChecklistTopic[];
  checkedSet: Set<string>;
  onToggle: (key: string, v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const complete = doneCount === totalCount && totalCount > 0;
  return (
    <div className={cn(
      "rounded-2xl border bg-card/60 backdrop-blur",
      complete && "border-emerald-500/40 bg-emerald-500/5"
    )}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left">
        <span className={cn(
          "shrink-0 h-9 w-9 rounded-full grid place-items-center",
          complete ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary"
        )}>
          {complete ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={pct} className="h-1 flex-1" />
            <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">{doneCount}/{totalCount}</span>
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
            <div className="px-2 pb-3 pt-1 space-y-2">
              {topics.map((t) => (
                <TopicCard
                  key={t.key}
                  topic={t}
                  checkedSet={checkedSet}
                  onToggle={onToggle}
                  defaultOpen
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
