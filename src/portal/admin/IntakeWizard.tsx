import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Copy, Plus, X } from 'lucide-react';
import QRCode from 'react-qr-code';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Choice } from '@/components/admin/batches/BatchWizard';
import { ScheduleTemplatesDialog, type ScheduleStore, type ScheduleTemplate } from '@/components/admin/batches/ScheduleTemplatesDialog';
import { formatScheduleDisplay, type TimeSlot } from '@/components/admin/ScheduleBuilder';
import { useCenter } from '../centerContext';
import { useRefreshCenter, type CenterAdminData } from './useCenterAdminData';
import { checkStudentRows, failedRowsText, type ImportRow } from './studentImport';
import { joinUrl, suggestBatchName } from './centerIntake';

/** The center's saved schedules (tenant_schedule_templates, 0104): one list, no Math/English split. */
export function centerScheduleStore(institutionId: string): ScheduleStore {
  const table = () => supabase.from('tenant_schedule_templates' as any);
  return {
    subjects: false,
    list: async () => {
      const { data } = await table().select('id, name, slots').eq('institution_id', institutionId).order('name');
      return ((data ?? []) as unknown as { id: string; name: string; slots: TimeSlot[] }[]).map(t => ({ id: t.id, name: t.name, subject: 'sat', schedule_data: t.slots }));
    },
    save: async (name, _subject, slots) => {
      const { data, error } = await table().insert({ institution_id: institutionId, name, slots }).select('id').single();
      return error ? { error: error.message } : { id: (data as unknown as { id: string }).id };
    },
    remove: async id => (await table().delete().eq('id', id)).error?.message ?? null,
  };
}

type Cls = CenterAdminData['classes'][number];

