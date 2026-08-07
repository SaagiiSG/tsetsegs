import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Play } from "lucide-react";
import { format } from "date-fns";
import { ProctorStartDialog } from "./ProctorStartDialog";
import { ProctorLobby } from "./ProctorLobby";
import { ProctorMonitor } from "./ProctorMonitor";

interface SessionRow {
  id: string;
  title: string | null;
  join_code: string | null;
  status: string;
  created_at: string;
}

export function ProctorContent() {
  const { teacherName } = useTeacherAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [monitorId, setMonitorId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    if (lobbyId || monitorId) return;
    (async () => {
      let q = supabase
        .from("proctor_sessions")
        .select("id, title, join_code, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (teacherName) q = q.eq("teacher_username", teacherName);
      const { data } = await q;
      setSessions((data ?? []) as SessionRow[]);
    })();
  }, [teacherName, lobbyId, monitorId, dialogOpen]);

  if (lobbyId) {
    return (
      <ProctorLobby
        sessionId={lobbyId}
        onBack={() => setLobbyId(null)}
        onStarted={() => {
          setMonitorId(lobbyId);
          setLobbyId(null);
        }}
      />
    );
  }
  if (monitorId) return <ProctorMonitor sessionId={monitorId} onBack={() => setMonitorId(null)} />;

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Proctored Bluebook test</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pick a finished practice test, show the QR, read out the 6-character unlock code, run the oath, then start
            everyone at once.
          </p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => setDialogOpen(true)}>
          <Play className="h-4 w-4" /> New session
        </Button>
      </Card>

      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2">Recent sessions</div>
        <Card className="divide-y">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No proctored sessions yet.</div>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => (s.status === "lobby" ? setLobbyId(s.id) : setMonitorId(s.id))}
                className="w-full text-left p-3 flex items-center gap-3 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{s.title ?? "Proctored test"}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {s.join_code} · {format(new Date(s.created_at), "MMM d, HH:mm")}
                  </div>
                </div>
                <Badge variant={s.status === "finished" ? "secondary" : "default"} className="text-[10px] uppercase">
                  {s.status}
                </Badge>
              </button>
            ))
          )}
        </Card>
      </div>

      <ProctorStartDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={(id) => setLobbyId(id)} />
    </div>
  );
}
