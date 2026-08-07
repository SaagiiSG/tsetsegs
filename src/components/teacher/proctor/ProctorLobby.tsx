import { useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Eye, EyeOff, Loader2, Play, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { makeCode } from "./ProctorStartDialog";

interface Participant {
  id: string;
  display_name: string | null;
  code_verified_at: string | null;
  oath_accepted_at: string | null;
}

interface Session {
  id: string;
  title: string | null;
  join_code: string | null;
  unlock_code: string | null;
  status: string;
}

interface Props {
  sessionId: string;
  onBack: () => void;
  onStarted: () => void;
}

export function ProctorLobby({ sessionId, onBack, onStarted }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [people, setPeople] = useState<Participant[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase
        .from("proctor_sessions")
        .select("id, title, join_code, unlock_code, status")
        .eq("id", sessionId)
        .maybeSingle(),
      supabase
        .from("proctor_participants")
        .select("id, display_name, code_verified_at, oath_accepted_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
    ]);
    if (s) setSession(s as Session);
    setPeople((p ?? []) as Participant[]);
  }, [sessionId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const url = session?.join_code ? `${window.location.origin}/proctor/${session.join_code}` : "";
  const readyCount = people.filter((p) => p.oath_accepted_at).length;

  const rotateUnlock = async () => {
    setWorking(true);
    const code = makeCode(6);
    const { error } = await supabase.from("proctor_sessions").update({ unlock_code: code }).eq("id", sessionId);
    setWorking(false);
    if (error) return toast.error(error.message);
    setSession((s) => (s ? { ...s, unlock_code: code } : s));
    toast.success("New unlock code");
  };

  const start = async () => {
    setWorking(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("proctor_sessions")
      .update({ status: "active", started_at: now, module_started_at: now, current_module: 1 })
      .eq("id", sessionId);
    setWorking(false);
    if (error) return toast.error(error.message);
    onStarted();
  };

  if (!session) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold truncate">{session.title ?? "Proctored test"}</h2>
          <p className="text-xs text-muted-foreground">Lobby — waiting for students</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5 flex flex-col items-center gap-4">
          <div className="bg-white p-5 rounded-xl">
            <QRCode value={url} size={220} level="H" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-4xl font-mono font-bold tracking-[0.3em]">{session.join_code}</p>
            <p className="text-xs text-muted-foreground break-all">{url}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              navigator.clipboard?.writeText(url);
              toast.success("Link copied");
            }}
          >
            <Copy className="h-4 w-4" /> Copy link
          </Button>
        </Card>

        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" /> Unlock code (read out loud)
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-2xl font-mono font-bold tracking-[0.2em]">
                {showCode ? session.unlock_code : "••••••"}
              </p>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowCode((v) => !v)}>
                  {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={rotateUnlock} disabled={working}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Students enter this after joining, then accept the oath. Only proctored students can pass.
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Users className="h-4 w-4 text-primary" /> Joined
              </div>
              <Badge variant="secondary" className="font-mono text-[11px]">
                {readyCount}/{people.length} ready
              </Badge>
            </div>
            <div className="max-h-[280px] overflow-y-auto divide-y">
              {people.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">Nobody has scanned yet.</p>
              ) : (
                people.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 text-xs">
                    <span className="truncate">{p.display_name ?? "Student"}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {p.oath_accepted_at ? "oath ✓" : p.code_verified_at ? "unlocked" : "joined"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Button className="w-full gap-2" onClick={start} disabled={working || people.length === 0}>
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Start test for everyone
          </Button>
        </div>
      </div>
    </div>
  );
}
