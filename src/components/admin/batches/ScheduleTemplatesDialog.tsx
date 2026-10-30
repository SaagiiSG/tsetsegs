import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatScheduleDisplay, type TimeSlot } from '../ScheduleBuilder';

export interface ScheduleTemplate { id: string; name: string; subject: string; schedule_data: TimeSlot[] }

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const TIMES = Array.from({ length: 85 }, (_, i) => { const m = 480 + i * 10; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; });

export async function fetchScheduleTemplates(): Promise<ScheduleTemplate[]> {
  const { data } = await supabase.from('schedule_templates').select('*').order('name');
  return (data ?? []).map(t => ({ id: t.id, name: t.name, subject: t.subject, schedule_data: (t.schedule_data as unknown as TimeSlot[]) ?? [] }));
}

/** Where saved schedules live. Main site: schedule_templates, split by subject. Centers pass their own (one list). */
export type ScheduleStore = {
  subjects: boolean;
  list: () => Promise<ScheduleTemplate[]>;
  save: (name: string, subject: string, slots: TimeSlot[]) => Promise<{ id?: string; error?: string }>;
  remove: (id: string) => Promise<string | null>;
};

const mainStore: ScheduleStore = {
  subjects: true,
  list: fetchScheduleTemplates,
  save: async (name, subject, slots) => {
    const { data, error } = await supabase.from('schedule_templates').insert([{ name, subject, schedule_data: JSON.parse(JSON.stringify(slots)), is_global: true }]).select().single();
    return error ? { error: error.message } : { id: data.id };
  },
  remove: async id => (await supabase.from('schedule_templates').delete().eq('id', id)).error?.message ?? null,
};

export function ScheduleTemplatesDialog({ open, onOpenChange, startInCreate = false, defaultSubject = 'math', onSaved, store = mainStore }: {
  open: boolean; onOpenChange: (o: boolean) => void; startInCreate?: boolean; defaultSubject?: 'math' | 'english'; onSaved?: (t: ScheduleTemplate) => void; store?: ScheduleStore;
}) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [creating, setCreating] = useState(startInCreate);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState<'math' | 'english'>(defaultSubject);
  const [slots, setSlots] = useState<TimeSlot[]>([{ day: 'monday', start_time: '16:40', end_time: '18:30' }]);
  const [saving, setSaving] = useState(false);

  const load = () => store.list().then(setTemplates);
  useEffect(() => { if (open) { load(); setCreating(startInCreate); setSubject(defaultSubject); } }, [open, startInCreate, defaultSubject]);

  const save = async () => {
    if (!name.trim()) return toast.error('Give the schedule a name');
    if (slots.some(s => s.start_time >= s.end_time)) return toast.error('Each class must end after it starts');
    setSaving(true);
    const { id, error } = await store.save(name.trim(), subject, slots);
    setSaving(false);
    if (error || !id) return toast.error(error ?? 'Could not save the schedule');
    toast.success('Schedule saved');
    const t = { id, name: name.trim(), subject, schedule_data: slots };
    setName(''); setSlots([{ day: 'monday', start_time: '16:40', end_time: '18:30' }]); setCreating(false); load();
    onSaved?.(t);
  };
  const remove = async (id: string) => {
    const error = await store.remove(id);
    if (error) return toast.error(error);
    load();
  };
  const setSlot = (i: number, patch: Partial<TimeSlot>) => setSlots(s => s.map((x, j) => j === i ? { ...x, ...patch } : x));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{creating ? 'New schedule' : 'Saved schedules'}</DialogTitle>
          <DialogDescription>{creating ? 'Pick the days and times this class meets.' : 'Reusable schedules you can pick when creating a batch.'}</DialogDescription>
        </DialogHeader>

        {creating ? (
          <div className="space-y-4">
            <div className={store.subjects ? 'grid grid-cols-[1fr_auto] gap-3' : ''}>
              <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mon/Wed/Fri evening" /></div>
              {store.subjects && <div className="space-y-1.5"><Label>Subject</Label>
                <Select value={subject} onValueChange={v => setSubject(v as 'math' | 'english')}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="math">Math</SelectItem><SelectItem value="english">English</SelectItem></SelectContent>
                </Select>
              </div>}
            </div>
            <div className="space-y-2">
              {slots.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={s.day} onValueChange={v => setSlot(i, { day: v })}>
                    <SelectTrigger className="w-36 capitalize"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
                  </Select>
                  {(['start_time', 'end_time'] as const).map(k => (
                    <Select key={k} value={s[k]} onValueChange={v => setSlot(i, { [k]: v })}>
                      <SelectTrigger className="w-24 font-mono"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">{TIMES.map(t => <SelectItem key={t} value={t} className="font-mono">{t}</SelectItem>)}</SelectContent>
                    </Select>
                  ))}
                  <Button size="icon" variant="ghost" aria-label="Remove class time" disabled={slots.length === 1} onClick={() => setSlots(x => x.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setSlots(x => [...x, { ...x[x.length - 1] }])}><Plus className="h-3.5 w-3.5" />Add class time</Button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => startInCreate ? onOpenChange(false) : setCreating(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save schedule'}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {(store.subjects ? ['math', 'english'] : [null]).map(sub => {
              const list = sub ? templates.filter(t => t.subject === sub) : templates;
              return (
                <div key={sub ?? 'all'} className="space-y-2">
                  {sub && <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{sub}</p>}
                  {list.length === 0 ? <p className="text-sm text-muted-foreground">None saved yet.</p> : (
                    <ul className="divide-y rounded-lg border">
                      {list.map(t => (
                        <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <div className="min-w-0"><p className="text-sm truncate">{t.name}</p><p className="text-xs text-muted-foreground truncate">{formatScheduleDisplay(t.schedule_data)}</p></div>
                          <Button size="icon" variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            <Button onClick={() => setCreating(true)} className="w-full"><Plus className="h-4 w-4" />New schedule</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