/** Full-screen, step-by-step "New batch", the same flow as the Tsetsegs batch wizard. */
export function IntakeWizard({ open, onOpenChange, data }: { open: boolean; onOpenChange: (o: boolean) => void; data: CenterAdminData }) {
  const { center } = useCenter();
  const refresh = useRefreshCenter();
  const store = useMemo(() => centerScheduleStore(center.id), [center.id]);
  const [step, setStep] = useState(0);
  const [teacherId, setTeacherId] = useState<string | null | undefined>(undefined);
  const [startsOn, setStartsOn] = useState('');
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [schedule, setSchedule] = useState<ScheduleTemplate | null>(null);
  const [newSchedule, setNewSchedule] = useState(false);
  const [studentText, setStudentText] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ cls: Cls; added: number; failed: ImportRow[] } | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0); setTeacherId(undefined); setStartsOn(''); setSchedule(null); setStudentText(''); setName(''); setCreated(null);
    store.list().then(setTemplates);
  }, [open, store]);

  const teachers = data.members.filter(m => m.active);
  const teacherName = teachers.find(t => t.id === teacherId)?.display_name ?? null;
  const rows = useMemo(() => checkStudentRows(studentText, { classes: [], students: data.students, defaultClassId: null }), [studentText, data.students]);
  const bad = rows.filter(r => r.error);

  const steps = [
    { title: 'Who teaches it?', valid: teacherId !== undefined },
    { title: 'When does it start?', valid: !!startsOn },
    { title: 'Pick the schedule', valid: true },
    { title: 'Add the students', valid: bad.length === 0 },
    { title: 'Check everything', valid: !!name.trim() },
  ];
  const cur = steps[step];
  const last = step === steps.length - 1;
  const next = () => {
    if (step === steps.length - 2 && !name.trim()) setName(suggestBatchName(startsOn, teacherName));
    setStep(s => s + 1);
  };

  const create = async () => {
    setSaving(true);
    const { data: cls, error } = await supabase.from('tenant_classes').insert({
      institution_id: center.id, name: name.trim(), schedule: schedule ? formatScheduleDisplay(schedule.schedule_data) : '',
      starts_on: startsOn, teacher_member_id: teacherId ?? null,
    }).select().single();
    if (error) { setSaving(false); return toast.error(error.message); }
    // Same insert as Import students, a few at a time; failures are listed so nothing is silently dropped.
    const failed: ImportRow[] = []; let added = 0; let i = 0;
    const worker = async () => {
      while (i < rows.length) {
        const r = rows[i++];
        const { error: e } = await supabase.from('tenant_students').insert({ institution_id: center.id, name: r.name, phone: r.phone, class_id: cls.id });
        if (e) failed.push({ ...r, error: e.code === '23505' ? 'That phone number is already registered.' : e.message }); else added++;
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    setSaving(false); refresh();
    setCreated({ cls, added, failed });
  };

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="flex justify-between gap-6 py-2.5 text-sm"><span className="text-muted-foreground shrink-0">{k}</span><span className="text-right">{v}</span></div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={o => !saving && onOpenChange(o)}>
        <DialogContent className="max-w-none w-screen h-[100dvh] sm:rounded-none border-0 p-0 flex flex-col gap-0 [&>button]:hidden">
          <header className="flex items-center gap-4 px-4 sm:px-6 h-14 border-b">
            <Button size="icon" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} aria-label="Close"><X className="h-4 w-4" /></Button>
            <DialogTitle className="text-sm font-medium">New batch</DialogTitle>
            <div className="flex-1 flex gap-1.5 max-w-md mx-auto">
              {steps.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full ${created || i <= step ? 'bg-foreground' : 'bg-muted'}`} />)}
            </div>
            <span className="text-xs text-muted-foreground font-mono">{created ? 'Done' : `${step + 1}/${steps.length}`}</span>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-8">
              {created ? (
                <div className="space-y-6">
                  <h2 className="text-3xl font-semibold font-chillax">{created.cls.name} is ready</h2>
                  <p className="text-sm text-muted-foreground">
                    {created.added ? `${created.added} student${created.added === 1 ? '' : 's'} added. ` : ''}
                    Share this link or QR code. Students who use it join this batch right away.
                  </p>
                  {created.failed.length > 0 && (
                    <div className="rounded-xl border border-destructive/40 p-4 space-y-2 text-sm">
                      <p>{created.failed.length} student{created.failed.length === 1 ? ' was' : 's were'} not added: {created.failed.slice(0, 3).map(r => `${r.name} (${r.error})`).join(', ')}{created.failed.length > 3 ? '…' : ''}</p>
                      <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(failedRowsText(created.failed)); toast.success('Rows copied'); }}><Copy className="h-4 w-4" />Copy rows that failed</Button>
                    </div>
                  )}
                  <div className="w-fit rounded-md border bg-white p-2"><QRCode value={joinUrl(created.cls.join_code)} size={200} level="H" title={`QR code for ${created.cls.name} sign-up`} /></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-xs break-all rounded-md border p-2">{joinUrl(created.cls.join_code)}</p>
                    <Button variant="outline" onClick={() => { navigator.clipboard.writeText(joinUrl(created.cls.join_code)); toast.success('Link copied'); }}><Copy className="h-4 w-4" />Copy link</Button>
                  </div>
                </div>
              ) : <>
                <h2 className="text-3xl font-semibold font-chillax">{cur.title}</h2>

                {step === 0 && (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {teachers.map(t => <Choice key={t.id} active={teacherId === t.id} onClick={() => setTeacherId(t.id)} title={t.display_name} sub={t.role === 'center_admin' ? 'Admin' : 'Teacher'} />)}
                      <Choice active={teacherId === null} onClick={() => setTeacherId(null)} title="Assign later" />
                    </div>
                    {!data.members.some(m => m.role === 'teacher') && <p className="text-sm text-muted-foreground">No teachers yet. Add them on the Team page.</p>}
                  </div>
                )}

                {step === 1 && <div className="space-y-2"><p className="text-sm font-medium">Start date</p><Input type="date" aria-label="Start date" value={startsOn} onChange={e => setStartsOn(e.target.value)} className="max-w-xs" /></div>}

                {step === 2 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">Optional. You can add it later.</p>
                      <Button size="sm" variant="outline" onClick={() => setNewSchedule(true)}><Plus className="h-3.5 w-3.5" />New schedule</Button>
                    </div>
                    {templates.length === 0 ? <p className="text-sm text-muted-foreground">No saved schedules yet. Create one.</p> : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {templates.map(t => <Choice key={t.id} active={schedule?.id === t.id} onClick={() => setSchedule(schedule?.id === t.id ? null : t)} title={t.name} sub={formatScheduleDisplay(t.schedule_data)} />)}
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-3">
                    <Textarea aria-label="Students" rows={10} value={studentText} onChange={e => setStudentText(e.target.value)} placeholder={'Bat-Erdene, 99112233\nSaraa, 88001122'} className="font-mono text-sm" />
                    <p className="text-sm text-muted-foreground">Optional. One student per line: <span className="font-mono">name, phone</span>. You can paste from Excel or Google Sheets. Or skip this and share the sign-up link at the end.</p>
                    {rows.length > 0 && <p className="text-sm"><span className="font-mono">{rows.length - bad.length}</span> students ready{bad.length > 0 && <span className="text-destructive"> · {bad.length} {bad.length === 1 ? 'line needs' : 'lines need'} fixing: {bad.slice(0, 3).map(r => `${r.name || r.rawPhone || '?'} (${r.error})`).join(', ')}</span>}</p>}
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <div className="space-y-2"><p className="text-sm font-medium">Batch name</p><Input aria-label="Batch name" value={name} onChange={e => setName(e.target.value)} maxLength={80} /></div>
                    <div className="admin-glass-card rounded-xl border px-5 divide-y">
                      <Row k="Teacher" v={teacherName ?? 'Assign later'} />
                      <Row k="Start date" v={new Date(`${startsOn}T00:00`).toLocaleDateString('en', { dateStyle: 'long' })} />
                      <Row k="Schedule" v={schedule ? <><span>{schedule.name}</span><span className="block text-xs text-muted-foreground">{formatScheduleDisplay(schedule.schedule_data)}</span></> : '—'} />
                      <Row k="Students" v={rows.length ? <><span className="font-mono">{rows.length}</span><span className="block text-xs text-muted-foreground">{rows.slice(0, 4).map(s => s.name).join(', ')}{rows.length > 4 ? '…' : ''}</span></> : 'None yet, they can use the sign-up link'} />
                    </div>
                  </div>
                )}
              </>}
            </div>
          </main>

          <footer className="flex items-center justify-between px-4 sm:px-6 h-16 border-t">
            {created ? <span /> : <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0 || saving}><ArrowLeft className="h-4 w-4" />Back</Button>}
            {created
              ? <Button onClick={() => onOpenChange(false)}>Done</Button>
              : last
                ? <Button onClick={create} disabled={saving || !cur.valid}>{saving ? 'Creating…' : 'Create batch'}</Button>
                : <Button onClick={next} disabled={!cur.valid}>Next<ArrowRight className="h-4 w-4" /></Button>}
          </footer>
        </DialogContent>
      </Dialog>
      <ScheduleTemplatesDialog open={newSchedule} onOpenChange={setNewSchedule} startInCreate store={store}
        onSaved={t => { store.list().then(setTemplates); setSchedule(t); setNewSchedule(false); }} />
    </>
  );
}
