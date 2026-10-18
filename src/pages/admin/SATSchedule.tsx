import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineScorePrediction } from "@/components/admin/InlineScorePrediction";
import { useAdminCohort } from "@/contexts/AdminCohortContext";

const LEGACY: Record<string, string> = { march: "03", may: "05", june: "06", august: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export function parseSatMonth(v: string | null): string | null {
  if (!v) return null;
  if (/^\d{4}-\d{2}$/.test(v)) return v;
  const m = LEGACY[v.toLowerCase()];
  return m ? `${new Date().getFullYear()}-${m}` : null;
}
const last8 = (p: string | null) => (p || "").replace(/\D/g, "").slice(-8);
const levelLabel: Record<string, string> = { bad: "Weak", average: "Average", good: "Strong" };

type Student = {
  id: string; first_name: string; last_name: string | null; phone: string; sat_test_month: string | null; grade: string | null;
  math_level: string | null; english_level: string | null; has_taken_sat: boolean | null; previous_sat_score: number | null;
  batch: { batch_name: string | null; course_type: string; is_international: boolean } | null;
};

export default function SATSchedule() {
  const navigate = useNavigate();
  const { cohort } = useAdminCohort();

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 13 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return { key: ym(d), label: d.toLocaleDateString("en", { month: "short", year: "2-digit" }), long: d.toLocaleDateString("en", { month: "long", year: "numeric" }) };
    });
  }, []);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["sat-schedule", cohort],
    queryFn: async () => {
      const out: Student[] = [];
      for (let f = 0; ; f += 1000) {
        const { data, error } = await supabase.from("students")
          .select("id, first_name, last_name, phone, sat_test_month, grade, math_level, english_level, has_taken_sat, previous_sat_score, batch:batches(batch_name, course_type, is_international)")
          .eq("is_ghost", false).not("sat_test_month", "is", null).range(f, f + 999);
        if (error) throw error;
        out.push(...(data as any[]).map(s => ({ ...s, batch: Array.isArray(s.batch) ? s.batch[0] : s.batch })));
        if (data.length < 1000) break;
      }
      return out.filter(s => (cohort === "intl") === !!s.batch?.is_international);
    },
  });

  const byMonth = useMemo(() => {
    const m = new Map<string, Student[]>();
    students.forEach(s => { const k = parseSatMonth(s.sat_test_month); if (k) m.set(k, [...(m.get(k) ?? []), s]); });
    return m;
  }, [students]);

  const chart = months.map(mo => ({ label: mo.label, students: byMonth.get(mo.key)?.length ?? 0 }));
  const [selected, setSelected] = useState<string>("");
  useEffect(() => {
    if (!selected && !isLoading) setSelected(months.find(m => byMonth.get(m.key)?.length)?.key ?? months[0].key);
  }, [isLoading, byMonth, months, selected]);

  const list = (byMonth.get(selected) ?? []).sort((a, b) => a.first_name.localeCompare(b.first_name));
  const total = chart.reduce((s, c) => s + c.students, 0);

  const { data: lastLogin = new Map<string, string | null>() } = useQuery({
    queryKey: ["sat-schedule-logins", selected, list.length],
    enabled: list.length > 0,
    queryFn: async () => {
      const keys = [...new Set(list.map(s => last8(s.phone)).filter(Boolean))];
      const m = new Map<string, string | null>();
      for (let i = 0; i < keys.length; i += 60) {
        const { data } = await supabase.from("student_accounts").select("phone_number, last_login").or(keys.slice(i, i + 60).map(k => `phone_number.ilike.%${k}`).join(","));
        (data ?? []).forEach(a => m.set(last8(a.phone_number), a.last_login));
      }
      return m;
    },
  });

  const selLabel = months.find(m => m.key === selected)?.long ?? selected;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-chillax tracking-normal text-foreground [text-shadow:0_0_24px_hsl(var(--section-glow,32_95%_50%)/0.45)]">SAT Schedule</h1>
        <p className="text-sm text-muted-foreground">When students plan to sit the SAT, this month and the next 12</p>
      </div>

      <section className="admin-glass-card rounded-xl border p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Students taking the SAT</p>
            {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="font-mono text-2xl tabular-nums">{total.toLocaleString()}</p>}
          </div>
        </div>
        <ChartContainer config={{ students: { label: "Students", color: "hsl(var(--foreground))" } }} className="h-64 w-full mt-4">
          <AreaChart data={chart} margin={{ left: 0, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="satFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-students)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--color-students)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} width={32} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="students" stroke="var(--color-students)" strokeWidth={2} fill="url(#satFill)" />
          </AreaChart>
        </ChartContainer>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t mt-4 pt-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">SAT month</span>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Pick a month" /></SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.key} value={m.key}>
                    <span className="flex w-full justify-between gap-6">{m.long}<span className="font-mono text-muted-foreground">{byMonth.get(m.key)?.length ?? 0}</span></span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm font-mono text-muted-foreground">{list.length} students</span>
        </div>
      </section>

      <section className="admin-glass-card rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Math · English</TableHead>
              <TableHead>Previous SAT</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead>SAT prediction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-5" /></TableCell></TableRow>)
              : list.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No students planning the {selLabel} SAT</TableCell></TableRow>
              : list.map(s => {
                const login = lastLogin.get(last8(s.phone));
                return (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => navigate(`/admin/student/${s.id}`)}>
                    <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                    <TableCell className="text-sm max-w-[220px] truncate">{s.batch?.batch_name || <span className="text-muted-foreground">No batch</span>}</TableCell>
                    <TableCell className="text-sm">{s.grade || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{levelLabel[s.math_level ?? ""] ?? "—"} · {levelLabel[s.english_level ?? ""] ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{s.has_taken_sat ? (s.previous_sat_score ?? "Taken") : <span className="text-muted-foreground font-sans">First time</span>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{login ? formatDistanceToNow(new Date(login), { addSuffix: true }) : "Never signed in"}</TableCell>
                    <TableCell><InlineScorePrediction studentId={s.id} courseType={s.batch?.course_type} /></TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
