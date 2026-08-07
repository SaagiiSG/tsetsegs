import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2, Plus, QrCode, Trash2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IntensePrepAddStudentDialog } from "./IntensePrepAddStudentDialog";
import { PrepClassQrDialog } from "./PrepClassQrDialog";
import { cn } from "@/lib/utils";

// Official Bluebook practice tests we hand-enter math scores for
const PT_KEYS = ["pt4", "pt5", "pt6", "pt7", "pt8", "pt9", "pt10", "pt11"] as const;
type PtKey = (typeof PT_KEYS)[number];

const SETS = [
  { key: "68", label: "68", questionSet: "68" },
  { key: "150", label: "Hard 150", questionSet: "SATMathTraining800" },
  { key: "cb", label: "CollegeBoard", questionSet: "CollegeBoard" },
] as const;

type SetKey = (typeof SETS)[number]["key"];

interface Member {
  id: string;
  student_id: string | null;
  student_account_id: string | null;
  manual_name: string | null;
  manual_phone: string | null;
  joined_via_qr: boolean;
  created_at: string;
}

interface Tracking {
  member_id: string;
  // per-test math scores keyed by pt4…pt11
  bluebook_math_scores: Partial<Record<PtKey, number>>;
  noted_lesson: boolean;
}

interface Props {
  groupId: string;
  onBack: () => void;
}

