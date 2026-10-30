import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, X } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAdminCohort } from '@/contexts/AdminCohortContext';
import { checkScheduleOverlap, formatScheduleDisplay, type TimeSlot } from '../ScheduleBuilder';
import { fetchScheduleTemplates, ScheduleTemplatesDialog, type ScheduleTemplate } from './ScheduleTemplatesDialog';

const ROOMS = ['1114 (11th floor)', '1105 (11th floor)', '1011 (10th floor)', '905 (9th floor)', 'Online'];
const studentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().regex(/^[0-9+\-\s()]+$/).max(20),
});
type Course = 'SAT' | 'IELTS';

export function parseStudentList(text: string) {
  const ok: { name: string; phone: string }[] = []; const bad: string[] = [];
  text.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    const m = line.match(/^(?:\d+\.\s*)?(.+?)\s*-\s*(.+)$/);
    const v = m && studentSchema.safeParse({ name: m[1], phone: m[2] });
    if (v && v.success) ok.push({ name: v.data.name, phone: v.data.phone }); else bad.push(line);
  });
  return { ok, bad };
}

const uid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export function Choice({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub?: string }) {
  return (
    <button type="button" onClick={onClick} className={`admin-glass-card text-left rounded-xl border p-4 transition ${active ? 'ring-2 ring-foreground/70 border-foreground/40' : 'hover:border-foreground/30'}`}>
      <div className="flex items-center justify-between gap-2"><span className="font-medium">{title}</span>{active && <Check className="h-4 w-4" />}</div>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </button>
  );
}

