import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useCenter } from '../centerContext';
import { useCenterAdminData } from './useCenterAdminData';
import { Empty, Loading, PageHeader, Section } from './ui';

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Months shown in the schedule: current month + next 12. */
function useMonths() {
  return useMemo(() => {
    const now = new Date();
    return Array.from({ length: 13 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return { key: ym(d), long: d.toLocaleDateString('en', { month: 'long', year: 'numeric' }), label: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }) };
    });
  }, []);
}

export function SatSchedulePage() {
  const { center } = useCenter();
  const { data, isLoading } = useCenterAdminData();
  const refresh = useRefreshCenter();
  const qc = useQueryClient();
  const months = useMonths();
  const [selected, setSelected] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: simScores = new Map<string, number>() } = useQuery({
    queryKey: ['center-sat-scores', center.id],
    queryFn: async () => {
      const { data: rows, error } = await supabase.from('tenant_sat_attempts')
        .select('student_id, rw_score, math_score, completed_at')
        .eq('institution_id', center.id)
        .eq('status', 'completed')
        .not('rw_score', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      const m = new Map<string, number>();
      (rows ?? []).forEach(r => { if (!m.has(r.student_id)) m.set(r.student_id, (r.rw_score ?? 0) + (r.math_score ?? 0)); });
      return m;
    },
  });

  const students = data?.students ?? [];
  const byMonth = useMemo(() => {
    const m = new Map<string, typeof students>();
    students.forEach(s => { if (s.sat_month) m.set(s.sat_month, [...(m.get(s.sat_month) ?? []), s]); });
    return m;
  }, [students]);

  useEffect(() => {
    if (!selected && !isLoading) setSelected(months.find(m => (byMonth.get(m.key)?.length ?? 0) > 0)?.key ?? months[0].key);
  }, [isLoading, byMonth, months, selected]);

  const chart = months.map(mo => ({ label: mo.label, students: byMonth.get(mo.key)?.length ?? 0 }));
  const list = (byMonth.get(selected) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const unassigned = students.filter(s => s.active && !s.sat_month).length;
  const total = chart.reduce((s, c) => s + c.students, 0);
  const selLabel = months.find(m => m.key === selected)?.long ?? selected;

  const setMonth = async (studentId: string, month: string | null) => {
    setSavingId(studentId);
    const { error } = await supabase.from('tenant_students').update({ sat_month: month }).eq('id', studentId).eq('institution_id', center.id);
    setSavingId(null);
    if (error) return toast.error('Could not save the SAT month.');
    toast.success(month ? `SAT month set to ${months.find(m => m.key === month)?.long ?? month}` : 'SAT month cleared');
    await refresh();
    await qc.invalidateQueries({ queryKey: ['center-data', center.id] });
  };

  if (isLoading || !data) return <Loading />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="SAT Schedule"
        description={`${total} student${total === 1 ? '' : 's'} planned for the next 13 months · ${unassigned} without a month`}
      />

      <Section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Students taking the SAT</p>
            <p className="font-mono text-2xl tabular-nums">{total}</p>
          </div>
        </div>
        <ChartContainer config={{ students: { label: 'Students', color: 'hsl(var(--foreground))' } }} className="h-64 w-full mt-4">
          <AreaChart data={chart} margin={{ left: 0, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="centerSatFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-students)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--color-students)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} width={32} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="students" stroke="var(--color-students)" strokeWidth={2} fill="url(#centerSatFill)" />
          </AreaChart>
        </ChartContainer>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t mt-4 pt-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">SAT month</span>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-48 h-9" aria-label="Pick SAT month"><SelectValue placeholder="Pick a month" /></SelectTrigger>
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
      </Section>

      <Section>
        {list.length === 0 ? (
          <Empty title={`No students planned for ${selLabel}`} description="Open a student's SAT month picker below to assign one." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Simulation score</TableHead>
                <TableHead>SAT month</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{data.classes.find(c => c.id === s.class_id)?.name ?? <span className="text-muted-foreground">No batch</span>}</TableCell>
                  <TableCell><Badge variant={s.active ? 'secondary' : 'outline'}>{s.active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">{simScores.get(s.id) ?? <span className="text-muted-foreground font-sans">No simulation yet</span>}</TableCell>
                  <TableCell>
                    <Select
                      value={months.find(m => m.key === s.sat_month)?.key ?? 'none'}
                      onValueChange={v => setMonth(s.id, v === 'none' ? null : v)}
                      disabled={savingId === s.id}
                    >
                      <SelectTrigger className="w-44 h-8" aria-label={`SAT month for ${s.name}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not set</SelectItem>
                        {months.map(m => <SelectItem key={m.key} value={m.key}>{m.long}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}
