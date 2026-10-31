import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useEmblaCarousel from 'embla-carousel-react';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, CalendarClock, ChevronDown, ChevronUp, ClipboardList, Copy, Pencil, QrCode, Radio,
  Send, StickyNote, Trash2, Trophy,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AttendanceSlider } from '@/components/teacher/AttendanceSlider';
import { StudentSidebar } from '@/components/teacher/StudentSidebar';
import { StudentCardsLoadingSkeleton } from '@/components/teacher/StudentCardSkeleton';
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';
import { liquidTrack, liquidRest } from '@/hooks/useLiquidHighlight';
import { useCenter } from './centerContext';
import { allPages, localDate } from './centerApi';
import { domainStats, pct, type DomainStat, type QMeta } from './questionMeta';

type CardClass = { id: string; name: string; join_code: string; schedule: string | null; starts_on: string | null; created_at: string };
type CardStudent = { id: string; name: string; phone: string; user_id: string | null; sat_month: string | null };
type Answer = { student_id: string; question_id: string; is_correct: boolean };
type Mark = { student_id: string; session_date: string; status: string };
type TestRow = { id: string; student_id: string; test_name: string; completed_at: string | null; math_score: number | null };
type Note = { id: string; student_id: string; content: string; author_name: string; created_by: string; created_at: string };
type CardsData = { att: Mark[]; hw: Mark[]; tests: TestRow[]; notes: Note[] };
type Kind = 'att' | 'hw';
type Marks = Record<string, Record<string, string>>;
type AttValue = ComponentProps<typeof AttendanceSlider>['value'];
type Alert = ReturnType<typeof alertOf>;

/** A class's sessions: every date with attendance or homework, plus the picked date, oldest first. */
export function sessionDates(marks: { session_date: string }[], picked: string) {
  return [...new Set([picked, ...marks.map(m => m.session_date)])].sort();
}

/** The main site's alert: 3+ absent or sick, or 3+ homework not done. */
export function alertOf(att: string[], hw: string[]) {
  const missedClasses = att.filter(s => s === 'absent' || s === 'sick').length;
  const missedHomework = hw.filter(s => s === 'incomplete').length;
  return { hasAlert: missedClasses >= 3 || missedHomework >= 3, missedClasses, missedHomework };
}

/** "3A/4H", naming only the counts that raised the alert. */
export const alertLabel = ({ missedClasses: a, missedHomework: h }: Alert) =>
  [a >= 3 && `${a}A`, h >= 3 && `${h}H`].filter(Boolean).join('/');

export function DomainBars({ stats }: { stats: DomainStat[] }) {
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

// Same colours as the main site's StudentCard.
const ATT_DOT: Record<string, string> = { present: 'bg-[#03C988]/70', late: 'bg-[#FFDE0B]/70', absent: 'bg-[#FA6363]/70', sick: 'bg-blue-400/70', excused: 'bg-purple-400/70' };
const HW_DOT: Record<string, string> = { completed: 'bg-[#03C988]/70', incomplete: 'bg-[#FA6363]/70' };
const HW_BG: Record<string, string> = { completed: 'bg-[#03C988]/20 border-[#03C988]/40', incomplete: 'bg-[#FA6363]/20 border-[#FA6363]/40' };
const TABLE: Record<Kind, string> = { att: 'tenant_attendance', hw: 'tenant_homework' };
const NOTE_COLS = 'id, student_id, content, author_name, created_by, created_at';
const NO_ALERT = alertOf([], []);
const NONE: Answer[] = [];
// Leaves room for the page header above and the Previous/Next row and the dock below.
const CARD_H = 'h-[calc(100dvh-20rem)] min-h-[26rem]';

// 0103's tables aren't in the generated types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untyped = (table: string) => supabase.from(table as any);
const dayLabel = (d: string) => new Date(`${d}T00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const shortDate = (ts: string) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const monthLabel = (ym: string) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); };
function group<T extends { student_id: string }>(rows: T[] = []) {
  const m: Record<string, T[]> = {};
  for (const r of rows) (m[r.student_id] ||= []).push(r);
  return m;
}
function byDate(rows: Mark[] = []) {
  const m: Marks = {};
  for (const r of rows) (m[r.student_id] ||= {})[r.session_date] = r.status;
  return m;
}
const rowsOf = (dates: string[]) => Array.from({ length: Math.ceil(dates.length / 10) }, (_, i) => dates.slice(i * 10, i * 10 + 10));

function Sessions({ dates, picked, att, hw, onMark, compact }: {
  dates: string[]; picked: string; att: Record<string, string>; hw: Record<string, string>;
  onMark: (kind: Kind, date: string, status: string) => void; compact?: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const today = localDate();
  // Oldest dates come first, so open the list at the picked one.
  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>('[data-picked]');
    if (listRef.current && row) listRef.current.scrollTop = row.offsetTop;
  }, [picked]);
  return (
    <div ref={listRef} className={`relative overflow-y-auto ${compact ? 'space-y-1.5 max-h-[280px]' : 'space-y-2 max-h-[350px]'}`}>
      {dates.map(d => (
        <div key={d} data-picked={d === picked || undefined} data-att={att[d] ?? ''} className={`${compact ? 'pb-1.5' : 'pb-2'} border-b last:border-0`}>
          <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium text-muted-foreground mb-1 flex items-center gap-1.5`}>
            {dayLabel(d)}
            {d === picked && <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{d === today ? 'Today' : 'Selected'}</Badge>}
          </p>
          <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
            <AttendanceSlider value={(att[d] ?? '') as AttValue} onChange={v => onMark('att', d, v)} />
            <Select value={hw[d] ?? ''} onValueChange={v => onMark('hw', d, v)}>
              <SelectTrigger className={`${compact ? 'h-7 text-[11px] w-[70px]' : 'h-8 text-xs w-[112px]'} ${HW_BG[hw[d]] ?? ''}`}>
                <SelectValue placeholder={compact ? 'HW' : 'Homework'} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="completed" className="text-[#03C988] text-xs">✓ Done</SelectItem>
                <SelectItem value="incomplete" className="text-[#FA6363] text-xs">{compact ? '✗ Not' : '✗ Incomplete'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
    </div>
  );
}

