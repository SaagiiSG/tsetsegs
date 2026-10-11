import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, LogOut, QrCode, Users, TrendingUp, Radio, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { CenterLogo, STATUS_LABEL, STATUS_ORDER, STATUS_STYLE, centerDisplayName, hexToHslToken, useCenter } from './centerContext';
import { localDate } from './centerApi';
import { LiquidGlassFX } from '@/components/admin/LiquidGlassFX';
import { liquidTrack, liquidRest } from '@/hooks/useLiquidHighlight';
import { AdminBackgroundPaths } from '@/components/ui/background-paths';
import { domainStats, loadQuestionMeta, pct, type DomainStat } from './questionMeta';
import { TeacherLive } from './LiveSession';

type Tab = 'roster' | 'analytics' | 'live';

const TAB_GLOW: Record<Tab, string> = {
  roster: '217 91% 60%',
  analytics: '262 83% 62%',
  live: '345 75% 55%',
};

const TAB_ORDER: Tab[] = ['roster', 'analytics', 'live'];

function InviteDialog({ name, code, onClose }: { name: string; code: string; onClose: () => void }) {
  const url = `${window.location.origin}/join/${code}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}`;
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Invite students · {name}</DialogTitle>
          <DialogDescription>Students scan this code, create a password and land straight in this class.</DialogDescription></DialogHeader>
        <img src={qr} alt={`QR code to join ${name}`} className="mx-auto h-64 w-64 rounded-md border bg-background p-2" />
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

export default function CenterTeacherPortal() {
  const { center, role, userId, name, signOut } = useCenter();
  const qc = useQueryClient();
  const [classId, setClassId] = useState<string | null>(null);
  const [date, setDate] = useState(localDate());
  const [tab, setTab] = useState<Tab>('roster');
  const [slideDirection, setSlideDirection] = useState(0);
  const [invite, setInvite] = useState(false);
  const [inspect, setInspect] = useState<string | null>(null);

  // Liquid glass admin theme, scoped to this page's lifetime.
  useEffect(() => {
    document.body.classList.add('admin-theme');
    return () => document.body.classList.remove('admin-theme');
  }, []);

  const brandGlow = (center.portal_settings?.brand_color && hexToHslToken(center.portal_settings.brand_color)) || null;
  const sectionGlow = brandGlow ?? TAB_GLOW[tab];

  const { data } = useQuery({
    queryKey: ['center-teacher', center.id, userId],
    queryFn: async () => {
      const { data: me } = await supabase.from('tenant_members').select('id').eq('institution_id', center.id).eq('user_id', userId!).maybeSingle();
      let q = supabase.from('tenant_classes').select('*').eq('institution_id', center.id).order('created_at');
      if (role !== 'center_admin') q = q.eq('teacher_member_id', me?.id ?? '00000000-0000-0000-0000-000000000000');
      const { data: classes, error } = await q;
      if (error) throw error;
      const { data: students } = await supabase.from('tenant_students').select('id, class_id').eq('institution_id', center.id).eq('active', true);
      const counts: Record<string, number> = {};
      for (const s of students ?? []) if (s.class_id) counts[s.class_id] = (counts[s.class_id] ?? 0) + 1;
      return classes.map(c => ({ ...c, studentCount: counts[c.id] ?? 0 }));
    },
  });
  useEffect(() => { if (!classId && data?.length) setClassId(data[0].id); }, [data, classId]);
  const cls = data?.find(c => c.id === classId);

  const roster = useQuery({
    enabled: !!classId,
    queryKey: ['center-roster', classId, date],
    queryFn: async () => {
      const [students, att] = await Promise.all([
        supabase.from('tenant_students').select('id, name, phone, user_id').eq('class_id', classId!).eq('active', true).order('name'),
        supabase.from('tenant_attendance').select('student_id, status').eq('class_id', classId!).eq('session_date', date),
      ]);
      if (students.error) throw students.error;
      return { students: students.data, att: Object.fromEntries((att.data ?? []).map(a => [a.student_id, a.status])) };
    },
  });
  const studentIds = useMemo(() => roster.data?.students.map(s => s.id) ?? [], [roster.data]);

  // Class-wide practice + attendance history powers analytics and student inspection.
  const history = useQuery({
    enabled: studentIds.length > 0,
    queryKey: ['center-class-history', classId, studentIds.join(',')],
    queryFn: async () => {
      const [attempts, att] = await Promise.all([
        supabase.from('tenant_attempts').select('student_id, question_id, is_correct, created_at').in('student_id', studentIds).order('created_at', { ascending: false }).limit(20000),
        supabase.from('tenant_attendance').select('student_id, status, session_date').eq('class_id', classId!).order('session_date', { ascending: false }).limit(5000),
      ]);
      const list = attempts.data ?? [];
      const meta = await loadQuestionMeta(list.map(a => a.question_id));
      return { attempts: list, att: att.data ?? [], meta };
    },
  });

  const perStudent = useMemo(() => {
    const m: Record<string, { n: number; c: number; present: number; sessions: number; last?: string }> = {};
    for (const id of studentIds) m[id] = { n: 0, c: 0, present: 0, sessions: 0 };
    for (const a of history.data?.attempts ?? []) { const s = m[a.student_id]; if (!s) continue; s.n++; if (a.is_correct) s.c++; s.last ??= a.created_at; }
    for (const a of history.data?.att ?? []) { const s = m[a.student_id]; if (!s) continue; s.sessions++; if (a.status === 'present' || a.status === 'late') s.present++; }
    return m;
  }, [history.data, studentIds]);
  const riskOf = (id: string) => {
    const s = perStudent[id]; if (!s) return null;
    const attRate = s.sessions ? s.present / s.sessions : 1;
    const stale = !s.last || Date.now() - new Date(s.last).getTime() > 7 * 864e5;
    return attRate < 0.7 || (s.n >= 10 && s.c / s.n < 0.5) || stale ? 'Needs attention' : null;
  };

  const cycle = async (studentId: string) => {
    const cur = roster.data?.att[studentId];
    const next = STATUS_ORDER[(cur ? STATUS_ORDER.indexOf(cur) + 1 : 0) % STATUS_ORDER.length];
    qc.setQueryData(['center-roster', classId, date], (old: any) => old && { ...old, att: { ...old.att, [studentId]: next } });
    const { error } = await supabase.from('tenant_attendance').upsert(
      { institution_id: center.id, class_id: classId!, student_id: studentId, session_date: date, status: next },
      { onConflict: 'student_id,class_id,session_date' });
    if (error) { toast.error('Could not save attendance'); qc.invalidateQueries({ queryKey: ['center-roster', classId, date] }); }
    else qc.invalidateQueries({ queryKey: ['center-class-history', classId] });
  };

  const classDomains = useMemo(() => history.data ? domainStats(history.data.attempts, history.data.meta) : [], [history.data]);
  const inspected = roster.data?.students.find(s => s.id === inspect);
  const inspectedDomains = useMemo(() => history.data && inspect ? domainStats(history.data.attempts.filter(a => a.student_id === inspect), history.data.meta) : [], [history.data, inspect]);

  const totals = Object.values(perStudent).reduce((t, s) => ({ n: t.n + s.n, c: t.c + s.c, p: t.p + s.present, s: t.s + s.sessions }), { n: 0, c: 0, p: 0, s: 0 });

  const handleTabChange = (next: Tab) => {
    setSlideDirection(TAB_ORDER.indexOf(next) > TAB_ORDER.indexOf(tab) ? 1 : -1);
    setTab(next);
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
  };
  const slideTransition = { type: 'spring' as const, stiffness: 200, damping: 27, mass: 1.2 };

  const dockItems: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: 'roster', label: 'Roster', icon: Users },
    { key: 'analytics', label: 'Analytics', icon: TrendingUp },
    { key: 'live', label: 'Live', icon: Radio },
  ];

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
            {role === 'center_admin' && (
              <Button variant="ghost" size="sm" className="h-8 md:h-9 px-2 md:px-3 text-muted-foreground" asChild>
                <Link to="/admin"><LayoutDashboard className="h-4 w-4 md:mr-2" /><span className="hidden md:inline text-xs">Admin view</span></Link>
              </Button>
            )}
            {cls && (
              <Button variant="outline" size="sm" className="h-8 md:h-9 px-2 md:px-3" onClick={() => setInvite(true)}>
                <QrCode className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Invite students</span>
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 md:h-9 px-2 md:px-3" onClick={signOut}>
              <LogOut className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-[1600px] mx-auto p-3 md:p-6 lg:p-8 pb-28">
        {!data ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map(i => <div key={i} className="h-44 rounded-3xl bg-gradient-to-br from-muted/50 to-muted/20 animate-pulse" />)}
          </div>
        ) : !data.length ? (
          <p className="text-sm text-muted-foreground">No classes assigned to you yet. Ask your center admin.</p>
        ) : (
          <div className="space-y-6">
            {/* Liquid glass class cards — neutral data cards, like the main dashboard */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.map(c => {
                const active = c.id === classId;
                return (
                  <button
                    key={c.id}
                    onClick={() => { setClassId(c.id); setInspect(null); }}
                    onPointerMove={liquidTrack}
                    onPointerLeave={liquidRest}
                    className={`relative text-left admin-glass-card admin-glass-liquid admin-glass-neutral rounded-3xl border p-5 transition-transform active:scale-[0.98] ${active ? 'ring-2 ring-foreground/25' : ''}`}
                  >
                    <LiquidGlassFX />
                    <div className="relative space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold truncate">{c.name}</p>
                        {active && <span className="text-[10px] uppercase tracking-wider text-foreground/50 border rounded-full px-2 py-0.5 shrink-0">Selected</span>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-foreground/70">
                        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{c.studentCount} student{c.studentCount !== 1 ? 's' : ''}</span>
                        <span className="font-mono text-xs text-foreground/50">{c.join_code}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tab content with slide transitions */}
            <div className="relative">
              <AnimatePresence mode="wait" custom={slideDirection}>
                <motion.div
                  key={tab}
                  custom={slideDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTransition}
                >
                  {tab === 'roster' && (
                    <div className="space-y-4">
                      <div className="flex items-end gap-3 flex-wrap">
                        <div className="space-y-1"><Label htmlFor="att-date">Session date</Label><Input id="att-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" /></div>
                        <p className="text-xs text-foreground/65 pb-2">Tap a status to cycle it. Tap a name for details.</p>
                      </div>
                      <div onPointerMove={liquidTrack} onPointerLeave={liquidRest} className="admin-glass-card admin-glass-liquid admin-glass-neutral rounded-3xl border p-4 overflow-x-auto">
                        <LiquidGlassFX />
                        <table className="relative w-full text-sm"><thead className="text-xs text-foreground/65 border-b"><tr><th className="text-left py-2">Student</th><th className="text-left">Attendance</th><th className="text-left">Questions</th><th className="text-left">Accuracy</th><th className="text-left">Status</th></tr></thead>
                          <tbody className="divide-y">{roster.data?.students.map(s => {
                            const st = roster.data.att[s.id]; const p = perStudent[s.id]; const risk = riskOf(s.id);
                            return <tr key={s.id}><td className="py-3"><button onClick={() => setInspect(s.id)} className="hover:underline text-left">{s.name}</button>{!s.user_id && <span className="ml-2 text-xs text-foreground/60">not signed up</span>}</td>
                              <td><button onClick={() => cycle(s.id)} className={`rounded px-2.5 py-1 text-xs min-w-20 active:scale-[0.97] ${st ? STATUS_STYLE[st] : 'border text-muted-foreground'}`}>{st ? STATUS_LABEL[st] : 'Mark'}</button></td>
                              <td className="font-mono">{p?.n ?? 0}</td><td className="font-mono">{p?.n ? `${pct(p.c, p.n)}%` : '—'}</td>
                              <td className="text-xs">{risk ? <span className="text-status-watch">{risk}</span> : <span className="text-foreground/50">On track</span>}</td></tr>;
                          })}</tbody></table>
                      </div>
                      {roster.data && !roster.data.students.length && <p className="text-sm text-muted-foreground">No students yet — use "Invite students" to share the class QR code.</p>}
                    </div>
                  )}

                  {tab === 'analytics' && (
                    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                      <div onPointerMove={liquidTrack} onPointerLeave={liquidRest} className="admin-glass-card admin-glass-liquid admin-glass-neutral rounded-3xl border p-5 space-y-4">
                        <LiquidGlassFX />
                        <p className="relative font-medium">Domain mastery</p>
                        <div className="relative"><DomainBars stats={classDomains} /></div>
                      </div>
                      <div className="space-y-4">
                        <div onPointerMove={liquidTrack} onPointerLeave={liquidRest} className="admin-glass-card admin-glass-liquid admin-glass-neutral rounded-3xl border p-5 grid grid-cols-2 gap-4">
                          <LiquidGlassFX />
                          <div className="relative"><p className="text-xs text-muted-foreground">Questions</p><p className="font-mono text-2xl">{totals.n}</p></div>
                          <div className="relative"><p className="text-xs text-muted-foreground">Accuracy</p><p className="font-mono text-2xl">{totals.n ? `${pct(totals.c, totals.n)}%` : '—'}</p></div>
                          <div className="relative"><p className="text-xs text-muted-foreground">Attendance</p><p className="font-mono text-2xl">{totals.s ? `${pct(totals.p, totals.s)}%` : '—'}</p></div>
                          <div className="relative"><p className="text-xs text-muted-foreground">Students</p><p className="font-mono text-2xl">{studentIds.length}</p></div>
                        </div>
                        <div onPointerMove={liquidTrack} onPointerLeave={liquidRest} className="admin-glass-card admin-glass-liquid admin-glass-neutral rounded-3xl border p-5 space-y-2">
                          <LiquidGlassFX />
                          <p className="relative font-medium text-sm">Needs attention</p>
                          <div className="relative">
                            {roster.data?.students.filter(s => riskOf(s.id)).map(s => <button key={s.id} onClick={() => setInspect(s.id)} className="block text-sm hover:underline">{s.name}</button>)}
                            {!roster.data?.students.some(s => riskOf(s.id)) && <p className="text-sm text-muted-foreground">Everyone is on track.</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === 'live' && classId && <TeacherLive classId={classId} studentCount={studentIds.length} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Floating glass mode dock — mirrors the main teacher dashboard dock */}
      {!!data?.length && (
        <nav aria-label="Teacher tools" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 admin-glass rounded-full border shadow-lg px-2 py-1.5 flex items-center gap-1">
          {dockItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              aria-pressed={tab === key}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-colors active:scale-[0.96] ${tab === key ? 'bg-foreground text-background font-medium' : 'text-foreground/65 hover:text-foreground'}`}
            >
              <Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
      )}

      {invite && cls && <InviteDialog name={cls.name} code={cls.join_code} onClose={() => setInvite(false)} />}
      <Sheet open={!!inspected} onOpenChange={o => !o && setInspect(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {inspected && <>
            <SheetHeader><SheetTitle>{inspected.name}</SheetTitle></SheetHeader>
            <div className="mt-4 space-y-6">
              <p className="text-sm text-muted-foreground font-mono">{inspected.phone}{!inspected.user_id && ' · not signed up'}</p>
              <div className="grid grid-cols-3 gap-3">
                <div><p className="text-xs text-muted-foreground">Questions</p><p className="font-mono text-xl">{perStudent[inspected.id]?.n ?? 0}</p></div>
                <div><p className="text-xs text-muted-foreground">Accuracy</p><p className="font-mono text-xl">{perStudent[inspected.id]?.n ? `${pct(perStudent[inspected.id].c, perStudent[inspected.id].n)}%` : '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Attended</p><p className="font-mono text-xl">{perStudent[inspected.id]?.present ?? 0}/{perStudent[inspected.id]?.sessions ?? 0}</p></div>
              </div>
              <div className="space-y-3"><p className="text-sm font-medium">By domain</p><DomainBars stats={inspectedDomains} /></div>
              <div className="space-y-1"><p className="text-sm font-medium">Recent attendance</p>
                {(history.data?.att ?? []).filter(a => a.student_id === inspected.id).slice(0, 10).map(a => <p key={a.session_date} className="flex justify-between text-sm"><span className="font-mono text-xs">{a.session_date}</span><span className="text-muted-foreground">{STATUS_LABEL[a.status]}</span></p>)}
              </div>
            </div>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}
