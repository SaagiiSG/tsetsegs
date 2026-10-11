import { useEffect, useMemo, useState } from 'react';
import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, LogOut, QrCode, Users, TrendingUp, Radio, LayoutDashboard,
  Search, Pencil, BookOpen, Flame, ChevronRight, ArrowLeft,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { CenterLogo, STATUS_LABEL, STATUS_ORDER, STATUS_STYLE, centerDisplayName, hexToHslToken, useCenter } from './centerContext';
import { localDate } from './centerApi';
import { LiquidGlassFX } from '@/components/admin/LiquidGlassFX';
import { liquidTrack, liquidRest } from '@/hooks/useLiquidHighlight';
import { AdminBackgroundPaths } from '@/components/ui/background-paths';
import { MathText } from '@/components/MathText';
import { domainStats, loadQuestionMeta, pct, type DomainStat } from './questionMeta';
import { TeacherLive } from './LiveSession';

type Mode = 'dashboard' | 'analytics' | 'practice' | 'live';
const MODE_ORDER: Mode[] = ['dashboard', 'analytics', 'practice', 'live'];
const MODE_GLOW: Record<Mode, string> = {
  dashboard: '217 91% 60%',
  analytics: '262 83% 62%',
  practice: '152 60% 42%',
  live: '345 75% 55%',
};

type CenterClass = {
  id: string; name: string; join_code: string; schedule: string | null;
  starts_on: string | null; created_at: string; studentCount: number;
};
type CenterStudent = { id: string; class_id: string | null; name: string; phone: string; user_id: string | null };
type Attempt = { student_id: string; question_id: string; is_correct: boolean; created_at: string };
type AttRow = { student_id: string; class_id: string; status: string; session_date: string };

type StudentStats = { n: number; c: number; present: number; sessions: number; last?: string };

const COMPLETED_AFTER_DAYS = 120;
const isCompleted = (c: CenterClass) =>
  !!c.starts_on && Date.now() - new Date(c.starts_on).getTime() > COMPLETED_AFTER_DAYS * 864e5;

function riskOf(s: StudentStats | undefined) {
  if (!s) return null;
  const attRate = s.sessions ? s.present / s.sessions : 1;
  const stale = !s.last || Date.now() - new Date(s.last).getTime() > 7 * 864e5;
  return attRate < 0.7 || (s.n >= 10 && s.c / s.n < 0.5) || stale ? 'Needs attention' : null;
}

function InviteDialog({ name, code, onClose }: { name: string; code: string; onClose: () => void }) {
  const url = `${window.location.origin}/join/${code}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}`;
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Invite students · {name}</DialogTitle>
          <DialogDescription>Students scan this code, create a password and land straight in this class.</DialogDescription></DialogHeader>
        <div className="flex justify-center"><div className="bg-white p-4 rounded-xl"><img src={qr} alt={`QR code to join ${name}`} className="h-56 w-56" /></div></div>
        <p className="text-center font-mono text-2xl tracking-[0.3em]">{code}</p>
        <p className="font-mono text-xs break-all rounded-md border p-2">{url}</p>
        <Button onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copied'); }}><Copy className="h-4 w-4" />Copy link</Button>
      </DialogContent>
    </Dialog>
  );
}

function DomainBars({ stats }: { stats: DomainStat[] }) {
  if (!stats.length) return <p className="text-sm text-muted-foreground">No practice yet.</p>;
  return (
    <ul className="space-y-3">{stats.map(s => (
      <li key={s.domain} className="space-y-1">
        <div className="flex justify-between text-sm"><span>{s.domain} <span className="text-xs text-muted-foreground capitalize">· {s.subject}</span></span>
          <span className="font-mono text-xs">{pct(s.c, s.n)}% <span className="text-muted-foreground">({s.n})</span></span></div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-foreground/70 rounded-full" style={{ width: `${pct(s.c, s.n)}%` }} /></div>
      </li>))}</ul>
  );
}