export function BatchWizard({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (batchId: string) => void }) {
  const { cohort } = useAdminCohort();
  const [step, setStep] = useState(0);
  const [course, setCourse] = useState<Course>('SAT');
  const [intl, setIntl] = useState(cohort === 'intl');
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [room, setRoom] = useState('');
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [math, setMath] = useState<{ name: string; slots: TimeSlot[] } | null>(null);
  const [english, setEnglish] = useState<{ name: string; slots: TimeSlot[] } | null>(null);
  const [newSchedule, setNewSchedule] = useState<null | 'math' | 'english'>(null);
  const [studentText, setStudentText] = useState('');
  const [fb, setFb] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0); setCourse('SAT'); setIntl(cohort === 'intl'); setTeacherIds([]); setStartDate(''); setRoom('');
    setMath(null); setEnglish(null); setStudentText(''); setFb('');
    supabase.from('teachers').select('id, name').order('name').then(({ data }) => setTeachers(data ?? []));
    fetchScheduleTemplates().then(setTemplates);
  }, [open, cohort]);

  const students = useMemo(() => parseStudentList(studentText), [studentText]);
  const teacherName = teacherIds.map(id => teachers.find(t => t.id === id)?.name ?? id).join(', ');
  const batchName = startDate ? `(${new Date(startDate).toLocaleString('en', { month: 'long' })} ${new Date(startDate).getFullYear()} Intake) - ${teacherName}` : '';
  const overlap = course === 'SAT' && math && english && checkScheduleOverlap(math.slots, english.slots);

  const steps = [
    { title: 'What course is this batch?', valid: true },
    { title: course === 'IELTS' ? 'Who teaches it?' : 'Who teaches it?', valid: teacherIds.length > 0 },
    { title: 'When and where does it start?', valid: !!startDate && !!room },
    { title: 'Pick the schedule', valid: (course === 'IELTS' ? !!english : !!(math || english)) && !overlap },
    { title: 'Add the students', valid: students.ok.length > 0 && students.bad.length === 0 },
    { title: 'Check everything', valid: true },
  ];
  const cur = steps[step];
  const last = step === steps.length - 1;

  const create = async () => {
    setSaving(true);
    try {
      const mathSlots = course === 'IELTS' ? [] : math?.slots ?? [];
      const engSlots = english?.slots ?? [];
      const schedule = [mathSlots.length && `(Math) ${formatScheduleDisplay(mathSlots)}`, engSlots.length && `(English) ${formatScheduleDisplay(engSlots)}`].filter(Boolean).join(' + ');
      const { data: batch, error } = await supabase.from('batches').insert({
        teacher: teacherName, room, schedule, start_date: startDate, fb_group_link: fb, unique_link_id: uid(), batch_name: batchName,
        course_type: course, is_international: intl,
        math_schedule: course === 'IELTS' ? null : JSON.parse(JSON.stringify(mathSlots)),
        english_schedule: JSON.parse(JSON.stringify(engSlots)),
      }).select().single();
      if (error) throw error;
      const { error: sErr } = await supabase.from('students').insert(students.ok.map(s => ({ ...s, batch_id: batch.id, unique_link_id: uid(), accessed: false })));
      if (sErr) throw sErr;
      toast.success(`Batch created with ${students.ok.length} students`);
      onOpenChange(false);
      onCreated(batch.id);
    } catch (e: any) {
      toast.error(e.message ?? 'Could not create the batch');
    } finally { setSaving(false); }
  };

  const toggleTeacher = (id: string) => setTeacherIds(ids => course === 'IELTS' ? (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]) : [id]);

  const schedulePicker = (sub: 'math' | 'english', value: typeof math, set: (v: typeof math) => void) => {
    const list = templates.filter(t => t.subject === sub);
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium capitalize">{sub}{course === 'SAT' && sub === 'english' && <span className="text-muted-foreground font-normal"> · optional</span>}</p>
          <Button size="sm" variant="outline" onClick={() => setNewSchedule(sub)}><Plus className="h-3.5 w-3.5" />New schedule</Button>
        </div>
        {list.length === 0 ? <p className="text-sm text-muted-foreground">No saved {sub} schedules yet. Create one.</p> : (
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map(t => <Choice key={t.id} active={value?.name === t.name} onClick={() => set(value?.name === t.name ? null : { name: t.name, slots: t.schedule_data })} title={t.name} sub={formatScheduleDisplay(t.schedule_data)} />)}
          </div>
        )}
      </div>
    );
  };

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="flex justify-between gap-6 py-2.5 text-sm"><span className="text-muted-foreground shrink-0">{k}</span><span className="text-right">{v}</span></div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-none w-screen h-screen sm:rounded-none border-0 p-0 flex flex-col gap-0 [&>button]:hidden">
          <header className="flex items-center gap-4 px-6 h-14 border-b">
            <Button size="icon" variant="ghost" onClick={() => onOpenChange(false)} aria-label="Close"><X className="h-4 w-4" /></Button>
            <DialogTitle className="text-sm font-medium">New batch</DialogTitle>
            <div className="flex-1 flex gap-1.5 max-w-md mx-auto">
              {steps.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-foreground' : 'bg-muted'}`} />)}
            </div>
            <span className="text-xs text-muted-foreground font-mono">{step + 1}/{steps.length}</span>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
              <h2 className="text-3xl font-semibold font-chillax">{cur.title}</h2>

              {step === 0 && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Choice active={course === 'SAT'} onClick={() => { setCourse('SAT'); setTeacherIds(ids => ids.slice(0, 1)); }} title="SAT" sub="Math with optional English" />
                    <Choice active={course === 'IELTS'} onClick={() => { setCourse('IELTS'); setMath(null); }} title="IELTS" sub="English only, can have several teachers" />
                  </div>
                  <label className="flex items-start justify-between gap-4 rounded-xl border p-4">
                    <span><span className="font-medium text-sm">International class</span><span className="block text-xs text-muted-foreground mt-0.5">Students get their own leaderboard, sprints and challenges, separate from Mongolian students.</span></span>
                    <Switch checked={intl} onCheckedChange={setIntl} />
                  </label>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {course === 'IELTS' && <p className="sm:col-span-2 text-sm text-muted-foreground">You can pick more than one.</p>}
                  {teachers.map(t => <Choice key={t.id} active={teacherIds.includes(t.id)} onClick={() => toggleTeacher(t.id)} title={t.name} />)}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2"><p className="text-sm font-medium">Start date</p><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="max-w-xs" /></div>
                  <div className="space-y-2"><p className="text-sm font-medium">Room</p>
                    <div className="grid gap-2 sm:grid-cols-3">{ROOMS.map(r => <Choice key={r} active={room === r} onClick={() => setRoom(r)} title={r} />)}</div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  {course === 'SAT' && schedulePicker('math', math, setMath)}
                  {schedulePicker('english', english, setEnglish)}
                  {overlap && <p className="text-sm text-destructive">Math and English times overlap. Pick a different one.</p>}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <Textarea rows={10} value={studentText} onChange={e => setStudentText(e.target.value)} placeholder={'1. Bat-Erdene - 88112233\n2. Saraa - 99001122'} className="font-mono text-sm" />
                  <p className="text-sm text-muted-foreground">One student per line: <span className="font-mono">Name - Phone</span>.</p>
                  {studentText.trim() && <p className="text-sm"><span className="font-mono">{students.ok.length}</span> students ready{students.bad.length > 0 && <span className="text-destructive"> · {students.bad.length} lines need fixing: {students.bad.slice(0, 3).join(' | ')}</span>}</p>}
                  <div className="space-y-2 pt-4"><p className="text-sm font-medium">Facebook group link <span className="text-muted-foreground font-normal">· optional</span></p><Input type="url" value={fb} onChange={e => setFb(e.target.value)} placeholder="https://facebook.com/groups/..." /></div>
                </div>
              )}

              {step === 5 && (
                <div className="admin-glass-card rounded-xl border px-5 divide-y">
                  <Row k="Batch name" v={batchName} />
                  <Row k="Course" v={`${course}${intl ? ' · International' : ''}`} />
                  <Row k={teacherIds.length > 1 ? 'Teachers' : 'Teacher'} v={teacherName} />
                  <Row k="Start date" v={new Date(startDate).toLocaleDateString('en', { dateStyle: 'long' })} />
                  <Row k="Room" v={room} />
                  {course === 'SAT' && <Row k="Math schedule" v={math ? <><span>{math.name}</span><span className="block text-xs text-muted-foreground">{formatScheduleDisplay(math.slots)}</span></> : '—'} />}
                  <Row k="English schedule" v={english ? <><span>{english.name}</span><span className="block text-xs text-muted-foreground">{formatScheduleDisplay(english.slots)}</span></> : '—'} />
                  <Row k="Students" v={<><span className="font-mono">{students.ok.length}</span><span className="block text-xs text-muted-foreground">{students.ok.slice(0, 4).map(s => s.name).join(', ')}{students.ok.length > 4 ? '…' : ''}</span></>} />
                  <Row k="Facebook group" v={fb || '—'} />
                </div>
              )}
            </div>
          </main>

          <footer className="flex items-center justify-between px-6 h-16 border-t">
            <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0}><ArrowLeft className="h-4 w-4" />Back</Button>
            {last
              ? <Button onClick={create} disabled={saving}>{saving ? 'Creating…' : 'Create batch'}</Button>
              : <Button onClick={() => setStep(s => s + 1)} disabled={!cur.valid}>Next<ArrowRight className="h-4 w-4" /></Button>}
          </footer>
        </DialogContent>
      </Dialog>
      <ScheduleTemplatesDialog
        open={!!newSchedule} onOpenChange={o => !o && setNewSchedule(null)} startInCreate defaultSubject={newSchedule ?? 'math'}
        onSaved={t => { fetchScheduleTemplates().then(setTemplates); (t.subject === 'math' ? setMath : setEnglish)({ name: t.name, slots: t.schedule_data }); setNewSchedule(null); }}
      />
    </>
  );
}
