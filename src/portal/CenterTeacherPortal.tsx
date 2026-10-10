import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PortalShell, STATUS_LABEL, STATUS_ORDER, STATUS_STYLE, useCenter } from './centerContext';
import { localDate } from './centerApi';
import { LiquidGlassFX } from '@/components/admin/LiquidGlassFX';
import { liquidTrack, liquidRest } from '@/hooks/useLiquidHighlight';

export default function CenterTeacherPortal() {
  const { center, role, userId } = useCenter();
  const qc = useQueryClient();
  const [classId, setClassId] = useState<string | null>(null);
  const [date, setDate] = useState(localDate());

  const { data } = useQuery({
    queryKey: ['center-teacher', center.id, userId],
    queryFn: async () => {
      const { data: me } = await supabase.from('tenant_members').select('id').eq('institution_id', center.id).eq('user_id', userId!).maybeSingle();
      let q = supabase.from('tenant_classes').select('*').eq('institution_id', center.id).order('created_at');
      if (role !== 'center_admin') q = q.eq('teacher_member_id', me?.id ?? '00000000-0000-0000-0000-000000000000');
      const { data: classes, error } = await q;
      if (error) throw error;
      return classes;
    },
  });
  useEffect(() => { if (!classId && data?.length) setClassId(data[0].id); }, [data, classId]);

  const roster = useQuery({
    enabled: !!classId,
    queryKey: ['center-roster', classId, date],
    queryFn: async () => {
      const [students, att, attempts] = await Promise.all([
        supabase.from('tenant_students').select('id, name, user_id').eq('class_id', classId!).eq('active', true).order('name'),
        supabase.from('tenant_attendance').select('student_id, status').eq('class_id', classId!).eq('session_date', date),
        supabase.from('tenant_attempts').select('student_id, is_correct').eq('institution_id', center.id).limit(20000),
      ]);
      if (students.error) throw students.error;
      return { students: students.data, att: Object.fromEntries((att.data ?? []).map(a => [a.student_id, a.status])), attempts: attempts.data ?? [] };
    },
  });

  const stats = useMemo(() => {
    const m: Record<string, { n: number; c: number }> = {};
    for (const a of roster.data?.attempts ?? []) { (m[a.student_id] ??= { n: 0, c: 0 }).n++; if (a.is_correct) m[a.student_id].c++; }
    return m;
  }, [roster.data]);

  const cycle = async (studentId: string) => {
    const cur = roster.data?.att[studentId];
    const next = STATUS_ORDER[(cur ? STATUS_ORDER.indexOf(cur) + 1 : 0) % STATUS_ORDER.length];
    qc.setQueryData(['center-roster', classId, date], (old: any) => old && { ...old, att: { ...old.att, [studentId]: next } });
    const { error } = await supabase.from('tenant_attendance').upsert(
      { institution_id: center.id, class_id: classId!, student_id: studentId, session_date: date, status: next },
      { onConflict: 'student_id,class_id,session_date' });
    if (error) { toast.error('Could not save attendance'); qc.invalidateQueries({ queryKey: ['center-roster', classId, date] }); }
  };

  return (
    <PortalShell glass title="Teacher" nav={role === 'center_admin' ? <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">Admin view</Link> : null}>
      {!data ? <p className="text-sm text-muted-foreground">Loading…</p> : !data.length ? <p className="text-sm text-muted-foreground">No classes assigned to you yet. Ask your center admin.</p> : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Classes">
            {data.map(c => <button key={c.id} role="tab" aria-selected={c.id === classId} onClick={() => setClassId(c.id)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors active:scale-[0.97] admin-control admin-glass-item admin-section-item ${c.id === classId ? 'admin-section-active font-medium' : 'text-foreground/65 hover:text-foreground'}`}>{c.name}</button>)}
          </div>
          <div className="flex items-end gap-3"><div className="space-y-1"><Label htmlFor="att-date">Session date</Label><Input id="att-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" /></div>
            <p className="text-xs text-foreground/65 pb-2">Tap a status to cycle it.</p></div>
          <div onPointerMove={liquidTrack} onPointerLeave={liquidRest} className="admin-glass-card admin-glass-card-glow admin-glass-liquid rounded-xl border p-4 overflow-x-auto">
            <LiquidGlassFX />
          <table className="w-full text-sm"><thead className="text-xs text-foreground/65 border-b"><tr><th className="text-left py-2">Student</th><th className="text-left">Attendance</th><th className="text-left">Questions</th><th className="text-left">Accuracy</th></tr></thead>
            <tbody className="divide-y">{roster.data?.students.map(s => {
              const st = roster.data.att[s.id]; const p = stats[s.id];
              return <tr key={s.id}><td className="py-3">{s.name}{!s.user_id && <span className="ml-2 text-xs text-foreground/60">not signed up</span>}</td>
                <td><button onClick={() => cycle(s.id)} className={`rounded px-2.5 py-1 text-xs min-w-20 active:scale-[0.97] ${st ? STATUS_STYLE[st] : 'border text-muted-foreground'}`}>{st ? STATUS_LABEL[st] : 'Mark'}</button></td>
                <td className="font-mono">{p?.n ?? 0}</td><td className="font-mono">{p ? `${Math.round(100 * p.c / p.n)}%` : '—'}</td></tr>;
            })}</tbody></table>
          </div>
          {roster.data && !roster.data.students.length && <p className="text-sm text-muted-foreground">No students in this class yet.</p>}
        </div>
      )}
    </PortalShell>
  );
}