/** Big liquid class card with Students / Analytics tabs — mirrors the main dashboard's ClassCardBig. */
function CenterClassCard({
  cls, students, statsMap, attMap, date, onCycle, onInspect, onInvite, onRename, canRename, onOpen,
}: {
  cls: CenterClass;
  students: CenterStudent[];
  statsMap: Record<string, StudentStats>;
  attMap: Record<string, string>;
  date: string;
  onCycle: (classId: string, studentId: string) => void;
  onInspect: (id: string) => void;
  onInvite: () => void;
  onRename: () => void;
  canRename: boolean;
  onOpen: () => void;
}) {
  const [tab, setTab] = useState<'students' | 'analytics'>('students');
  const totals = students.reduce((t, s) => {
    const st = statsMap[s.id];
    return { n: t.n + (st?.n ?? 0), c: t.c + (st?.c ?? 0) };
  }, { n: 0, c: 0 });
  const atRisk = students.filter(s => riskOf(statsMap[s.id])).length;

  return (
    <div onPointerMove={liquidTrack} onPointerLeave={liquidRest}
      className="relative admin-glass-card admin-glass-liquid admin-glass-neutral rounded-3xl border p-5 md:p-6 space-y-4 transition-transform hover:-translate-y-0.5">
      <LiquidGlassFX />
      <div className="relative flex items-start justify-between gap-3">
        <button onClick={onOpen} className="min-w-0 text-left group" aria-label={`Open ${cls.name}`}>
          <h3 className="font-semibold text-lg truncate group-hover:underline underline-offset-4 flex items-center gap-1.5">{cls.name}<ChevronRight className="h-4 w-4 opacity-50 group-hover:translate-x-0.5 transition-transform" /></h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {cls.schedule || 'No schedule set'}{cls.starts_on ? ` · starts ${cls.starts_on}` : ''}
          </p>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-mono text-xs text-foreground/50 border rounded-full px-2 py-0.5">{cls.join_code}</span>
          {canRename && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRename} title="Rename class"><Pencil className="h-3.5 w-3.5" /></Button>}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onInvite} title="Invite students"><QrCode className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" className="h-8 rounded-full" onClick={onOpen}>Open class</Button>
        </div>
      </div>

      <div className="relative flex items-center gap-4 text-sm text-foreground/70">
        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{students.length} student{students.length !== 1 ? 's' : ''}</span>
        <span className="font-mono text-xs">{totals.n} questions · {totals.n ? `${pct(totals.c, totals.n)}%` : '—'} accuracy</span>
        {atRisk > 0 && <span className="flex items-center gap-1 text-xs text-status-watch"><Flame className="h-3.5 w-3.5" />{atRisk} need{atRisk !== 1 ? '' : 's'} attention</span>}
      </div>

      <div className="relative flex gap-1 border-b border-border/60" role="tablist" aria-label={`${cls.name} details`}>
        {([['students', 'Students'], ['analytics', 'Analytics']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 transition-colors ${tab === k ? 'border-foreground text-foreground font-medium' : 'border-transparent text-foreground/60 hover:text-foreground'}`}>{l}</button>
        ))}
      </div>

      {tab === 'students' && (
        <div className="relative overflow-x-auto">
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No students yet — share the class QR code to enroll them.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-foreground/65 border-b border-border/60"><tr><th className="text-left py-2">Student</th><th className="text-left">Attendance</th><th className="text-left">Questions</th><th className="text-left">Accuracy</th><th className="text-left">Status</th></tr></thead>
              <tbody className="divide-y divide-border/50">{students.map(s => {
                const st = attMap[s.id]; const p = statsMap[s.id]; const risk = riskOf(p);
                return <tr key={s.id}>
                  <td className="py-3"><button onClick={() => onInspect(s.id)} className="hover:underline text-left">{s.name}</button>{!s.user_id && <span className="ml-2 text-xs text-foreground/60">not signed up</span>}</td>
                  <td><button onClick={() => onCycle(cls.id, s.id)} className={`rounded px-2.5 py-1 text-xs min-w-20 active:scale-[0.97] ${st ? STATUS_STYLE[st] : 'border text-muted-foreground'}`}>{st ? STATUS_LABEL[st] : 'Mark'}</button></td>
                  <td className="font-mono">{p?.n ?? 0}</td>
                  <td className="font-mono">{p?.n ? `${pct(p.c, p.n)}%` : '—'}</td>
                  <td className="text-xs">{risk ? <span className="text-status-watch">{risk}</span> : <span className="text-foreground/50">On track</span>}</td>
                </tr>;
              })}</tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'analytics' && (
        <div className="relative">
          <ClassAnalytics classId={cls.id} studentIds={students.map(s => s.id)} />
        </div>
      )}
    </div>
  );
}

/** Per-class domain mastery, loaded lazily when the Analytics tab opens. */
/** Dedicated class hub — full attendance grid, roster with risk, domain mastery and live launcher. */
function ClassHub({
  cls, students, statsMap, history, attMap, date, onCycle, onInspect, onInvite, onBack, onLive,
}: {
  cls: CenterClass; students: CenterStudent[]; statsMap: Record<string, StudentStats>;
  history: AttRow[]; attMap: Record<string, string>; date: string;
  onCycle: (classId: string, studentId: string) => void; onInspect: (id: string) => void;
  onInvite: () => void; onBack: () => void; onLive: () => void;
}) {
  const classHistory = history.filter(a => a.class_id === cls.id);
  const dates = [...new Set([date, ...classHistory.map(a => a.session_date)])].sort().reverse().slice(0, 12).reverse();
  const cell: Record<string, string> = {};
  for (const a of classHistory) cell[`${a.student_id}|${a.session_date}`] = a.status;
  for (const [sid, st] of Object.entries(attMap)) cell[`${sid}|${date}`] = st;
  const totals = students.reduce((t, s) => { const st = statsMap[s.id]; return { n: t.n + (st?.n ?? 0), c: t.c + (st?.c ?? 0), p: t.p + (st?.present ?? 0), s: t.s + (st?.sessions ?? 0) }; }, { n: 0, c: 0, p: 0, s: 0 });
  const glass = 'relative admin-glass-card admin-glass-liquid admin-glass-neutral rounded-3xl border p-5 md:p-6';
  const short = (d: string) => new Date(d + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" />All classes</Button>
      </div>
      <div onPointerMove={liquidTrack} onPointerLeave={liquidRest} className={`${glass} flex flex-wrap items-start justify-between gap-4`}>
        <LiquidGlassFX />
        <div className="relative min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{cls.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{cls.schedule || 'No schedule set'}{cls.starts_on ? ` · started ${cls.starts_on}` : ''}</p>
        </div>
        <div className="relative flex flex-wrap items-center gap-2">
          <button onClick={() => { navigator.clipboard.writeText(cls.join_code); toast.success('Join code copied'); }} className="font-mono text-sm border rounded-full px-3 py-1 hover:bg-muted flex items-center gap-1.5"><Copy className="h-3.5 w-3.5" />{cls.join_code}</button>
          <Button variant="outline" size="sm" onClick={onInvite}><QrCode className="h-4 w-4" />Invite</Button>
          <Button size="sm" onClick={onLive}><Radio className="h-4 w-4" />Start live session</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['Students', students.length], ['Questions', totals.n], ['Accuracy', totals.n ? `${pct(totals.c, totals.n)}%` : '—'], ['Attendance', totals.s ? `${pct(totals.p, totals.s)}%` : '—']].map(([l, v]) => (
          <div key={l as string} className="admin-glass-card rounded-2xl border p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="font-mono text-2xl">{v}</p></div>
        ))}
      </div>

      <div onPointerMove={liquidTrack} onPointerLeave={liquidRest} className={`${glass} space-y-3`}>
        <LiquidGlassFX />
        <div className="relative flex items-center justify-between"><p className="font-medium">Attendance</p><p className="text-xs text-muted-foreground">Tap the {short(date)} column to mark</p></div>
        <div className="relative overflow-x-auto">
          {!students.length ? <p className="text-sm text-muted-foreground">No students yet — share the class QR code.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-foreground/65 border-b border-border/60">
                <th className="text-left py-2 pr-3 sticky left-0 bg-background/60 backdrop-blur">Student</th>
                {dates.map(d => <th key={d} className={`px-1.5 font-mono font-normal whitespace-nowrap ${d === date ? 'text-foreground' : ''}`}>{short(d)}</th>)}
                <th className="text-left pl-3">Questions</th><th className="text-left">Accuracy</th><th className="text-left">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-border/50">{students.map(s => {
                const p = statsMap[s.id]; const risk = riskOf(p);
                return <tr key={s.id}>
                  <td className="py-2.5 pr-3 sticky left-0 bg-background/60 backdrop-blur"><button onClick={() => onInspect(s.id)} className="hover:underline text-left whitespace-nowrap">{s.name}</button></td>
                  {dates.map(d => { const st = cell[`${s.id}|${d}`]; return (
                    <td key={d} className="px-1.5 text-center">{d === date
                      ? <button onClick={() => onCycle(cls.id, s.id)} className={`rounded px-2 py-1 text-xs min-w-14 active:scale-[0.97] ${st ? STATUS_STYLE[st] : 'border text-muted-foreground'}`}>{st ? STATUS_LABEL[st] : 'Mark'}</button>
                      : <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] ${st ? STATUS_STYLE[st] : 'text-muted-foreground/40'}`}>{st ? STATUS_LABEL[st][0] : '·'}</span>}</td>
                  ); })}
                  <td className="pl-3 font-mono">{p?.n ?? 0}</td>
                  <td className="font-mono">{p?.n ? `${pct(p.c, p.n)}%` : '—'}</td>
                  <td className="text-xs whitespace-nowrap">{risk ? <span className="text-status-watch">{risk}</span> : <span className="text-foreground/50">On track</span>}</td>
                </tr>;
              })}</tbody>
            </table>
          )}
        </div>
      </div>

      <div onPointerMove={liquidTrack} onPointerLeave={liquidRest} className={`${glass} space-y-3`}>
        <LiquidGlassFX />
        <p className="relative font-medium">Domain mastery</p>
        <div className="relative"><ClassAnalytics classId={cls.id} studentIds={students.map(s => s.id)} /></div>
      </div>
    </div>
  );
}