function StudentCardView({
  student, index, total, dates, picked, att, hw, tests, notes, answers, meta, alert, canChange, className,
  onMark, onAddNote, onChangeNote,
}: {
  student: CardStudent; index: number; total: number; dates: string[]; picked: string;
  att: Record<string, string>; hw: Record<string, string>; tests: TestRow[]; notes: Note[];
  answers: Answer[]; meta: Record<string, QMeta>; alert: Alert; canChange: (n: Note) => boolean; className: string;
  onMark: (kind: Kind, date: string, status: string) => void;
  onAddNote: (content: string) => Promise<boolean>;
  onChangeNote: (id: string, content: string | null) => Promise<boolean>;
}) {
  const isMobile = useIsMobile();
  const [showInfo, setShowInfo] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const correct = answers.filter(a => a.is_correct).length;
  const domains = useMemo(() => domainStats(answers, meta), [answers, meta]);

  const strip = (marks: Record<string, string>, colors: Record<string, string>) => (
    <div className="flex flex-col gap-px">{rowsOf(dates).map((row, r) => (
      <div key={r} className="flex gap-px rounded overflow-hidden border border-border/50">
        {row.map(d => <div key={d} className={`w-1.5 h-1.5 md:w-2 md:h-2 ${colors[marks[d]] ?? 'bg-muted-foreground/20'}`} title={`${dayLabel(d)}: ${marks[d] || 'unmarked'}`} />)}
      </div>))}</div>
  );

  const sessions = <Sessions dates={dates} picked={picked} att={att} hw={hw} onMark={onMark} compact={isMobile} />;
  const testsPanel = (
    <>
      {tests.length ? (
        <ul className="space-y-1.5">{tests.map(t => (
          <li key={t.id} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate">{t.test_name}</span>
            <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
              {t.completed_at ? `${shortDate(t.completed_at)} · ` : ''}<span className="text-foreground">{t.math_score ?? '—'}</span>/800
            </span>
          </li>))}</ul>
      ) : <p className="text-sm text-muted-foreground">No practice tests yet.</p>}
      <div className="mt-4 pt-3 border-t space-y-3">
        <div className="flex gap-6">
          <div><p className="text-xs text-muted-foreground">Questions</p><p className="font-mono text-xl">{answers.length}</p></div>
          <div><p className="text-xs text-muted-foreground">Accuracy</p><p className="font-mono text-xl">{answers.length ? `${pct(correct, answers.length)}%` : '—'}</p></div>
        </div>
        <DomainBars stats={domains} />
      </div>
    </>
  );

  const addNote = async () => {
    setAdding(true);
    if (await onAddNote(newNote.trim())) setNewNote('');
    setAdding(false);
  };

  return (
    <div onPointerMove={liquidTrack} onPointerLeave={liquidRest}
      className={`relative h-full overflow-y-auto admin-glass-card admin-glass-liquid admin-glass-neutral rounded-3xl transition-all duration-300 ${alert.hasAlert ? 'border-2 !border-destructive' : 'border'} ${className}`}>
      <div className="sticky top-0 z-10 border-b bg-background p-3 md:p-4">
        {student.sat_month && (
          <Badge variant="outline" className="mb-2 gap-1.5 px-2 py-0.5 border-primary/20 bg-primary/10 text-primary text-[10px] md:text-xs font-medium">
            <CalendarClock className="h-3 w-3" />Taking SAT: {monthLabel(student.sat_month)}
          </Badge>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm md:text-lg font-bold truncate">{student.name}</h3>
              {answers.length > 0 && (
                <Badge variant="outline" className="shrink-0 px-1.5 py-0 font-mono text-[10px] md:text-xs font-medium">{pct(correct, answers.length)}% · {answers.length}q</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{index + 1} of {total}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex flex-col gap-1">{strip(att, ATT_DOT)}{strip(hw, HW_DOT)}</div>
            {alert.hasAlert && (
              <Badge variant="outline" className="px-1.5 py-0.5 border-destructive/20 bg-destructive/10 text-destructive text-[9px] md:text-[10px] font-medium whitespace-nowrap">
                ⚠️ {alertLabel(alert)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 md:p-6">
        <Collapsible open={showInfo} onOpenChange={setShowInfo} className="mb-3 md:mb-6 pb-3 md:pb-6 border-b">
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
            <span className="text-xs md:text-sm font-semibold uppercase text-muted-foreground">Student Info</span>
            <span className="flex items-center gap-2">
              {!showInfo && <span className="text-xs text-muted-foreground hidden sm:inline">{student.phone} • {student.user_id ? 'Signed up' : 'Not signed up'}</span>}
              {showInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {([
              ['Name', <p className="text-sm font-medium mt-0.5 truncate">{student.name}</p>],
              ['Phone', <a href={`tel:${student.phone.replace(/[^\d+]/g, '')}`} className="text-sm font-medium mt-0.5 block text-primary truncate">{student.phone}</a>],
              ['Account', <p className="text-sm font-medium mt-0.5">{student.user_id ? 'Signed up' : 'Not signed up'}</p>],
              ['SAT month', <p className="text-sm font-medium mt-0.5">{student.sat_month ? monthLabel(student.sat_month) : '-'}</p>],
            ] as const).map(([label, value]) => (
              <div key={label} className="min-w-0"><p className="text-[10px] md:text-xs uppercase text-muted-foreground">{label}</p>{value}</div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {isMobile ? (
          <Tabs defaultValue="tracking" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-8 mb-3">
              <TabsTrigger value="tracking" className="text-xs"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Attendance</TabsTrigger>
              <TabsTrigger value="tests" className="text-xs"><Trophy className="h-3.5 w-3.5 mr-1.5" />Tests</TabsTrigger>
            </TabsList>
            <TabsContent value="tracking" className="mt-0"><div className="border rounded-lg p-2">{sessions}</div></TabsContent>
            <TabsContent value="tests" className="mt-0"><div className="border rounded-lg p-2 max-h-[280px] overflow-y-auto">{testsPanel}</div></TabsContent>
          </Tabs>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Attendance & Homework</h4>
              {sessions}
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" />Practice Tests</h4>
              <div className="max-h-[350px] overflow-y-auto">{testsPanel}</div>
            </div>
          </div>
        )}

        <Collapsible open={showNotes} onOpenChange={setShowNotes} className="mt-3 md:mt-6 border-t pt-3 md:pt-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
            <span className="flex items-center gap-1.5 text-xs md:text-sm font-semibold uppercase text-muted-foreground">
              <StickyNote className="h-3.5 w-3.5" />Notes {notes.length > 0 && `(${notes.length})`}
            </span>
            {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            <div className="flex gap-1.5">
              <Textarea placeholder="Add a note..." aria-label="New note" value={newNote} onChange={e => setNewNote(e.target.value)} rows={2} maxLength={2000} className="resize-none flex-1 text-sm" />
              <Button onClick={addNote} disabled={!newNote.trim() || adding} size="sm" className="self-end h-8 w-8 p-0" aria-label="Save note"><Send className="h-3.5 w-3.5" /></Button>
            </div>
            {notes.length > 0 && (
              <ScrollArea className="h-[120px] md:h-[160px]">
                <div className="space-y-1.5 pr-2">
                  {notes.map(note => (
                    <div key={note.id} className="p-2 bg-muted/50 rounded-lg text-xs group relative">
                      {editing?.id === note.id ? (
                        <div className="space-y-1.5">
                          <Textarea value={editing.content} onChange={e => setEditing({ id: note.id, content: e.target.value })} rows={2} maxLength={2000} className="resize-none text-xs" autoFocus />
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditing(null)}>Cancel</Button>
                            <Button size="sm" className="h-6 text-[10px]" disabled={!editing.content.trim()}
                              onClick={async () => { if (await onChangeNote(note.id, editing.content.trim())) setEditing(null); }}>Save</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap pr-12 text-xs">{note.content}</p>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                            <span>{note.author_name}</span><span>•</span><span>{shortDate(note.created_at)}</span>
                          </div>
                          {canChange(note) && (
                            // Always visible on phones, where there's no hover.
                            <div className="absolute top-1.5 right-1.5 flex gap-0.5 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-5 w-5" aria-label="Edit note" onClick={() => setEditing({ id: note.id, content: note.content })}><Pencil className="h-2.5 w-2.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-destructive" aria-label="Delete note" onClick={() => onChangeNote(note.id, null)}><Trash2 className="h-2.5 w-2.5" /></Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

/** A class opened from the teacher dashboard: one card per student, like the main site's Students page. */
export default function CenterStudentCards({
  cls, students, practice, date, onDateChange, onBack, onInvite, onLive,
}: {
  cls: CardClass;
  students: CardStudent[] | undefined;
  practice: { attempts: Answer[]; meta: Record<string, QMeta> } | undefined;
  date: string;
  onDateChange: (date: string) => void;
  onBack: () => void; onInvite: () => void; onLive: () => void;
}) {
  const { center, name, userId, role } = useCenter();
  const qc = useQueryClient();
  const isTablet = useIsTablet();
  const [current, setCurrent] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, skipSnaps: false, duration: 20, align: 'center', containScroll: 'trimSnaps' });
  const queue = useRef(new Map<string, Promise<void>>());
  // Marks only flag the dashboard's practice history as old (it can be 30k answers); it reloads once, when this page closes.
  useEffect(() => () => { qc.refetchQueries({ queryKey: ['center-teacher-history', center.id], stale: true }); }, [qc, center.id]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrent(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect).on('reInit', onSelect);
    return () => { emblaApi.off('select', onSelect).off('reInit', onSelect); };
  }, [emblaApi]);

  const ids = useMemo(() => students?.map(s => s.id) ?? [], [students]);
  const key = ['center-class-cards', center.id, cls.id, ids.join(',')];
  const { data, isError } = useQuery({
    enabled: ids.length > 0,
    queryKey: key,
    queryFn: async (): Promise<CardsData> => {
      const marks = (table: string) => allPages(p => untyped(table).select('student_id, session_date, status')
        .eq('class_id', cls.id).order('session_date').order('id').range(p, p + 999)) as unknown as Promise<Mark[]>;
      // 0103 may not be live yet: its reads come back empty instead of failing the page.
      const quiet = <T,>(read: PromiseLike<{ data: unknown; error: unknown }>) =>
        Promise.resolve(read).then(({ data, error }) => (error ? [] : data ?? []) as T[], () => [] as T[]);
      const [att, hw, tests, notes] = await Promise.all([
        marks('tenant_attendance'),
        marks('tenant_homework').catch(() => [] as Mark[]),
        // No paper column: it isn't granted.
        quiet<TestRow>(supabase.from('tenant_test_attempts').select('id, student_id, test_name, completed_at, math_score')
          .in('student_id', ids).eq('status', 'completed').order('completed_at', { ascending: false })),
        quiet<Note>(untyped('tenant_student_notes').select(NOTE_COLS).in('student_id', ids).order('created_at', { ascending: false })),
      ]);
      return { att, hw, tests, notes };
    },
  });

  const attBy = useMemo(() => byDate(data?.att), [data]);
  const hwBy = useMemo(() => byDate(data?.hw), [data]);
  const testsBy = useMemo(() => group(data?.tests), [data]);
  const notesBy = useMemo(() => group(data?.notes), [data]);
  const answersBy = useMemo(() => group(practice?.attempts), [practice]);
  const dates = useMemo(() => sessionDates([...(data?.att ?? []), ...(data?.hw ?? [])], date), [data, date]);
  const alerts = useMemo(() => Object.fromEntries(ids.map(id =>
    [id, alertOf(Object.values(attBy[id] ?? {}), Object.values(hwBy[id] ?? {}))])), [ids, attBy, hwBy]);
  const sidebarStudents = useMemo(() => (students ?? []).map(s => ({ id: s.id, first_name: s.name, last_name: '', phone: s.phone })), [students]);
  // The sidebar draws the main site's 10 + 5 strip, so it gets the last 15 sessions.
  const sidebarDots = (by: Marks) => (id: string) =>
    dates.slice(-15).map((d, i) => ({ session_number: i + 1, status: (by[id]?.[d] ?? null) as never }));

  const mark = (kind: Kind, studentId: string, day: string, status: string) => {
    qc.setQueryData<CardsData>(key, old => old && {
      ...old,
      [kind]: [...old[kind].filter(r => !(r.student_id === studentId && r.session_date === day)), ...(status ? [{ student_id: studentId, session_date: day, status }] : [])],
    });
    const match = { student_id: studentId, class_id: cls.id, session_date: day };
    const cell = `${kind}|${studentId}|${day}`;
    // One write at a time per cell, so quick taps land in the order they were made.
    const run = (queue.current.get(cell) ?? Promise.resolve()).then(async () => {
      const { error } = status
        ? await untyped(TABLE[kind]).upsert({ ...match, institution_id: center.id, status }, { onConflict: 'student_id,class_id,session_date' })
        // Clearing deletes the row: an empty status fails the CHECK.
        : await untyped(TABLE[kind]).delete().match(match);
      if (error) {
        toast.error(`Could not save ${kind === 'att' ? 'attendance' : 'homework'}`);
        qc.invalidateQueries({ queryKey: key });
        return;
      }
      qc.invalidateQueries({ queryKey: ['center-teacher-att', center.id] });
      qc.invalidateQueries({ queryKey: ['center-teacher-history', center.id], refetchType: 'none' });
    });
    queue.current.set(cell, run);
  };

  const addNote = async (studentId: string, content: string) => {
    const { data: note, error } = await untyped('tenant_student_notes')
      .insert({ institution_id: center.id, student_id: studentId, class_id: cls.id, content, author_name: name.slice(0, 120) })
      .select(NOTE_COLS).single();
    if (error) { toast.error('Could not save note'); return false; }
    qc.setQueryData<CardsData>(key, old => old && { ...old, notes: [note as unknown as Note, ...old.notes] });
    toast.success('Note saved');
    return true;
  };

  /** Edits a note, or deletes it when content is null. */
  const changeNote = async (id: string, content: string | null) => {
    const notes = untyped('tenant_student_notes');
    const { data: rows, error } = await (content === null ? notes.delete() : notes.update({ content, updated_at: new Date().toISOString() }))
      .eq('id', id).select('id');
    // Someone else's note: the database skips it without an error, so check that a row changed.
    if (error || !rows?.length) {
      toast.error(error ? `Could not ${content === null ? 'delete' : 'update'} note` : 'Only the author or a center admin can change this note');
      return false;
    }
    qc.setQueryData<CardsData>(key, old => old && {
      ...old, notes: content === null ? old.notes.filter(n => n.id !== id) : old.notes.map(n => (n.id === id ? { ...n, content } : n)),
    });
    toast.success(content === null ? 'Note deleted' : 'Note updated');
    return true;
  };

  // Phones: back, class and the icon buttons on one line, date and join code on the next.
  const header = (
    <div className="flex flex-wrap items-center gap-2 p-2 md:p-3 admin-glass rounded-xl border">
      <Button variant="ghost" size="sm" className="!shadow-none" onClick={onBack} aria-label="All classes"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">All classes</span></Button>
      <div className="min-w-0 flex-1 basis-32">
        <h2 className="font-semibold truncate">{cls.name}</h2>
        <p className="text-xs text-muted-foreground truncate">{cls.schedule || 'No schedule set'}{cls.starts_on ? ` · started ${cls.starts_on}` : ''}</p>
      </div>
      <div className="order-last sm:order-none flex items-center gap-2">
        <Input type="date" aria-label="Session date" value={date} onChange={e => e.target.value && onDateChange(e.target.value)} className="h-9 w-40 border-0 bg-transparent text-sm" />
        <Button variant="outline" size="sm" className="rounded-full font-mono" onClick={() => { navigator.clipboard.writeText(cls.join_code); toast.success('Join code copied'); }}>
          <Copy className="h-3.5 w-3.5" />{cls.join_code}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onInvite} aria-label="Invite"><QrCode className="h-4 w-4" /><span className="hidden sm:inline">Invite</span></Button>
        <Button size="sm" onClick={onLive} aria-label="Start live session"><Radio className="h-4 w-4" /><span className="hidden sm:inline">Start live session</span></Button>
      </div>
    </div>
  );

  if (students && !students.length) return (
    <div className="space-y-4">{header}
      <div className="admin-glass-card rounded-3xl border py-12 text-center text-muted-foreground text-sm">No students yet. Share the class QR code to enroll them.</div>
    </div>
  );
  if (isError) return <div className="space-y-4">{header}<p className="text-sm text-muted-foreground">Could not load this class. Try again in a moment.</p></div>;
  if (!students || !data) return <div className="space-y-4">{header}<div className={CARD_H}><StudentCardsLoadingSkeleton /></div></div>;

  return (
    <div className="space-y-4">
      {header}
      <div className="flex gap-4">
        <div className={`hidden lg:block shrink-0 overflow-hidden rounded-3xl border ${CARD_H}`}>
          <StudentSidebar
            students={sidebarStudents}
            currentIndex={current}
            onSelectStudent={i => { setCurrent(i); emblaApi?.scrollTo(i); }}
            batch={{ schedule: cls.schedule || 'No schedule set', start_date: cls.starts_on ? `${cls.starts_on}T00:00` : cls.created_at }}
            courseType="SAT"
            getStudentAlertStatus={id => alerts[id] ?? NO_ALERT}
            getStudentAttendance={sidebarDots(attBy)}
            getStudentHomework={sidebarDots(hwBy)}
          />
        </div>

        <div className="flex-1 min-w-0 overflow-hidden pb-2">
          <div className="w-full max-w-4xl mx-auto">
            <div ref={emblaRef} className={`overflow-visible touch-pan-y ${CARD_H}`} style={{ touchAction: 'pan-y' }}>
              <div className="flex h-full">
                {students.map((s, i) => {
                  const active = i === current;
                  return (
                    <div key={s.id} data-student-card={i} data-active={active || undefined}
                      onClick={() => { if (!active) emblaApi?.scrollTo(i); }}
                      className="flex-[0_0_94%] sm:flex-[0_0_90%] md:flex-[0_0_86%] lg:flex-[0_0_82%] min-w-0 px-1 md:px-2 h-full transition-all duration-300 cursor-pointer group"
                      // 'none', not blur(0): any filter would cut the glass off from the page behind it.
                      style={{ transform: active ? 'scale(1)' : 'scale(0.92)', opacity: active ? 1 : 0.4, filter: active ? 'none' : 'blur(0.8px)' }}>
                      <StudentCardView
                        student={s} index={i} total={students.length} dates={dates} picked={date}
                        att={attBy[s.id] ?? {}} hw={hwBy[s.id] ?? {}} tests={testsBy[s.id] ?? []} notes={notesBy[s.id] ?? []}
                        answers={answersBy[s.id] ?? NONE} meta={practice?.meta ?? {}} alert={alerts[s.id] ?? NO_ALERT}
                        canChange={n => n.created_by === userId || role === 'center_admin'}
                        className={active ? '' : 'pointer-events-none group-hover:scale-105'}
                        onMark={(kind, day, status) => mark(kind, s.id, day, status)}
                        onAddNote={content => addNote(s.id, content)}
                        onChangeNote={changeNote}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tablets swipe, like the main site. */}
            {!isTablet && (
              <div className="flex justify-center gap-2 md:gap-4 mt-3 md:mt-6">
                <Button variant="outline" onClick={() => emblaApi?.scrollPrev()} disabled={current === 0} className="min-w-[120px] md:min-w-[160px]">
                  <ArrowLeft className="h-4 w-4 mr-2" />Previous
                </Button>
                <Button onClick={() => emblaApi?.scrollNext()} disabled={current === students.length - 1} className="min-w-[120px] md:min-w-[160px]">
                  Next<ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
