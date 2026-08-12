import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Square, Users } from "lucide-react";
import { toast } from "sonner";
import { ReviewModeControl } from "./ReviewModeControl";


interface ModuleResult {
  module: number;
  section: string;
  correct: number;
  total: number;
}

interface Participant {
  id: string;
  display_name: string | null;
  oath_accepted_at: string | null;
  started_at: string | null;
  submitted_at: string | null;
  current_module: number | null;
  focus_violations: number | null;
  rw_correct: number | null;
  math_correct: number | null;
  rw_total: number | null;
  math_total: number | null;
  module_results: ModuleResult[] | null;
  created_at: string | null;
}

interface Props {
  sessionId: string;
  onBack: () => void;
}

export function ProctorMonitor({ sessionId, onBack }: Props) {
  const [status, setStatus] = useState<string>("active");
  const [title, setTitle] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [people, setPeople] = useState<Participant[]>([]);
  const [ending, setEnding] = useState(false);

  const load = useCallback(async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from("proctor_sessions").select("status, title, started_at").eq("id", sessionId).maybeSingle(),
      supabase
        .from("proctor_participants")
        .select(
          "id, display_name, oath_accepted_at, started_at, submitted_at, current_module, focus_violations, rw_correct, math_correct, rw_total, math_total, module_results, created_at",
        )
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
    ]);
    if (s) {
      setStatus(s.status);
      setTitle(s.title);
      setStartedAt((s as { started_at?: string | null }).started_at ?? null);
    }
    setPeople((p ?? []) as unknown as Participant[]);
  }, [sessionId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  const endSession = async () => {
    setEnding(true);
    // Grades everyone who hasn't submitted from their last saved answers, then marks it finished.
    const { error } = await supabase.rpc("proctor_finalize_session", { p_session_id: sessionId });
    setEnding(false);
    if (error) return toast.error(error.message);
    toast.success("Session ended — results are in");
    load();
  };

  // A session can be finished while stragglers are still ungraded (closed tab, crash).
  const finalizedRef = useRef(false);
  useEffect(() => {
    if (status !== "finished" || finalizedRef.current) return;
    if (!people.some((p) => !p.submitted_at && p.oath_accepted_at)) return;
    finalizedRef.current = true;
    (async () => {
      await supabase.rpc("proctor_finalize_session", { p_session_id: sessionId });
      load();
    })();
  }, [status, people, sessionId, load]);


  const submitted = people.filter((p) => p.submitted_at).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold truncate">{title ?? "Proctored test"}</h2>
          <p className="text-xs text-muted-foreground">
            {status === "finished" ? "Finished" : "In progress"} · {submitted}/{people.length} submitted
          </p>
        </div>
        {status !== "finished" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2" disabled={ending}>
                {ending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                Force end
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End this test for everyone?</AlertDialogTitle>
                <AlertDialogDescription>
                  Students still working will be stopped. Anything they already answered stays saved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep going</AlertDialogCancel>
                <AlertDialogAction onClick={endSession}>End test</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <ReviewModeControl sessionId={sessionId} />

      <Card className="divide-y">

        <div className="flex items-center gap-2 p-3 text-xs font-semibold text-muted-foreground">
          <Users className="h-4 w-4" /> Roster
        </div>
        {people.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No students in this session.</p>
        ) : (
          people.map((p) => {
            const score =
              p.submitted_at && p.rw_total !== null
                ? `${(p.rw_correct ?? 0) + (p.math_correct ?? 0)}/${(p.rw_total ?? 0) + (p.math_total ?? 0)}`
                : null;
            // Joined more than 2 minutes after the room started — proctor should know.
            const late =
              !!startedAt && !!p.created_at && Date.parse(p.created_at) - Date.parse(startedAt) > 120_000;
            const mods = [...((p.module_results ?? []) as ModuleResult[])].sort((a, b) => a.module - b.module);
            return (
              <div key={p.id} className="p-3 space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm truncate flex-1">{p.display_name ?? "Student"}</span>
                  {late && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      late join
                    </Badge>
                  )}
                  {(p.focus_violations ?? 0) > 0 && (
                    <Badge variant="destructive" className="text-[10px] font-mono">
                      {p.focus_violations} focus
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {p.submitted_at ? (score ?? "submitted") : p.started_at ? `module ${p.current_module ?? 1}` : p.oath_accepted_at ? "ready" : "waiting"}
                  </Badge>
                </div>
                {p.submitted_at && mods.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-0.5">
                    {mods.map((m) => (
                      <span
                        key={`${m.section}-${m.module}`}
                        className="text-[10px] font-mono rounded bg-muted px-1.5 py-0.5 text-muted-foreground"
                      >
                        M{m.module} {m.correct}/{m.total}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
