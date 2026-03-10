import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format, addDays, parseISO, isBefore, isAfter, startOfDay } from 'date-fns';
import { Plus, Calendar, Users, Clock, MapPin, Trash2, Copy, Play, CheckCircle2, XCircle, AlertTriangle, Armchair } from 'lucide-react';

// ============ TEMPLATES TAB ============

function TemplatesTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', subject: 'SAT', total_seats: 20, room: '', duration_minutes: 120,
    session_times: [{ day: 'Saturday', time: '14:00' }],
  });
  const [generateRange, setGenerateRange] = useState({ templateId: '', startDate: '', endDate: '' });
  const [showGenerate, setShowGenerate] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['review-session-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('review_session_templates').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingTemplate) {
        const { error } = await supabase.from('review_session_templates').update(data).eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('review_session_templates').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-session-templates'] });
      toast.success(editingTemplate ? 'Template updated' : 'Template created');
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('review_session_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-session-templates'] });
      toast.success('Template deleted');
    },
  });

  const generateMutation = useMutation({
    mutationFn: async ({ templateId, startDate, endDate }: { templateId: string; startDate: string; endDate: string }) => {
      const template = templates?.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');
      
      const times = template.session_times as any[];
      const dayMap: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
      const sessions: any[] = [];
      let current = startOfDay(parseISO(startDate));
      const end = startOfDay(parseISO(endDate));

      const now = new Date();
      while (!isAfter(current, end)) {
        for (const st of times) {
          if (current.getDay() === dayMap[st.day]) {
            const [h, m] = st.time.split(':').map(Number);
            const sessionDate = new Date(current);
            sessionDate.setHours(h, m, 0, 0);
            // Only generate future sessions
            if (isBefore(sessionDate, now)) continue;
            const sessionEndDate = new Date(sessionDate.getTime() + template.duration_minutes * 60 * 1000);
            const bookingCloses = new Date(sessionDate.getTime() - 60 * 60 * 1000);
            sessions.push({
              template_id: templateId,
              title: `${template.name} - ${format(sessionDate, 'MMM d')}`,
              subject: template.subject,
              session_date: sessionDate.toISOString(),
              session_end_date: sessionEndDate.toISOString(),
              total_seats: template.total_seats,
              room: template.room,
              booking_closes_at: bookingCloses.toISOString(),
            });
          }
        }
        current = addDays(current, 1);
      }

      if (sessions.length === 0) throw new Error('No sessions match the selected date range');
      const { error } = await supabase.from('review_sessions').insert(sessions);
      if (error) throw error;
      return sessions.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['review-sessions'] });
      toast.success(`Generated ${count} sessions`);
      setShowGenerate(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setFormData({ name: '', subject: 'SAT', total_seats: 20, room: '', duration_minutes: 120, session_times: [{ day: 'Saturday', time: '14:00' }] });
  };

  const addTimeSlot = () => setFormData(prev => ({ ...prev, session_times: [...prev.session_times, { day: 'Saturday', time: '14:00' }] }));
  const removeTimeSlot = (i: number) => setFormData(prev => ({ ...prev, session_times: prev.session_times.filter((_, idx) => idx !== i) }));
  const updateTimeSlot = (i: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      session_times: prev.session_times.map((s, idx) => idx === i ? { ...s, [field]: value } : s),
    }));
  };

  const handleEdit = (t: any) => {
    setEditingTemplate(t);
    setFormData({ name: t.name, subject: t.subject, total_seats: t.total_seats, room: t.room || '', duration_minutes: t.duration_minutes || 120, session_times: t.session_times as any[] });
    setShowForm(true);
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Schedule Templates</h3>
          <p className="text-sm text-muted-foreground">Create reusable review session schedules</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Play className="h-4 w-4 mr-1" /> Generate Sessions</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Generate Sessions from Template</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Template</Label>
                  <Select value={generateRange.templateId} onValueChange={v => setGenerateRange(p => ({ ...p, templateId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                    <SelectContent>
                      {templates?.filter(t => t.is_active).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start Date</Label><Input type="date" value={generateRange.startDate} onChange={e => setGenerateRange(p => ({ ...p, startDate: e.target.value }))} /></div>
                  <div><Label>End Date</Label><Input type="date" value={generateRange.endDate} onChange={e => setGenerateRange(p => ({ ...p, endDate: e.target.value }))} /></div>
                </div>
                <Button className="w-full" onClick={() => generateMutation.mutate(generateRange)} disabled={!generateRange.templateId || !generateRange.startDate || !generateRange.endDate || generateMutation.isPending}>
                  {generateMutation.isPending ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" /> New Template</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Template Name</Label><Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Saturday SAT Review" /></div>
              <div><Label>Subject</Label>
                <Select value={formData.subject} onValueChange={v => setFormData(p => ({ ...p, subject: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAT">SAT</SelectItem>
                    <SelectItem value="IELTS">IELTS</SelectItem>
                    <SelectItem value="Math">Math</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Total Seats</Label><Input type="number" value={formData.total_seats} onChange={e => setFormData(p => ({ ...p, total_seats: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={formData.duration_minutes} onChange={e => setFormData(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 60 }))} placeholder="120" /></div>
              <div><Label>Room</Label><Input value={formData.room} onChange={e => setFormData(p => ({ ...p, room: e.target.value }))} placeholder="e.g. Room 201" /></div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Recurring Time Slots</Label>
                <Button variant="ghost" size="sm" onClick={addTimeSlot}><Plus className="h-3 w-3 mr-1" /> Add Slot</Button>
              </div>
              {formData.session_times.map((slot, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <Select value={slot.day} onValueChange={v => updateTimeSlot(i, 'day', v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="time" value={slot.time} onChange={e => updateTimeSlot(i, 'time', e.target.value)} className="w-32" />
                  {formData.session_times.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeTimeSlot(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => saveMutation.mutate(formData)} disabled={!formData.name || saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
              </Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {templates?.map(t => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{t.name}</h4>
                    <Badge variant="secondary">{t.subject}</Badge>
                    {!t.is_active && <Badge variant="destructive">Inactive</Badge>}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Armchair className="h-3.5 w-3.5" />{t.total_seats} seats</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{t.duration_minutes || 120}min</span>
                    {t.room && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{t.room}</span>}
                    <span className="text-xs">
                      {(t.session_times as any[]).map((s: any) => `${s.day} ${s.time}`).join(', ')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============ SESSIONS TAB ============

function SessionsTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', subject: 'SAT', session_date: '', session_time: '14:00', duration_minutes: 120, total_seats: 20, room: '' });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['review-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('review_sessions').select('*').order('session_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: bookingCounts } = useQuery({
    queryKey: ['review-session-booking-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('seat_bookings').select('review_session_id').is('cancelled_at', null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(b => { counts[b.review_session_id] = (counts[b.review_session_id] || 0) + 1; });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const sessionDate = new Date(`${data.session_date}T${data.session_time}`);
      const sessionEndDate = new Date(sessionDate.getTime() + data.duration_minutes * 60 * 1000);
      const bookingCloses = new Date(sessionDate.getTime() - 60 * 60 * 1000);
      const { error } = await supabase.from('review_sessions').insert({
        title: data.title, subject: data.subject, session_date: sessionDate.toISOString(),
        session_end_date: sessionEndDate.toISOString(),
        total_seats: data.total_seats, room: data.room || null, booking_closes_at: bookingCloses.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-sessions'] });
      toast.success('Session created');
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('review_sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-sessions'] });
      toast.success('Session deleted');
    },
  });

  const now = new Date();
  const upcoming = sessions?.filter(s => isAfter(new Date(s.session_date), now)) || [];
  const past = sessions?.filter(s => isBefore(new Date(s.session_date), now)) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sessions</h3>
          <p className="text-sm text-muted-foreground">Manage individual review sessions</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-1" /> One-Off Session</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="e.g. SAT Math Review" /></div>
              <div><Label>Subject</Label>
                <Select value={formData.subject} onValueChange={v => setFormData(p => ({ ...p, subject: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAT">SAT</SelectItem><SelectItem value="IELTS">IELTS</SelectItem>
                    <SelectItem value="Math">Math</SelectItem><SelectItem value="English">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div><Label>Date</Label><Input type="date" value={formData.session_date} onChange={e => setFormData(p => ({ ...p, session_date: e.target.value }))} /></div>
              <div><Label>Time</Label><Input type="time" value={formData.session_time} onChange={e => setFormData(p => ({ ...p, session_time: e.target.value }))} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={formData.duration_minutes} onChange={e => setFormData(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 60 }))} /></div>
              <div><Label>Seats</Label><Input type="number" value={formData.total_seats} onChange={e => setFormData(p => ({ ...p, total_seats: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            <div><Label>Room</Label><Input value={formData.room} onChange={e => setFormData(p => ({ ...p, room: e.target.value }))} placeholder="Optional" /></div>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate(formData)} disabled={!formData.title || !formData.session_date || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Session'}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {upcoming.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Upcoming</h4>
          <div className="grid gap-2">
            {upcoming.map(s => {
              const booked = bookingCounts?.[s.id] || 0;
              const isClosed = isBefore(new Date(s.booking_closes_at), now);
              return (
                <Card key={s.id}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[50px]">
                        <div className="text-lg font-bold">{format(new Date(s.session_date), 'd')}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(s.session_date), 'MMM')}</div>
                      </div>
                      <div>
                        <div className="font-medium">{s.title}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span><Clock className="h-3 w-3 inline mr-0.5" />{format(new Date(s.session_date), 'HH:mm')}{s.session_end_date ? ` – ${format(new Date(s.session_end_date), 'HH:mm')}` : ''}</span>
                          {s.room && <span><MapPin className="h-3 w-3 inline mr-0.5" />{s.room}</span>}
                          <span><Armchair className="h-3 w-3 inline mr-0.5" />{booked}/{s.total_seats}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isClosed && <Badge variant="outline" className="text-amber-600 border-amber-300">Booking Closed</Badge>}
                      <Badge variant="secondary">{s.subject}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Past Sessions</h4>
          <div className="grid gap-2">
            {past.map(s => {
              const booked = bookingCounts?.[s.id] || 0;
              return (
                <Card key={s.id} className="opacity-60">
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[50px]">
                        <div className="text-lg font-bold">{format(new Date(s.session_date), 'd')}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(s.session_date), 'MMM')}</div>
                      </div>
                      <div>
                        <div className="font-medium">{s.title}</div>
                        <div className="text-xs text-muted-foreground">{booked}/{s.total_seats} booked</div>
                      </div>
                    </div>
                    <Badge variant="outline">Completed</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ ATTENDANCE TAB ============

function AttendanceTab() {
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [attendedMap, setAttendedMap] = useState<Record<string, boolean>>({});

  const { data: pastSessions } = useQuery({
    queryKey: ['review-sessions-past'],
    queryFn: async () => {
      const { data, error } = await supabase.from('review_sessions').select('*')
        .lt('session_date', new Date().toISOString()).order('session_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ['session-bookings', selectedSession],
    enabled: !!selectedSession,
    queryFn: async () => {
      const { data, error } = await supabase.from('seat_bookings').select(`
        *, student_account:student_accounts(id, phone_number, linked_student_id)
      `).eq('review_session_id', selectedSession).is('cancelled_at', null);
      if (error) throw error;
      
      // Fetch student names
      const studentIds = data?.map(b => (b.student_account as any)?.linked_student_id).filter(Boolean);
      let studentNames: Record<string, string> = {};
      if (studentIds && studentIds.length > 0) {
        const { data: students } = await supabase.from('students').select('id, first_name, last_name').in('id', studentIds);
        students?.forEach(s => { studentNames[s.id] = `${s.first_name} ${s.last_name || ''}`; });
      }

      // Initialize attendedMap from existing data
      const map: Record<string, boolean> = {};
      data?.forEach(b => { map[b.id] = b.attended === true; });
      setAttendedMap(map);

      return data?.map(b => ({
        ...b,
        studentName: studentNames[(b.student_account as any)?.linked_student_id] || (b.student_account as any)?.phone_number || 'Unknown',
      }));
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!bookings) return;
      
      const updates = bookings.map(b => ({
        id: b.id,
        attended: attendedMap[b.id] || false,
      }));

      // Update each booking
      for (const u of updates) {
        await supabase.from('seat_bookings').update({ attended: u.attended }).eq('id', u.id);
      }

      // Create bans for no-shows
      const noShows = bookings.filter(b => !attendedMap[b.id]);
      if (noShows.length > 0) {
        const bannedUntil = new Date();
        bannedUntil.setDate(bannedUntil.getDate() + 14);
        
        const bans = noShows.map(b => ({
          student_account_id: b.student_account_id,
          banned_until: bannedUntil.toISOString(),
          reason: 'No-show for review session',
        }));
        
        await supabase.from('booking_bans').insert(bans);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-bookings'] });
      toast.success('Attendance finalized. No-shows have been banned for 2 weeks.');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const allFinalized = bookings?.every(b => b.attended !== null) || false;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Mark Attendance</h3>
        <p className="text-sm text-muted-foreground">Select a past session to mark who attended. No-shows get a 2-week booking ban.</p>
      </div>

      <Select value={selectedSession} onValueChange={setSelectedSession}>
        <SelectTrigger className="w-full max-w-md"><SelectValue placeholder="Select a past session" /></SelectTrigger>
        <SelectContent>
          {pastSessions?.map(s => (
            <SelectItem key={s.id} value={s.id}>
              {s.title} — {format(new Date(s.session_date), 'MMM d, yyyy HH:mm')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedSession && bookings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booked Students ({bookings.length})</CardTitle>
            <CardDescription>Check the students who attended. Unchecked students will be marked as no-shows.</CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No bookings for this session</p>
            ) : (
              <div className="space-y-2">
                {bookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={attendedMap[b.id] || false}
                        onCheckedChange={(checked) => setAttendedMap(prev => ({ ...prev, [b.id]: !!checked }))}
                        disabled={allFinalized}
                      />
                      <div>
                        <div className="font-medium text-sm">{b.studentName}</div>
                        <div className="text-xs text-muted-foreground">Seat #{b.seat_number}</div>
                      </div>
                    </div>
                    <div>
                      {b.attended === true && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Attended</Badge>}
                      {b.attended === false && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />No-Show</Badge>}
                    </div>
                  </div>
                ))}
                
                {!allFinalized && (
                  <div className="pt-4 flex items-center gap-3">
                    <Button onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending}>
                      {finalizeMutation.isPending ? 'Finalizing...' : 'Finalize Attendance'}
                    </Button>
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{bookings.filter(b => !attendedMap[b.id]).length} student(s) will be marked as no-show and banned</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ MAIN PAGE ============

export default function ReviewSessions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Review Sessions</h1>
        <p className="text-muted-foreground">Manage review session schedules and seat bookings</p>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="sessions"><SessionsTab /></TabsContent>
        <TabsContent value="attendance"><AttendanceTab /></TabsContent>
      </Tabs>
    </div>
  );
}