function ClassAnalytics({ classId, studentIds }: { classId: string; studentIds: string[] }) {
  const { data } = useQuery({
    enabled: studentIds.length > 0,
    queryKey: ['center-class-analytics', classId],
    queryFn: async () => {
      const { data: attempts } = await supabase.from('tenant_attempts')
        .select('student_id, question_id, is_correct, created_at').in('student_id', studentIds)
        .order('created_at', { ascending: false }).limit(20000);
      const list = attempts ?? [];
      const meta = await loadQuestionMeta(list.map(a => a.question_id));
      return domainStats(list, meta);
    },
  });
  if (!studentIds.length) return <p className="text-sm text-muted-foreground">No students in this class yet.</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return <DomainBars stats={data} />;
}

/** Read-only practice browser over the international question bank. */
function PracticeBrowser() {
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState<'all' | 'math' | 'english'>('all');
  const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const { data, isLoading } = useQuery({
    queryKey: ['center-practice', q, subject, difficulty],
    queryFn: async () => {
      let query = supabase.from('intl_questions')
        .select('id, question_text, subject, subtopic, difficulty_level, question_set')
        .order('created_at', { ascending: false }).limit(50);
      if (q.trim()) query = query.ilike('question_text', `%${q.trim()}%`);
      if (subject !== 'all') query = query.eq('subject', subject);
      if (difficulty !== 'all') query = query.eq('difficulty_level', difficulty);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 p-2 md:p-3 admin-glass rounded-xl border">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search questions…" className="pl-9 border-0 bg-transparent" />
        </div>
        <Select value={subject} onValueChange={v => setSubject(v as typeof subject)}>
          <SelectTrigger className="h-9 w-32 rounded-xl text-sm border-0 bg-transparent"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All subjects</SelectItem><SelectItem value="math">Math</SelectItem><SelectItem value="english">English</SelectItem></SelectContent>
        </Select>
        <Select value={difficulty} onValueChange={v => setDifficulty(v as typeof difficulty)}>
          <SelectTrigger className="h-9 w-32 rounded-xl text-sm border-0 bg-transparent"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All levels</SelectItem><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
        </Select>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !data?.length ? (
        <p className="text-sm text-muted-foreground">No questions match.</p>
      ) : (
        <div className="grid gap-3">
          {data.map(question => (
            <div key={question.id} onPointerMove={liquidTrack} onPointerLeave={liquidRest}
              className="relative admin-glass-card admin-glass-liquid admin-glass-neutral rounded-2xl border p-4">
              <LiquidGlassFX />
              <div className="relative space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60">
                  <span className="capitalize border rounded-full px-2 py-0.5">{question.subject}</span>
                  {question.subtopic && <span className="border rounded-full px-2 py-0.5">{question.subtopic}</span>}
                  {question.difficulty_level && <span className="capitalize border rounded-full px-2 py-0.5">{question.difficulty_level}</span>}
                  {question.question_set && <span className="font-mono">{question.question_set}</span>}
                </div>
                <div className="text-sm leading-relaxed"><MathText text={question.question_text ?? ''} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CenterTeacherPortal() {
  const { center, role, userId, name, signOut } = useCenter();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>('dashboard');
  const [slideDirection, setSlideDirection] = useState(0);
  const [intake, setIntake] = useState<'current' | 'previous' | 'all'>('current');
  const [date, setDate] = useState(localDate());
  const [searchOpen, setSearchOpen] = useState(false);
  const [invite, setInvite] = useState<CenterClass | null>(null);
  const [rename, setRename] = useState<CenterClass | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [inspect, setInspect] = useState<string | null>(null);
  const [liveClassId, setLiveClassId] = useState<string | null>(null);

  // Liquid glass admin theme, scoped to this page's lifetime.
  useEffect(() => {
    document.body.classList.add('admin-theme');
    return () => document.body.classList.remove('admin-theme');
  }, []);

  // ⌘K opens student search, like the main dashboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const brandGlow = (center.portal_settings?.brand_color && hexToHslToken(center.portal_settings.brand_color)) || null;
  const sectionGlow = brandGlow ?? MODE_GLOW[mode];

  const { data: classes } = useQuery({
    queryKey: ['center-teacher', center.id, userId],
    queryFn: async () => {
      const { data: me } = await supabase.from('tenant_members').select('id').eq('institution_id', center.id).eq('user_id', userId!).maybeSingle();
      let q = supabase.from('tenant_classes').select('*').eq('institution_id', center.id).order('created_at');
      if (role !== 'center_admin') q = q.eq('teacher_member_id', me?.id ?? '00000000-0000-0000-0000-000000000000');
      const { data: rows, error } = await q;
      if (error) throw error;
      const { data: students } = await supabase.from('tenant_students').select('id, class_id').eq('institution_id', center.id).eq('active', true);
      const counts: Record<string, number> = {};
      for (const s of students ?? []) if (s.class_id) counts[s.class_id] = (counts[s.class_id] ?? 0) + 1;
      return rows.map(c => ({ ...c, studentCount: counts[c.id] ?? 0 })) as CenterClass[];
    },
  });

  const classIds = useMemo(() => classes?.map(c => c.id) ?? [], [classes]);

  // All students across the teacher's classes.
  const studentsQuery = useQuery({
    enabled: classIds.length > 0,
    queryKey: ['center-teacher-students', center.id, classIds.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenant_students')
        .select('id, class_id, name, phone, user_id').eq('institution_id', center.id).eq('active', true).order('name');
      if (error) throw error;
      return data as CenterStudent[];
    },
  });
  const allStudents = studentsQuery.data ?? [];
  const allStudentIds = useMemo(() => allStudents.map(s => s.id), [allStudents]);

  // Attendance for the picked date, across all classes.
  const attQuery = useQuery({
    enabled: classIds.length > 0,
    queryKey: ['center-teacher-att', center.id, date, classIds.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenant_attendance')
        .select('student_id, class_id, status').in('class_id', classIds).eq('session_date', date);
      if (error) throw error;
      return data as Pick<AttRow, 'student_id' | 'class_id' | 'status'>[];
    },
  });
  const attByClass = useMemo(() => {
    const m: Record<string, Record<string, string>> = {};
    for (const a of attQuery.data ?? []) (m[a.class_id] ||= {})[a.student_id] = a.status;
    return m;
  }, [attQuery.data]);

  // Practice + attendance history across all classes powers per-student stats.
  const historyQuery = useQuery({
    enabled: allStudentIds.length > 0,
    queryKey: ['center-teacher-history', center.id, allStudentIds.join(',')],
    queryFn: async () => {
      const [attempts, att] = await Promise.all([
        supabase.from('tenant_attempts').select('student_id, question_id, is_correct, created_at')
          .in('student_id', allStudentIds).order('created_at', { ascending: false }).limit(30000),
        supabase.from('tenant_attendance').select('student_id, class_id, status, session_date')
          .in('class_id', classIds).order('session_date', { ascending: false }).limit(10000),
      ]);
      const list = (attempts.data ?? []) as Attempt[];
      const meta = await loadQuestionMeta(list.map(a => a.question_id));
      return { attempts: list, att: (att.data ?? []) as AttRow[], meta };
    },
  });

  const statsMap = useMemo(() => {
    const m: Record<string, StudentStats> = {};
    for (const id of allStudentIds) m[id] = { n: 0, c: 0, present: 0, sessions: 0 };
    for (const a of historyQuery.data?.attempts ?? []) { const s = m[a.student_id]; if (!s) continue; s.n++; if (a.is_correct) s.c++; s.last ??= a.created_at; }
    for (const a of historyQuery.data?.att ?? []) { const s = m[a.student_id]; if (!s) continue; s.sessions++; if (a.status === 'present' || a.status === 'late') s.present++; }
    return m;
  }, [historyQuery.data, allStudentIds]);

  const cycle = async (classId: string, studentId: string) => {
    const cur = attByClass[classId]?.[studentId];
    const next = STATUS_ORDER[(cur ? STATUS_ORDER.indexOf(cur) + 1 : 0) % STATUS_ORDER.length];
    qc.setQueryData(['center-teacher-att', center.id, date, classIds.join(',')], (old: any) =>
      old ? [...old.filter((a: any) => !(a.student_id === studentId && a.class_id === classId)), { student_id: studentId, class_id: classId, status: next }] : old);
    const { error } = await supabase.from('tenant_attendance').upsert(
      { institution_id: center.id, class_id: classId, student_id: studentId, session_date: date, status: next },
      { onConflict: 'student_id,class_id,session_date' });
    if (error) { toast.error('Could not save attendance'); qc.invalidateQueries({ queryKey: ['center-teacher-att', center.id, date] }); }
    else qc.invalidateQueries({ queryKey: ['center-teacher-history', center.id] });
  };

  const saveRename = async () => {
    if (!rename || !renameValue.trim()) return;
    const { error } = await supabase.from('tenant_classes').update({ name: renameValue.trim() }).eq('id', rename.id);
    if (error) toast.error('Could not rename class');
    else { toast.success('Class renamed'); qc.invalidateQueries({ queryKey: ['center-teacher', center.id] }); }
    setRename(null);
  };

  const filteredClasses = useMemo(() => {
    const list = classes ?? [];
    if (intake === 'current') return list.filter(c => !isCompleted(c));
    if (intake === 'previous') return list.filter(isCompleted);
    return list;
  }, [classes, intake]);

  const groupedClasses = useMemo(() => {
    if (intake !== 'all') return { ungrouped: filteredClasses };
    const groups: Record<string, CenterClass[]> = {};
    filteredClasses.forEach(c => {
      const d = new Date(c.starts_on ?? c.created_at);
      const key = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
      (groups[key] ||= []).push(c);
    });
    return groups;
  }, [filteredClasses, intake]);

  // Aggregate analytics across every class.
  const allDomains = useMemo(() => historyQuery.data ? domainStats(historyQuery.data.attempts, historyQuery.data.meta) : [], [historyQuery.data]);
  const grandTotals = Object.values(statsMap).reduce((t, s) => ({ n: t.n + s.n, c: t.c + s.c, p: t.p + s.present, s: t.s + s.sessions }), { n: 0, c: 0, p: 0, s: 0 });
  const atRiskStudents = allStudents.filter(s => riskOf(statsMap[s.id]));

  const inspected = allStudents.find(s => s.id === inspect);
  const inspectedDomains = useMemo(() => historyQuery.data && inspect
    ? domainStats(historyQuery.data.attempts.filter(a => a.student_id === inspect), historyQuery.data.meta)
    : [], [historyQuery.data, inspect]);

  const handleModeChange = (next: Mode) => {
    setSlideDirection(MODE_ORDER.indexOf(next) > MODE_ORDER.indexOf(mode) ? 1 : -1);
    setMode(next);
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
  };
  const slideTransition = { type: 'spring' as const, stiffness: 200, damping: 27, mass: 1.2 };

  const dockItems: { key: Mode; label: string; icon: typeof Users }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'analytics', label: 'Analytics', icon: TrendingUp },
    { key: 'practice', label: 'Practice', icon: BookOpen },
    { key: 'live', label: 'Live', icon: Radio },
  ];

  const renderCard = (c: CenterClass) => (
    <CenterClassCard
      key={c.id}
      cls={c}
      students={allStudents.filter(s => s.class_id === c.id)}
      statsMap={statsMap}
      attMap={attByClass[c.id] ?? {}}
      date={date}
      onCycle={cycle}
      onInspect={setInspect}
      onInvite={() => setInvite(c)}
      onRename={() => { setRename(c); setRenameValue(c.name); }}
      canRename={role === 'center_admin'}
    />
  );

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background to-muted overflow-x-hidden admin-glow-scope"
      style={{ '--section-glow': sectionGlow } as React.CSSProperties}
    >
      <div aria-hidden className="admin-page-atmosphere" />
      <AdminBackgroundPaths />

      {/* Glass top bar — mirrors the main teacher dashboard */}
      <div className="sticky top-0 z-30 admin-glass-bar">
        <div className="w-full max-w-[1600px] mx-auto px-3 md:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <CenterLogo center={center} className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl lg:text-3xl font-bold truncate">Welcome, {name}!</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5 hidden sm:block">{centerDisplayName(center)} · Manage your classes and track attendance</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="h-8 md:h-9 px-2 md:px-3 text-muted-foreground" onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline text-xs">Search</span>
              <kbd className="hidden lg:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>
            </Button>
            {role === 'center_admin' && (
              <Button variant="ghost" size="sm" className="h-8 md:h-9 px-2 md:px-3 text-muted-foreground" asChild>
                <Link to="/admin"><LayoutDashboard className="h-4 w-4 md:mr-2" /><span className="hidden md:inline text-xs">Admin view</span></Link>
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 md:h-9 px-2 md:px-3" onClick={signOut}>
              <LogOut className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-[1600px] mx-auto p-3 md:p-6 lg:p-8 pb-28">
        {!classes ? (
          <div className="grid gap-4">{[0, 1].map(i => <div key={i} className="h-64 rounded-3xl bg-gradient-to-br from-muted/50 to-muted/20 animate-pulse" />)}</div>
        ) : !classes.length ? (
          <p className="text-sm text-muted-foreground">No classes assigned to you yet. Ask your center admin.</p>
        ) : (
          <div className="relative">
            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={mode}
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
              >
                {mode === 'dashboard' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 p-2 md:p-3 admin-glass rounded-xl border">
                      <Select value={intake} onValueChange={v => setIntake(v as typeof intake)}>
                        <SelectTrigger className="h-9 rounded-xl text-sm flex-1 md:max-w-xs border-0 bg-transparent"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="current" className="text-sm">Active Classes</SelectItem>
                          <SelectItem value="previous" className="text-sm">Completed Classes</SelectItem>
                          <SelectItem value="all" className="text-sm">All Classes</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="space-y-1">
                        <Label htmlFor="att-date" className="sr-only">Session date</Label>
                        <Input id="att-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9 w-40 border-0 bg-transparent text-sm" />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap pr-2">{filteredClasses.length} class{filteredClasses.length !== 1 ? 'es' : ''}</span>
                    </div>

                    {filteredClasses.length === 0 ? (
                      <div className="admin-glass-card rounded-3xl border py-12 text-center text-muted-foreground text-sm">
                        No {intake === 'current' ? 'active' : intake === 'previous' ? 'completed' : ''} classes
                      </div>
                    ) : intake === 'all' ? (
                      <div className="space-y-6">
                        {Object.entries(groupedClasses).map(([key, list]) => key !== 'ungrouped' && (
                          <div key={key} className="space-y-3">
                            <h4 className="text-xs font-medium text-muted-foreground px-1 sticky top-16 bg-background/80 backdrop-blur py-1 z-10">{key}</h4>
                            <div className="grid gap-4">{list.map(renderCard)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid gap-4">{filteredClasses.map(renderCard)}</div>
                    )}
                  </div>
                )}

                {mode === 'analytics' && (
                  <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                    <div onPointerMove={liquidTrack} onPointerLeave={liquidRest} className="admin-glass-card admin-glass-liquid admin-glass-neutral rounded-3xl border p-5 space-y-4">
                      <LiquidGlassFX />
                      <p className="relative font-medium">Domain mastery — all classes</p>
                      <div className="relative"><DomainBars stats={allDomains} /></div>
                    </div>
                    <div className="space-y-4">
                      <div onPointerMove={liquidTrack} onPointerLeave={liquidRest} className="admin-glass-card admin-glass-liquid admin-glass-neutral rounded-3xl border p-5 grid grid-cols-2 gap-4">
                        <LiquidGlassFX />
                        <div className="relative"><p className="text-xs text-muted-foreground">Questions</p><p className="font-mono text-2xl">{grandTotals.n}</p></div>
                        <div className="relative"><p className="text-xs text-muted-foreground">Accuracy</p><p className="font-mono text-2xl">{grandTotals.n ? `${pct(grandTotals.c, grandTotals.n)}%` : '—'}</p></div>
                        <div className="relative"><p className="text-xs text-muted-foreground">Attendance</p><p className="font-mono text-2xl">{grandTotals.s ? `${pct(grandTotals.p, grandTotals.s)}%` : '—'}</p></div>
                        <div className="relative"><p className="text-xs text-muted-foreground">Students</p><p className="font-mono text-2xl">{allStudents.length}</p></div>
                      </div>
                      <div onPointerMove={liquidTrack} onPointerLeave={liquidRest} className="admin-glass-card admin-glass-liquid admin-glass-neutral rounded-3xl border p-5 space-y-2">
                        <LiquidGlassFX />
                        <p className="relative font-medium text-sm">Needs attention</p>
                        <div className="relative">
                          {atRiskStudents.map(s => <button key={s.id} onClick={() => setInspect(s.id)} className="block text-sm hover:underline">{s.name}</button>)}
                          {!atRiskStudents.length && <p className="text-sm text-muted-foreground">Everyone is on track.</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {mode === 'practice' && <PracticeBrowser />}

                {mode === 'live' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 p-2 md:p-3 admin-glass rounded-xl border">
                      <Select value={liveClassId ?? ''} onValueChange={setLiveClassId}>
                        <SelectTrigger className="h-9 rounded-xl text-sm flex-1 md:max-w-xs border-0 bg-transparent"><SelectValue placeholder="Pick a class" /></SelectTrigger>
                        <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id} className="text-sm">{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {liveClassId
                      ? <TeacherLive classId={liveClassId} studentCount={allStudents.filter(s => s.class_id === liveClassId).length} />
                      : <p className="text-sm text-muted-foreground">Pick a class to start a live session.</p>}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Floating glass mode dock — mirrors the main teacher dashboard dock */}
      {!!classes?.length && (
        <nav aria-label="Teacher tools" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 admin-glass rounded-full border shadow-lg px-2 py-1.5 flex items-center gap-1">
          {dockItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              aria-pressed={mode === key}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-colors active:scale-[0.96] ${mode === key ? 'bg-foreground text-background font-medium' : 'text-foreground/65 hover:text-foreground'}`}
            >
              <Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Student search (⌘K) */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <Command>
            <CommandInput placeholder="Search students by name or phone…" />
            <CommandList>
              <CommandEmpty>No students found.</CommandEmpty>
              <CommandGroup heading="Students">
                {allStudents.map(s => (
                  <CommandItem key={s.id} value={`${s.name} ${s.phone}`} onSelect={() => { setSearchOpen(false); setInspect(s.id); }}>
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{s.name}</span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">{s.phone}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {invite && <InviteDialog name={invite.name} code={invite.join_code} onClose={() => setInvite(null)} />}

      {/* Rename class */}
      <Dialog open={!!rename} onOpenChange={o => !o && setRename(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Rename class</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} placeholder="Class name" />
            <Button className="w-full" onClick={saveRename} disabled={!renameValue.trim()}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student inspection sheet */}
      <Sheet open={!!inspected} onOpenChange={o => !o && setInspect(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {inspected && <>
            <SheetHeader><SheetTitle>{inspected.name}</SheetTitle></SheetHeader>
            <div className="mt-4 space-y-6">
              <p className="text-sm text-muted-foreground font-mono">{inspected.phone}{!inspected.user_id && ' · not signed up'}</p>
              <div className="grid grid-cols-3 gap-3">
                <div><p className="text-xs text-muted-foreground">Questions</p><p className="font-mono text-xl">{statsMap[inspected.id]?.n ?? 0}</p></div>
                <div><p className="text-xs text-muted-foreground">Accuracy</p><p className="font-mono text-xl">{statsMap[inspected.id]?.n ? `${pct(statsMap[inspected.id].c, statsMap[inspected.id].n)}%` : '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Attended</p><p className="font-mono text-xl">{statsMap[inspected.id]?.present ?? 0}/{statsMap[inspected.id]?.sessions ?? 0}</p></div>
              </div>
              <div className="space-y-3"><p className="text-sm font-medium">By domain</p><DomainBars stats={inspectedDomains} /></div>
              <div className="space-y-1"><p className="text-sm font-medium">Recent attendance</p>
                {(historyQuery.data?.att ?? []).filter(a => a.student_id === inspected.id).slice(0, 10).map(a => <p key={a.session_date} className="flex justify-between text-sm"><span className="font-mono text-xs">{a.session_date}</span><span className="text-muted-foreground">{STATUS_LABEL[a.status]}</span></p>)}
              </div>
            </div>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
