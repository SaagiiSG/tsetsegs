import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, CalendarDays, Loader2, Plus, QrCode, Trash2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IntensePrepAddStudentDialog } from "./IntensePrepAddStudentDialog";
import { PrepClassQrDialog } from "./PrepClassQrDialog";
import { cn } from "@/lib/utils";

// Official Bluebook practice tests we hand-enter math scores for
const PT_KEYS = ["pt4", "pt5", "pt6", "pt7", "pt8", "pt9", "pt10", "pt11"] as const;
type PtKey = (typeof PT_KEYS)[number];

const NOTE_COUNT = 5;
const MAX_PREP_DAYS = 14;

type AttStatus = "present" | "late" | "absent" | "excused";
const ATT_CYCLE: (AttStatus | null)[] = [null, "present", "late", "absent", "excused"];
const ATT_STYLE: Record<AttStatus, { cls: string; letter: string; label: string }> = {
  present: { cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40", letter: "P", label: "Present" },
  late: { cls: "bg-amber-500/15 text-amber-600 border-amber-500/40", letter: "L", label: "Late" },
  absent: { cls: "bg-destructive/15 text-destructive border-destructive/40", letter: "A", label: "Absent" },
  excused: { cls: "bg-muted text-muted-foreground border-border", letter: "E", label: "Excused" },
};

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDays(start?: string | null, end?: string | null): string[] {
  if (!start) return [];
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${(end || start)}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return [];
  const out: string[] = [];
  const cur = new Date(s);
  while (cur <= e && out.length < MAX_PREP_DAYS) {
    out.push(toISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

function ProgressRing({ pct, solved, total }: { pct: number; solved: number; total: number }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  const stroke = pct >= 70 ? "hsl(var(--primary))" : pct >= 35 ? "#f59e0b" : "hsl(var(--muted-foreground))";
  return (
    <div className="inline-flex flex-col items-center leading-none" title={`${solved} of ${total} solved`}>
      <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90">
        <circle cx="16" cy="16" r={r} fill="none" strokeWidth="3.5" className="stroke-secondary" />
        <circle
          cx="16"
          cy="16"
          r={r}
          fill="none"
          strokeWidth="3.5"
          stroke={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      <span className="text-[9px] font-mono text-muted-foreground mt-0.5">{solved}/{total}</span>
    </div>
  );
}

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
  note_checks: boolean[];
  prep_attendance: Record<string, AttStatus>;
  manual_solved: Partial<Record<SetKey, number>>;
}

interface Props {
  groupId: string;
  onBack: () => void;
}

const emptyTracking = (memberId: string): Tracking => ({
  member_id: memberId,
  bluebook_math_scores: {},
  note_checks: Array(NOTE_COUNT).fill(false),
  prep_attendance: {},
  manual_solved: {},
});

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
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<PtKey, string>>>>({});
  const [manualDrafts, setManualDrafts] = useState<Record<string, Partial<Record<SetKey, string>>>>({});

  const days = useMemo(() => buildDays(group?.start_date, group?.end_date), [group?.start_date, group?.end_date]);

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
        .select("member_id, bluebook_math_scores, prep_session_notes, note_checks, prep_attendance, manual_solved")
        .in("member_id", memberIds);

      const trackMap: Record<string, Tracking> = {};
      const draftMap: Record<string, Partial<Record<PtKey, string>>> = {};
      const manualMap: Record<string, Partial<Record<SetKey, string>>> = {};
      memberRows.forEach((m) => {
        const row = (trackRows ?? []).find((t) => t.member_id === m.id) as
          | {
              bluebook_math_scores?: unknown;
              prep_session_notes?: number | null;
              note_checks?: boolean[] | null;
              prep_attendance?: Record<string, string> | null;
              manual_solved?: Record<string, number> | null;
            }
          | undefined;

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

        const noteChecks = Array(NOTE_COUNT).fill(false) as boolean[];
        if (Array.isArray(row?.note_checks)) {
          row!.note_checks!.slice(0, NOTE_COUNT).forEach((v, i) => (noteChecks[i] = v === true));
        }
        // legacy single "noted" flag
        if (!noteChecks.some(Boolean) && (row?.prep_session_notes ?? 0) === 1) noteChecks[0] = true;

        const att: Record<string, AttStatus> = {};
        Object.entries(row?.prep_attendance ?? {}).forEach(([k, v]) => {
          if (v === "present" || v === "late" || v === "absent" || v === "excused") att[k] = v;
        });

        const manual: Partial<Record<SetKey, number>> = {};
        SETS.forEach((s) => {
          const num = Number((row?.manual_solved ?? {})[s.key]);
          if (Number.isFinite(num) && num > 0) manual[s.key] = Math.round(num);
        });

        trackMap[m.id] = {
          member_id: m.id,
          bluebook_math_scores: scores,
          note_checks: noteChecks,
          prep_attendance: att,
          manual_solved: manual,
        };

        const d: Partial<Record<PtKey, string>> = {};
        PT_KEYS.forEach((key) => {
          d[key] = scores[key] != null ? String(scores[key]) : "";
        });
        draftMap[m.id] = d;

        const md: Partial<Record<SetKey, string>> = {};
        SETS.forEach((s) => {
          md[s.key] = manual[s.key] != null ? String(manual[s.key]) : "";
        });
        manualMap[m.id] = md;
      });
      setTracking(trackMap);
      setDrafts(draftMap);
      setManualDrafts(manualMap);

      /* Question sets -> id maps + usable totals.
         CollegeBoard mirrors the student practice definition: every original math
         question outside the 68 / Hard 150 / ANP sets (~1.4k questions), not just
         the questions literally tagged question_set = 'CollegeBoard'. */
      const idToSet = new Map<string, SetKey>();
      const computedTotals: Record<SetKey, number> = { "68": 0, "150": 0, cb: 0 };

      const collectSet = async (key: SetKey) => {
        const PAGE = 1000;
        for (let from = 0; ; from += PAGE) {
          let q = supabase
            .from("questions")
            .select("id")
            .eq("is_active", true)
            .eq("hide_from_practice", false);

          if (key === "cb") {
            q = q
              .eq("subject", "math")
              .eq("is_original", true)
              .neq("question_set", "68")
              .neq("question_set", "SATMathTraining800")
              .neq("question_set", "ANP120Aug3");
          } else {
            q = q.eq("question_set", SETS.find((s) => s.key === key)!.questionSet);
          }

          const { data, error } = await q.order("id", { ascending: true }).range(from, from + PAGE - 1);
          if (error) throw error;
          const rows = data ?? [];
          rows.forEach((r) => {
            idToSet.set(r.id, key);
            computedTotals[key] += 1;
          });
          if (rows.length < PAGE) break;
        }
      };

      await Promise.all(SETS.map((s) => collectSet(s.key)));
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

  /** Optimistic write: patch local state first, then persist. */
  const saveTracking = async (memberId: string, patch: Partial<Omit<Tracking, "member_id">>) => {
    const prevRow = tracking[memberId] ?? emptyTracking(memberId);
    const nextRow: Tracking = { ...prevRow, ...patch, member_id: memberId };
    setTracking((prev) => ({ ...prev, [memberId]: nextRow }));

    const payload: Record<string, unknown> = { member_id: memberId, updated_at: new Date().toISOString() };
    if (patch.bluebook_math_scores) payload.bluebook_math_scores = patch.bluebook_math_scores;
    if (patch.note_checks) {
      payload.note_checks = patch.note_checks;
      payload.prep_session_notes = patch.note_checks[0] ? 1 : 0; // keep legacy column consistent
    }
    if (patch.prep_attendance) payload.prep_attendance = patch.prep_attendance;
    if (patch.manual_solved) payload.manual_solved = patch.manual_solved;

    const { error } = await supabase
      .from("intense_prep_tracking")
      .upsert(payload as never, { onConflict: "member_id" });

    if (error) {
      setTracking((prev) => ({ ...prev, [memberId]: prevRow })); // roll back
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    }
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

  const commitManual = (memberId: string, key: SetKey) => {
    const raw = (manualDrafts[memberId]?.[key] ?? "").trim();
    const parsed = parseInt(raw, 10);
    const cap = totals[key] || 9999;
    const valid = Number.isFinite(parsed) && parsed > 0;
    const clamped = valid ? Math.min(parsed, cap) : 0;
    const next = { ...(tracking[memberId]?.manual_solved ?? {}) };
    if (valid) next[key] = clamped;
    else delete next[key];
    setManualDrafts((prev) => ({
      ...prev,
      [memberId]: { ...prev[memberId], [key]: valid ? String(clamped) : "" },
    }));
    saveTracking(memberId, { manual_solved: next });
  };

  const toggleNote = (memberId: string, index: number, value: boolean) => {
    const current = tracking[memberId]?.note_checks ?? Array(NOTE_COUNT).fill(false);
    const next = [...current];
    next[index] = value;
    saveTracking(memberId, { note_checks: next });
  };

  const cycleAttendance = (memberId: string, day: string) => {
    const current = tracking[memberId]?.prep_attendance ?? {};
    const idx = ATT_CYCLE.indexOf(current[day] ?? null);
    const nextStatus = ATT_CYCLE[(idx + 1) % ATT_CYCLE.length];
    const next = { ...current };
    if (nextStatus) next[day] = nextStatus;
    else delete next[day];
    saveTracking(memberId, { prep_attendance: next });
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
    const all = Object.values(tracking).flatMap((t) => Object.values(t.bluebook_math_scores ?? {}));
    if (all.length === 0) return null;
    return Math.round(all.reduce((a, b) => a + b, 0) / all.length);
  }, [tracking]);

  const dayPresentCounts = useMemo(() => {
    const map: Record<string, number> = {};
    days.forEach((d) => {
      map[d] = members.filter((m) => {
        const st = tracking[m.id]?.prep_attendance?.[d];
        return st === "present" || st === "late";
      }).length;
    });
    return map;
  }, [days, members, tracking]);

  const attendedCount = (memberId: string) =>
    Object.values(tracking[memberId]?.prep_attendance ?? {}).filter((s) => s === "present" || s === "late").length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const minWidth = 1180 + days.length * 44;

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
              {days.length > 0 ? ` · ${days.length} prep days` : ""}
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

      {members.length > 0 && days.length === 0 && (
        <Card className="p-3 flex flex-wrap items-center gap-2 text-xs">
          <CalendarDays className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-muted-foreground">
            This prep class has no start/end date yet, so there are no attendance days to track.
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onBack}>
            Set prep dates
          </Button>
        </Card>
      )}

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
            <Table style={{ minWidth }}>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="h-9 w-[36px] text-center text-xs">#</TableHead>
                  <TableHead className="h-9 w-[190px] text-xs sticky left-0 z-20 bg-muted">Student</TableHead>
                  {SETS.map((s, i) => (
                    <TableHead
                      key={s.key}
                      className={cn("h-9 w-[112px] text-center text-xs", i === 0 && "border-l")}
                    >
                      {s.label}
                      <span className="block text-[9px] font-normal text-amber-600 leading-none">manual</span>
                    </TableHead>
                  ))}
                  {days.map((d, i) => {
                    const dt = new Date(`${d}T00:00:00`);
                    return (
                      <TableHead
                        key={d}
                        className={cn("h-9 w-[44px] text-center text-xs px-0", i === 0 && "border-l")}
                        title={d}
                      >
                        <span className="block text-[9px] text-muted-foreground leading-none">
                          {WEEKDAY[dt.getDay()]}
                        </span>
                        <span className="block leading-tight">{dt.getDate()}</span>
                        <span className="block text-[9px] font-mono font-normal text-muted-foreground leading-none">
                          {dayPresentCounts[d] ?? 0}/{members.length}
                        </span>
                      </TableHead>
                    );
                  })}
                  <TableHead className="h-9 w-[440px] text-xs border-l">Bluebook math (PT4–PT11)</TableHead>
                  <TableHead className="h-9 w-[132px] text-center text-xs leading-tight border-l">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted">Notes 1–5</span>
                      </TooltipTrigger>
                      <TooltipContent>Five independent note / review tasks</TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="h-9 w-[44px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m, i) => {
                  const t = tracking[m.id];
                  const notes = t?.note_checks ?? Array(NOTE_COUNT).fill(false);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="py-1.5 text-center text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="py-1.5 sticky left-0 z-10 bg-background">
                        <div className="font-medium text-xs flex items-center gap-1.5 leading-tight">
                          <span className="truncate max-w-[110px]">{displayName(m)}</span>
                          {m.joined_via_qr && <Sparkles className="h-3 w-3 text-primary shrink-0" />}
                          {!m.student_account_id && (
                            <span className="text-[10px] text-muted-foreground shrink-0">(no acct)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono leading-tight flex items-center gap-1.5">
                          <span>{m.manual_phone ?? "—"}</span>
                          {days.length > 0 && (
                            <span className="text-emerald-600">
                              {attendedCount(m.id)}/{days.length}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Platform ring + manual notebook count */}
                      {SETS.map((s, si) => {
                        const solved = progress[m.id]?.[s.key] ?? 0;
                        const total = totals[s.key] || 0;
                        const pct = total > 0 ? Math.min(100, Math.round((solved / total) * 100)) : 0;
                        return (
                          <TableCell key={s.key} className={cn("py-1.5", si === 0 && "border-l")}>
                            <div className="flex items-center justify-center gap-1">
                              <ProgressRing pct={pct} solved={solved} total={total} />
                              <Input
                                inputMode="numeric"
                                className="h-7 w-[46px] text-[11px] font-mono text-center px-0.5 text-amber-600 placeholder:text-muted-foreground"
                                placeholder="—"
                                title={`Hand-entered notebook count for ${s.label}`}
                                value={manualDrafts[m.id]?.[s.key] ?? ""}
                                onChange={(e) =>
                                  setManualDrafts((p) => ({
                                    ...p,
                                    [m.id]: { ...p[m.id], [s.key]: e.target.value },
                                  }))
                                }
                                onBlur={() => commitManual(m.id, s.key)}
                              />
                            </div>
                          </TableCell>
                        );
                      })}

                      {/* Attendance per prep day */}
                      {days.map((d, di) => {
                        const st = t?.prep_attendance?.[d];
                        const style = st ? ATT_STYLE[st] : null;
                        return (
                          <TableCell key={d} className={cn("py-1.5 px-0 text-center", di === 0 && "border-l")}>
                            <button
                              type="button"
                              onClick={() => cycleAttendance(m.id, d)}
                              aria-label={`${displayName(m)} ${d}: ${style?.label ?? "not marked"}`}
                              className={cn(
                                "h-7 w-7 rounded-md border text-[11px] font-semibold transition-colors mx-auto flex items-center justify-center",
                                style ? style.cls : "border-dashed border-border text-muted-foreground hover:bg-muted",
                              )}
                            >
                              {style?.letter ?? "·"}
                            </button>
                          </TableCell>
                        );
                      })}

                      <TableCell className="py-1.5 border-l">
                        <div className="flex items-center gap-1">
                          {PT_KEYS.map((key) => (
                            <div key={key} className="flex items-center gap-0.5">
                              <span className="text-[9px] text-muted-foreground uppercase w-[22px] text-right">
                                {key.replace("pt", "")}
                              </span>
                              <Input
                                inputMode="numeric"
                                className="h-7 w-[42px] text-[11px] font-mono text-center px-0.5"
                                placeholder="—"
                                value={drafts[m.id]?.[key] ?? ""}
                                onChange={(e) => setDrafts((p) => ({ ...p, [m.id]: { ...p[m.id], [key]: e.target.value } }))}
                                onBlur={() => commitScore(m.id, key)}
                              />
                            </div>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell className="py-1.5 border-l">
                        <div className="flex items-center justify-center gap-1.5">
                          {Array.from({ length: NOTE_COUNT }).map((_, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-0.5">
                              <Checkbox
                                checked={notes[idx] === true}
                                onCheckedChange={(v) => toggleNote(m.id, idx, v === true)}
                                aria-label={`Note ${idx + 1}`}
                              />
                              <span className="text-[8px] text-muted-foreground leading-none">{idx + 1}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-[9px] font-mono text-muted-foreground text-center mt-0.5">
                          {notes.filter(Boolean).length}/{NOTE_COUNT}
                        </div>
                      </TableCell>

                      <TableCell className="py-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeMember(m.id)}
                          aria-label="Remove student"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