export function PrepClassRoster({ groupId, onBack }: Props) {
  const { toast } = useToast();
  const [group, setGroup] = useState<{ id: string; name: string; join_code: string | null; start_date: string | null; end_date: string | null } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tracking, setTracking] = useState<Record<string, Tracking>>({});
  const [progress, setProgress] = useState<Record<string, Record<SetKey, number>>>({});
  const [totals, setTotals] = useState<Record<SetKey, number>>({ "68": 0, "150": 0, cb: 0 });
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { scores: string; notes: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: g }, { data: mem }] = await Promise.all([
        supabase
          .from("intense_prep_groups")
          .select("id, name, join_code, start_date, end_date")
          .eq("id", groupId)
          .maybeSingle(),
        supabase
          .from("intense_prep_members")
          .select("id, student_id, student_account_id, manual_name, manual_phone, joined_via_qr, created_at")
          .eq("group_id", groupId)
          .order("created_at", { ascending: true }),
      ]);

      setGroup(g ?? null);
      const memberRows = (mem ?? []) as Member[];
      setMembers(memberRows);

      if (memberRows.length === 0) {
        setTracking({});
        setProgress({});
        return;
      }

      const memberIds = memberRows.map((m) => m.id);
      const { data: trackRows } = await supabase
        .from("intense_prep_tracking")
        .select("member_id, bluebook_math_scores, prep_session_notes")
        .in("member_id", memberIds);

      const trackMap: Record<string, Tracking> = {};
      const draftMap: Record<string, Partial<Record<PtKey, string>>> = {};
      memberRows.forEach((m) => {
        const row = (trackRows ?? []).find((t) => t.member_id === m.id);
        const raw = row?.bluebook_math_scores;
        const scores: Partial<Record<PtKey, number>> = {};
        if (Array.isArray(raw)) {
          // legacy flat list -> map onto pt4, pt5, …
          (raw as unknown[]).forEach((v, i) => {
            const key = PT_KEYS[i];
            const num = Number(v);
            if (key && Number.isFinite(num)) scores[key] = num;
          });
        } else if (raw && typeof raw === "object") {
          PT_KEYS.forEach((key) => {
            const num = Number((raw as Record<string, unknown>)[key]);
            if (Number.isFinite(num) && num > 0) scores[key] = num;
          });
        }
        trackMap[m.id] = { member_id: m.id, bluebook_math_scores: scores, noted_lesson: (row?.prep_session_notes ?? 0) === 1 };
        const d: Partial<Record<PtKey, string>> = {};
        PT_KEYS.forEach((key) => {
          d[key] = scores[key] != null ? String(scores[key]) : "";
        });
        draftMap[m.id] = d;
      });
      setTracking(trackMap);
      setDrafts(draftMap);


      // Question sets -> id maps + usable totals
      const setNames = SETS.map((s) => s.questionSet);
      const { data: qs } = await supabase
        .from("questions")
        .select("id, question_set")
        .in("question_set", setNames)
        .eq("is_active", true)
        .eq("hide_from_practice", false);

      const idToSet = new Map<string, SetKey>();
      const computedTotals: Record<SetKey, number> = { "68": 0, "150": 0, cb: 0 };
      (qs ?? []).forEach((q) => {
        const meta = SETS.find((s) => s.questionSet === q.question_set);
        if (!meta) return;
        idToSet.set(q.id, meta.key);
        computedTotals[meta.key] += 1;
      });
      setTotals(computedTotals);

      const accountIds = memberRows.map((m) => m.student_account_id).filter(Boolean) as string[];
      const perMember: Record<string, Record<SetKey, number>> = {};
      memberRows.forEach((m) => {
        perMember[m.id] = { "68": 0, "150": 0, cb: 0 };
      });

      if (accountIds.length > 0) {
        const { data: attempts } = await supabase
          .from("student_attempts")
          .select("student_account_id, question_id")
          .in("student_account_id", accountIds)
          .eq("is_correct", true);

        const seen = new Map<string, Set<string>>();
        (attempts ?? []).forEach((a) => {
          const setKey = idToSet.get(a.question_id);
          if (!setKey) return;
          const dedupeKey = `${a.student_account_id}:${setKey}`;
          if (!seen.has(dedupeKey)) seen.set(dedupeKey, new Set());
          seen.get(dedupeKey)!.add(a.question_id);
        });

        memberRows.forEach((m) => {
          if (!m.student_account_id) return;
          SETS.forEach((s) => {
            perMember[m.id][s.key] = seen.get(`${m.student_account_id}:${s.key}`)?.size ?? 0;
          });
        });
      }
      setProgress(perMember);
    } catch (error: unknown) {
      toast({
        title: "Could not load roster",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const saveTracking = async (
    memberId: string,
    patch: { bluebook_math_scores?: Partial<Record<PtKey, number>>; noted_lesson?: boolean },
  ) => {
    const payload: Record<string, unknown> = { member_id: memberId, updated_at: new Date().toISOString() };
    if (patch.bluebook_math_scores) payload.bluebook_math_scores = patch.bluebook_math_scores;
    if (patch.noted_lesson !== undefined) payload.prep_session_notes = patch.noted_lesson ? 1 : 0;

    const { error } = await supabase
      .from("intense_prep_tracking")
      .upsert(payload as never, { onConflict: "member_id" });
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setTracking((prev) => ({
      ...prev,
      [memberId]: {
        member_id: memberId,
        bluebook_math_scores: patch.bluebook_math_scores ?? prev[memberId]?.bluebook_math_scores ?? {},
        noted_lesson: patch.noted_lesson ?? prev[memberId]?.noted_lesson ?? false,
      },
    }));
  };

  const commitScore = (memberId: string, key: PtKey) => {
    const raw = (drafts[memberId]?.[key] ?? "").trim();
    const parsed = parseInt(raw, 10);
    const valid = Number.isFinite(parsed) && parsed >= 200 && parsed <= 800;
    const next = { ...(tracking[memberId]?.bluebook_math_scores ?? {}) };
    if (valid) next[key] = parsed;
    else delete next[key];
    setDrafts((prev) => ({ ...prev, [memberId]: { ...prev[memberId], [key]: valid ? String(parsed) : "" } }));
    saveTracking(memberId, { bluebook_math_scores: next });
  };

  const toggleNoted = (memberId: string, value: boolean) => {
    saveTracking(memberId, { noted_lesson: value });
  };


  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from("intense_prep_members").delete().eq("id", memberId);
    if (error) {
      toast({ title: "Could not remove", description: error.message, variant: "destructive" });
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const addMember = async (studentId: string | null, manualName?: string, manualPhone?: string) => {
    const { error } = await supabase.from("intense_prep_members").insert({
      group_id: groupId,
      student_id: studentId,
      manual_name: manualName || null,
      manual_phone: manualPhone ? manualPhone.replace(/\D/g, "").slice(-8) : null,
    });
    if (error) {
      toast({ title: "Could not add student", description: error.message, variant: "destructive" });
      return;
    }
    setAddOpen(false);
    load();
  };

  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const ids = members.map((m) => m.student_id).filter(Boolean) as string[];
    if (ids.length === 0) return;
    supabase
      .from("students")
      .select("id, first_name, last_name, name")
      .in("id", ids)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((s) => {
          map[s.id] = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.name || "Student";
        });
        setNames(map);
      });
  }, [members]);

  const displayName = (m: Member) => (m.student_id ? names[m.student_id] : undefined) || m.manual_name || m.manual_phone || "Unknown";

  const bbAverage = useMemo(() => {
    const all = Object.values(tracking).flatMap((t) => t.bluebook_math_scores ?? []);
    if (all.length === 0) return null;
    return Math.round(all.reduce((a, b) => a + b, 0) / all.length);
  }, [tracking]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{group?.name}</h2>
            <p className="text-xs text-muted-foreground">
              {members.length} students
              {group?.start_date ? ` · ${group.start_date}${group.end_date ? ` → ${group.end_date}` : ""}` : ""}
              {bbAverage !== null ? ` · Bluebook math avg ${bbAverage}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setQrOpen(true)}>
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">Registration QR</span>
          </Button>
          <Button size="sm" className="h-9 gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>

      {members.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <QrCode className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No students yet. Show the registration QR in class, or add someone manually.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>Show QR</Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>Add student</Button>
          </div>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <ScrollArea className="w-full">
            <Table className="min-w-[1080px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[40px] text-center">#</TableHead>
                  <TableHead className="w-[200px]">Student</TableHead>
                  {SETS.map((s) => (
                    <TableHead key={s.key} className="w-[130px] text-center">{s.label}</TableHead>
                  ))}
                  <TableHead className="w-[190px]">Bluebook math scores</TableHead>
                  <TableHead className="min-w-[240px]">Review session notes</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m, i) => (
                  <TableRow key={m.id} className="align-top">
                    <TableCell className="text-center text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        <span className="truncate">{displayName(m)}</span>
                        {m.joined_via_qr && <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">{m.manual_phone ?? "—"}</div>
                      {!m.student_account_id && (
                        <Badge variant="outline" className="mt-1 text-[10px]">no platform account</Badge>
                      )}
                    </TableCell>
                    {SETS.map((s) => {
                      const solved = progress[m.id]?.[s.key] ?? 0;
                      const total = totals[s.key] || 0;
                      const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
                      return (
                        <TableCell key={s.key} className="text-center">
                          <div className="text-xs font-mono">{solved}/{total}</div>
                          <div className="h-1.5 mt-1 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", pct >= 70 ? "bg-emerald-500" : pct >= 35 ? "bg-amber-500" : "bg-primary")}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell>
                      <Input
                        className="h-8 text-xs font-mono"
                        placeholder="e.g. 620, 680, 710"
                        value={drafts[m.id]?.scores ?? ""}
                        onChange={(e) => setDrafts((p) => ({ ...p, [m.id]: { ...p[m.id], scores: e.target.value } }))}
                        onBlur={() => commitScores(m.id)}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Official Bluebook math (200–800)</p>
                    </TableCell>
                    <TableCell>
                      <Textarea
                        className="min-h-[56px] text-xs"
                        placeholder="What to fix before the test…"
                        value={drafts[m.id]?.notes ?? ""}
                        onChange={(e) => setDrafts((p) => ({ ...p, [m.id]: { ...p[m.id], notes: e.target.value } }))}
                        onBlur={() => commitNotes(m.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeMember(m.id)}
                        aria-label="Remove student"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      <IntensePrepAddStudentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={addMember}
        existingMemberStudentIds={members.map((m) => m.student_id).filter(Boolean) as string[]}
      />

      {group && (
        <PrepClassQrDialog
          open={qrOpen}
          onOpenChange={setQrOpen}
          groupId={group.id}
          groupName={group.name}
          joinCode={group.join_code}
          onCodeCreated={(code) => setGroup((g) => (g ? { ...g, join_code: code } : g))}
        />
      )}
    </div>
  );
}
