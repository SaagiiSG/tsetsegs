import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle2, ChevronDown } from "lucide-react";
import { SESSIONS, TEACHING_TOPICS, type ChecklistTopic } from "@/data/teachingChecklist";
import { useTeachingChecklist } from "@/hooks/useTeachingChecklist";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { useHaptics } from "@/hooks/useHaptics";
import { cn } from "@/lib/utils";

export default function TeacherSessionRun() {
  const { batchId, sessionNumber: sessionParam } = useParams<{ batchId: string; sessionNumber: string }>();
  const sessionNumber = Number(sessionParam);
  const navigate = useNavigate();
  const { user } = useTeacherAuth();
  const teacherId = user?.id ?? "anon";
  const haptic = useHaptics();

  const session = useMemo(
    () => SESSIONS.find((s) => s.number === sessionNumber),
    [sessionNumber]
  );

  const topics = useMemo<ChecklistTopic[]>(() => {
    if (!session) return [];
    return session.topicNumbers
      .map((n) => TEACHING_TOPICS.find((t) => t.number === n))
      .filter(Boolean) as ChecklistTopic[];
  }, [session]);

  const { data: batch } = useQuery({
    queryKey: ["session-run-batch", batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data } = await supabase
        .from("batches")
        .select("id, batch_name, nickname")
        .eq("id", batchId as string)
        .maybeSingle();
      return data as { id: string; batch_name: string; nickname: string | null } | null;
    },
  });

  const { checkedSet, toggle } = useTeachingChecklist(batchId ?? null);
  const items = useMemo(() => topics.flatMap((t) => t.items), [topics]);
  const done = items.filter((i) => checkedSet.has(i.key)).length;
  const overallPct = items.length === 0 ? 0 : Math.round((done / items.length) * 100);

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-6 text-center">
        <div>
          <h1 className="text-lg font-semibold mb-2">Session not found</h1>
          <Button onClick={() => navigate(-1)} variant="outline" size="sm">
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const title = batch?.nickname || batch?.batch_name || "Class";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
              {title} · Live
            </div>
            <div className="text-sm font-semibold truncate">{session.title}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={overallPct} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground tabular-nums">
            {done}/{items.length} · {overallPct}%
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-24 space-y-2.5">
        {topics.map((topic) => (
          <TopicRunCard
            key={topic.key}
            topic={topic}
            teacherId={teacherId}
            checkedSet={checkedSet}
            onToggle={(k, v) => {
              haptic(v ? "medium" : "light");
              toggle(k, v);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function TopicRunCard({
  topic,
  checkedSet,
  onToggle,
}: {
  topic: ChecklistTopic;
  teacherId: string;
  checkedSet: Set<string>;
  onToggle: (key: string, v: boolean) => void;
}) {
  const [open, setOpen] = useState(true);

  const done = topic.items.filter((i) => checkedSet.has(i.key)).length;
  const total = topic.items.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const allDone = done === total && total > 0;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card/60 backdrop-blur transition-colors",
        allDone && "border-emerald-500/40 bg-emerald-500/5"
      )}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 h-9 w-9 rounded-full grid place-items-center text-xs font-semibold tabular-nums"
          aria-label="Toggle topic"
        >
          <span
            className={cn(
              "h-9 w-9 rounded-full grid place-items-center",
              allDone ? "bg-emerald-500 text-white" : "bg-muted text-foreground"
            )}
          >
            {allDone ? <CheckCircle2 className="h-4 w-4" /> : topic.number}
          </span>
        </button>
        <button onClick={() => setOpen((v) => !v)} className="flex-1 min-w-0 text-left">
          <h3 className="text-sm font-medium truncate">{topic.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={pct} className="h-1 flex-1" />
            <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">
              {done}/{total}
            </span>
          </div>
        </button>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-muted-foreground">
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </div>

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
